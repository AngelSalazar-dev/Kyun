import { NextRequest } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    const [rows] = await pool.query(
      `SELECT s.id, s.personality, s.updated_at,
        (SELECT content FROM messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM sessions s ORDER BY s.updated_at DESC LIMIT 20`
    );
    return Response.json(rows);
  }

  const [messages] = await pool.query(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC",
    [sessionId]
  );
  return Response.json(messages);
}
