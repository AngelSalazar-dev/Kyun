import { NextRequest } from "next/server";
import { streamChat, initProviders } from "@/lib/providers";
import { buildContext } from "@/lib/context";
import { getPersonality } from "@/lib/personalities";
import { detectUserEmotion } from "@/lib/emotions";
import { updateKyunMood, getEmotionPrefix, resetKyunMood } from "@/lib/kyun-mood";
import pool from "@/lib/db";

initProviders();

export async function POST(req: NextRequest) {
  const { message, personalityId, sessionId } = await req.json();

  if (!message || typeof message !== "string") {
    return Response.json({ error: "Mensaje requerido" }, { status: 400 });
  }

  const sid = sessionId || "default";
  const conn = await pool.getConnection();

  try {
    // Detect user emotion
    const userEmotion = detectUserEmotion(message);

    // Update KYUN's mood
    const kyunMood = updateKyunMood(userEmotion);

    // Get emotion prefix
    const emotionPrefix = getEmotionPrefix(userEmotion);

    // Buscar o crear sesión
    const [existing] = await conn.query("SELECT id FROM sessions WHERE id = ?", [sid]);
    if ((existing as any[]).length === 0) {
      await conn.query("INSERT INTO sessions (id, personality) VALUES (?, ?)", [
        sid,
        personalityId || "default",
      ]);
    } else if (personalityId) {
      await conn.query("UPDATE sessions SET personality = ? WHERE id = ?", [personalityId, sid]);
    }

    // Obtener historial
    const [rows] = await conn.query(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC",
      [sid]
    );
    const dbMessages = rows as { role: string; content: string }[];

    const personality = getPersonality(personalityId || "default");

    // Build context with emotion awareness
    const emotionContext = userEmotion.emotion !== "neutral"
      ? `[El usuario parece ${userEmotion.emotion} ${userEmotion.emoji}. ${emotionPrefix}]`
      : "";

    const history = [
      { role: "system" as const, content: personality.systemPrompt + (emotionContext ? `\n${emotionContext}` : "") },
      ...dbMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Guardar mensaje del usuario
    await conn.query("INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)", [
      sid,
      message,
    ]);

    const context = buildContext(history);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          // Send emotion data first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                emotion: userEmotion,
                kyunMood: { current: kyunMood.current, energy: kyunMood.energy },
              })}\n\n`
            )
          );

          for await (const { chunk, provider } of streamChat(context)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk, provider })}\n\n`)
            );
          }

          // Guardar respuesta
          await pool.query(
            "INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)",
            [sid, fullResponse]
          );

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
        } catch (error: any) {
          await pool.query(
            "DELETE FROM messages WHERE session_id = ? AND role = 'user' AND content = ?",
            [sid, message]
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message || "Error del servidor" })}\n\n`
            )
          );
        } finally {
          conn.release();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    conn.release();
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const { sessionId } = await req.json();
  if (sessionId) {
    await pool.query("DELETE FROM messages WHERE session_id = ?", [sessionId]);
    await pool.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
    resetKyunMood();
  }
  return Response.json({ ok: true });
}
