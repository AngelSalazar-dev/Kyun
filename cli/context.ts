import type { ChatMessage } from "./providers.js";

// ─── Config ──────────────────────────────────────────────────────────
// Límites por modelo (Sept 2026)
const MODEL_LIMITS: Record<string, number> = {
  "openai/gpt-oss-120b": 131_072,
  "openai/gpt-oss-20b": 131_072,
  "groq/compound": 131_072,
  "groq/compound-mini": 131_072,
  "openrouter/free": 131_072,
  "meta-llama/llama-3.3-70b-instruct:free": 131_072,
  "qwen/qwen3-coder:free": 131_072,
};

const DEFAULT_LIMIT = 32_000;     // Fallback conservador
const RESERVE_TOKENS = 2_000;     // Reservar para respuesta
const MAX_RECENT_MESSAGES = 8;    // Mantener últimos 8 mensajes en contexto activo

// Context window efectivo (dejar 30% libre para respuesta)
const CONTEXT_WINDOW = DEFAULT_LIMIT - RESERVE_TOKENS;

// ─── Estimación de tokens ────────────────────────────────────────────
const TOKENS_PER_CHAR = 0.25; // ~4 chars por token (inglés/español mix)

function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function messageTokens(msg: ChatMessage): number {
  return estimateTokens(msg.content) + 4; // +4 overhead por role/formato
}

// ─── Context Manager ─────────────────────────────────────────────────
export class ContextManager {
  private fullHistory: ChatMessage[] = [];

  // Establecer historial completo (desde memoria)
  setHistory(messages: ChatMessage[]): void {
    this.fullHistory = [...messages];
  }

  // Obtener historial completo (para guardar en memoria)
  getFullHistory(): ChatMessage[] {
    return [...this.fullHistory];
  }

  // Agregar mensaje del usuario
  addUser(content: string): void {
    this.fullHistory.push({ role: "user", content });
  }

  // Agregar respuesta del asistente
  addAssistant(content: string): void {
    this.fullHistory.push({ role: "assistant", content });
  }

  // Remover último usuario (si falla la llamada)
  popLastUser(): void {
    for (let i = this.fullHistory.length - 1; i >= 0; i--) {
      if (this.fullHistory[i].role === "user") {
        this.fullHistory.splice(i, 1);
        break;
      }
    }
  }

  // Limpiar todo
  clear(): void {
    this.fullHistory = [];
  }

  // ─── Construir contexto óptimo para la llamada ─────────────────────
  buildContext(): ChatMessage[] {
    const systemMsg = this.fullHistory.find((m) => m.role === "system");
    const nonSystem = this.fullHistory.filter((m) => m.role !== "system");

    if (nonSystem.length === 0) {
      return systemMsg ? [systemMsg] : [];
    }

    // 1. Si todo cabe en el límite, enviar todo
    const totalTokens = nonSystem.reduce((sum, m) => sum + messageTokens(m), 0);
    const systemTokens = systemMsg ? messageTokens(systemMsg) : 0;

    if (totalTokens + systemTokens <= CONTEXT_WINDOW) {
      return systemMsg ? [systemMsg, ...nonSystem] : nonSystem;
    }

    // 2. Sliding window: últimos mensajes que quepan
    const context: ChatMessage[] = [];
    let usedTokens = systemTokens;

    // Empezar desde el final y ir hacia atrás
    const recentMessages: ChatMessage[] = [];
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msgTokens = messageTokens(nonSystem[i]);
      if (usedTokens + msgTokens > CONTEXT_WINDOW) break;
      usedTokens += msgTokens;
      recentMessages.unshift(nonSystem[i]);
    }

    // 3. Crear resumen de mensajes anteriores si existen
    const olderMessages = nonSystem.slice(0, nonSystem.length - recentMessages.length);
    if (olderMessages.length > 0) {
      const summary = this.summarizeMessages(olderMessages);
      if (summary) {
        context.push({
          role: "system",
          content: `[Historial previo resumido]: ${summary}`,
        });
        usedTokens += estimateTokens(summary) + 4;
      }
    }

    // 4. Agregar mensajes recientes
    context.push(...recentMessages);

    // Siempre incluir system prompt al inicio
    if (systemMsg) {
      context.unshift(systemMsg);
    }

    return context;
  }

  // ─── Resumir mensajes anteriores ───────────────────────────────────
  private summarizeMessages(messages: ChatMessage[]): string {
    if (messages.length === 0) return "";

    const topics: string[] = [];
    const exchanges: string[] = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        // Extraer tema del usuario
        const preview = msg.content.slice(0, 80);
        topics.push(preview);
      } else if (msg.role === "assistant") {
        // Contar tokens de respuesta
        const tokenCount = estimateTokens(msg.content);
        exchanges.push(`respuesta de ${tokenCount} tokens`);
      }
    }

    if (topics.length === 0) return "";

    const summary = [
      `El usuario preguntó sobre: ${topics.join("; ")}`,
      `${exchanges.length} intercambios previos`,
    ].join(". ");

    return summary;
  }

  // ─── Estadísticas ──────────────────────────────────────────────────
  getStats(): {
    totalMessages: number;
    estimatedTokens: number;
    contextTokens: number;
    contextLimit: number;
  } {
    const nonSystem = this.fullHistory.filter((m) => m.role !== "system");
    const totalTokens = nonSystem.reduce((sum, m) => sum + messageTokens(m), 0);
    const context = this.buildContext();
    const contextTokens = context.reduce((sum, m) => sum + messageTokens(m), 0);

    return {
      totalMessages: nonSystem.length,
      estimatedTokens: totalTokens,
      contextTokens,
      contextLimit: CONTEXT_WINDOW,
    };
  }
}
