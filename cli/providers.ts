import Groq from "groq-sdk";
import OpenAI from "openai";

// ─── Tipos ───────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ProviderName = "groq" | "openrouter";

export interface ProviderStatus {
  available: boolean;
  cooldownUntil: number;
  failCount: number;
}

export interface CompletionResult {
  text: string;
  provider: ProviderName;
  tokensUsed?: { prompt: number; completion: number };
}

// ─── Config ──────────────────────────────────────────────────────────
const COOLDOWN_MS = 60_000; // 60 segundos de cooldown tras fallo
const MAX_FAILS_BEFORE_COOLDOWN = 2;

// Groq: Production models (Sept 2026)
const GROQ_MODEL = "openai/gpt-oss-120b";

// OpenRouter: Free models with fallback chain
const OR_MODELS = [
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

// ─── Provider Manager ────────────────────────────────────────────────
export class ProviderManager {
  private groq: Groq | null;
  private openrouter: OpenAI | null;
  private status: Record<ProviderName, ProviderStatus>;

  constructor() {
    const groqKey = process.env.GROQ_API_KEY;
    const orKey = process.env.OPENROUTER_API_KEY;

    // Inicializar Groq con manejo de errores
    try {
      this.groq = groqKey ? new Groq({ apiKey: groqKey }) : null;
    } catch {
      this.groq = null;
    }

    // Inicializar OpenRouter con manejo de errores
    try {
      this.openrouter = orKey
        ? new OpenAI({ apiKey: orKey, baseURL: "https://openrouter.ai/api/v1" })
        : null;
    } catch {
      this.openrouter = null;
    }

    this.status = {
      groq: { available: !!this.groq, cooldownUntil: 0, failCount: 0 },
      openrouter: { available: !!this.openrouter, cooldownUntil: 0, failCount: 0 },
    };
  }

  // Verificar si un provider está en cooldown
  private isInCooldown(name: ProviderName): boolean {
    const s = this.status[name];
    if (Date.now() < s.cooldownUntil) return true;
    // Cooldown expirado, resetear
    if (s.cooldownUntil > 0) {
      s.cooldownUntil = 0;
      s.failCount = 0;
      s.available = true;
    }
    return false;
  }

  // Registrar fallo y activar cooldown si es necesario
  private recordFailure(name: ProviderName): void {
    const s = this.status[name];
    s.failCount++;
    if (s.failCount >= MAX_FAILS_BEFORE_COOLDOWN) {
      s.cooldownUntil = Date.now() + COOLDOWN_MS;
      s.available = false;
    }
  }

  // Registrar éxito
  private recordSuccess(name: ProviderName): void {
    this.status[name].failCount = 0;
    this.status[name].cooldownUntil = 0;
    this.status[name].available = true;
  }

  // Intentar con Groq
  private async tryGroq(messages: ChatMessage[]): Promise<CompletionResult | null> {
    if (!this.groq || this.isInCooldown("groq")) return null;

    try {
      const response = await this.groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("Respuesta vacía");

      this.recordSuccess("groq");

      const usage = response.usage;
      return {
        text: content.trim(),
        provider: "groq",
        tokensUsed: usage
          ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens }
          : undefined,
      };
    } catch (err: any) {
      this.recordFailure("groq");
      return null;
    }
  }

  // Intentar con OpenRouter (con fallback de modelos nativo)
  private async tryOpenRouter(messages: ChatMessage[]): Promise<CompletionResult | null> {
    if (!this.openrouter || this.isInCooldown("openrouter")) return null;

    // OpenRouter maneja fallback de modelos internamente
    const models = OR_MODELS;

    try {
      // OpenRouter fallback: pass models array via extra_body (bypasses TS types)
      const response = await this.openrouter.chat.completions.create({
        model: models[0],
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      } as any);

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("Respuesta vacía");

      this.recordSuccess("openrouter");

      const usage = response.usage;
      return {
        text: content.trim(),
        provider: "openrouter",
        tokensUsed: usage
          ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens }
          : undefined,
      };
    } catch (err: any) {
      this.recordFailure("openrouter");
      return null;
    }
  }

  // Llamada con fallback encadenado
  async complete(messages: ChatMessage[]): Promise<CompletionResult> {
    // 1. Intentar Groq primero
    const groqResult = await this.tryGroq(messages);
    if (groqResult) return groqResult;

    // 2. Fallback a OpenRouter
    const orResult = await this.tryOpenRouter(messages);
    if (orResult) return orResult;

    // 3. Ambos fallaron
    throw new Error("Todos los providers están indisponibles. Reintenta en unos segundos.");
  }

  // Streaming con fallback
  async *stream(
    messages: ChatMessage[]
  ): AsyncGenerator<{ chunk: string; provider: ProviderName }> {
    // Intentar Groq con streaming
    if (this.groq && !this.isInCooldown("groq")) {
      try {
        const stream = await this.groq.chat.completions.create({
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        });

        this.recordSuccess("groq");
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield { chunk: content, provider: "groq" };
        }
        return;
      } catch {
        this.recordFailure("groq");
      }
    }

    // Fallback a OpenRouter con streaming
    if (this.openrouter && !this.isInCooldown("openrouter")) {
      try {
        const response = await this.openrouter.chat.completions.create({
          model: OR_MODELS[0],
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        } as any);

        this.recordSuccess("openrouter");
        const stream = response as unknown as AsyncIterable<any>;
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield { chunk: content, provider: "openrouter" };
        }
        return;
      } catch {
        this.recordFailure("openrouter");
      }
    }

    throw new Error("Todos los providers están indisponibles.");
  }

  // Estado de los providers
  getStatus(): Record<ProviderName, { enabled: boolean; inCooldown: boolean }> {
    return {
      groq: {
        enabled: !!this.groq,
        inCooldown: this.isInCooldown("groq"),
      },
      openrouter: {
        enabled: !!this.openrouter,
        inCooldown: this.isInCooldown("openrouter"),
      },
    };
  }
}
