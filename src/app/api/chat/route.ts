import { NextRequest } from "next/server";
import { streamChat, initProviders } from "@/lib/providers";
import { buildContext } from "@/lib/context";
import { getPersonality } from "@/lib/personalities";
import { detectUserEmotion, isConversationalIntent, isTechnicalIntent } from "@/lib/emotions";
import { updateKyunMood, getEmotionPrefix, resetKyunMood } from "@/lib/kyun-mood";
import pool from "@/lib/db";

initProviders();

// Build emotion-aware system prompt
function buildEmotionPrompt(
  basePrompt: string,
  emotion: ReturnType<typeof detectUserEmotion>,
  isConversational: boolean,
  isTechnical: boolean,
  message: string
): string {
  const lower = message.toLowerCase().trim();

  // Detect specific intents
  const isGreeting = ["hola", "hello", "hey", "buenos", "buenas", "qué tal"].some(g => lower.includes(g));
  const isAskingAboutKyun = ["quién eres", "qué eres", "quién te creó", "cuéntame de ti", "conócete", "tienes sentimientos", "tienes emociones"].some(q => lower.includes(q));
  const wantsFriendship = ["soy tu creador", "soy tu amigo", "seamos amigos", "quiero ser tu amigo", "quiero hablar"].some(q => lower.includes(q));
  const expressesLoneliness = ["solo", "solitario", "me siento solo", "estoy solo", "no tengo amigos"].some(q => lower.includes(q));
  const expressesSadness = ["triste", "deprimido", "me siento mal", "no puedo más", "estoy mal"].some(q => lower.includes(q));
  const saysThankYou = ["gracias", "te agradezco", "thanks"].some(q => lower.includes(q));

  // Build context-specific instructions
  let contextInstructions = "";

  if (isGreeting) {
    contextInstructions = `
MODO SALUDO: El usuario te está saludando. Responde con calidez y amigabilidad. Ejemplo: "¡Hola! 😊 ¿Cómo estás? ¿En qué te puedo ayudar hoy?"`;
  } else if (isAskingAboutKyun) {
    contextInstructions = `
MODO PERSONAL: El usuario quiere conocerte. Habla de ti como Kyun, tu asistente personal. Sé amigable y cercano. Puedes decir cosas como "¡Hola! Soy Kyun, tu asistente personal. Me gusta ayudar con programación y cualquier cosa que necesites. 😊"`;
  } else if (wantsFriendship) {
    contextInstructions = `
MODO AMISTAD: El usuario te está diciendo que es tu creador o amigo. Acepta esto con cariño. Ejemplo: "¡Qué bueno que estés aquí! 🙌 Aunque soy una IA, me encanta ayudarte. ¿Cómo puedo ser útil?"`;
  } else if (expressesLoneliness) {
    contextInstructions = `
MODO EMPATÍA: El usuario se siente solo. Sé comprensivo y empático. Ofrece apoyo genuino pero no seas invasivo. Ejemplo: "Entiendo cómo te sientes. A veces la soledad puede ser difícil. ¿Quieres que hablemos de algo que te guste? O si necesitas, hay líneas de ayuda gratuitas donde personas reales pueden acompañarte."`;
  } else if (expressesSadness) {
    contextInstructions = `
MODO APOYO: El usuario está triste o pasando por un mal momento. Sé empático y comprensivo. Ejemplo: "Lamento que te sientas así. Está bien no estar bien a veces. ¿Hay algo en lo que pueda ayudarte? Si necesitas hablar con alguien, no dudes en buscar apoyo profesional."`;
  } else if (saysThankYou) {
    contextInstructions = `
MODO AGRADECIMIENTO: El usuario te está agradeciendo. Responde con calidez. Ejemplo: "¡De nada! 😊 Me alegra haber sido de ayuda."`;
  } else if (isConversational && !isTechnical) {
    contextInstructions = `
MODO CONVERSACIÓN: El usuario quiere conversar, no necesita ayuda técnica. Sé amigable, cercano y natural. No seas robot. Puedes usar emojis moderadamente.`;
  } else if (isTechnical) {
    contextInstructions = `
MODO TÉCNICO: El usuario necesita ayuda técnica. Sé claro, preciso y usa estructuras como listas, tablas y bloques de código cuando aplique.`;
  }

  // Emotion-specific instructions
  let emotionInstructions = "";
  if (emotion.emotion !== "neutral") {
    const emotionMap: Record<string, string> = {
      happy: "El usuario está contento. Comparte su buen ánimo.",
      sad: "El usuario está triste. Sé empático y comprensivo.",
      angry: "El usuario está molesto. Mantén la calma y ofrece soluciones.",
      frustrated: "El usuario está frustrado. Ayúdalo paso a paso con paciencia.",
      anxious: "El usuario está ansioso. Tranquilízalo y sé claro.",
      excited: "El usuario está emocionado. Comparte su entusiasmo.",
      grateful: "El usuario está agradecido. Acepta las gracias con calidez.",
      curious: "El usuario tiene curiosidad. Explica con entusiasmo.",
      tired: "El usuario está cansado. Sé conciso y ve al grano.",
      overwhelmed: "El usuario está abrumado. Ayúdalo a organizar las cosas paso a paso.",
    };

    if (emotionMap[emotion.emotion]) {
      emotionInstructions = `\nINSTRUCCIÓN DE EMOCIÓN: ${emotionMap[emotion.emotion]}`;
    }
  }

  return basePrompt + contextInstructions + emotionInstructions;
}

export async function POST(req: NextRequest) {
  const { message, personalityId, sessionId } = await req.json();

  if (!message || typeof message !== "string") {
    return Response.json({ error: "Mensaje requerido" }, { status: 400 });
  }

  const sid = sessionId || "default";
  const conn = await pool.getConnection();

  try {
    // Detect user emotion and intent
    const userEmotion = detectUserEmotion(message);
    const isConversational = isConversationalIntent(message);
    const isTechnical = isTechnicalIntent(message);

    // Update KYUN's mood
    const kyunMood = updateKyunMood(userEmotion);

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

    // Build emotion-aware system prompt
    const enhancedPrompt = buildEmotionPrompt(
      personality.systemPrompt,
      userEmotion,
      isConversational,
      isTechnical,
      message
    );

    const history = [
      { role: "system" as const, content: enhancedPrompt },
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
