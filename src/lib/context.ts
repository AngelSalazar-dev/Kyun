const TOKENS_PER_CHAR = 0.25;
const RESERVE_TOKENS = 2_000;
const DEFAULT_LIMIT = 32_000;
const CONTEXT_WINDOW = DEFAULT_LIMIT - RESERVE_TOKENS;

interface SimpleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function messageTokens(msg: SimpleMessage): number {
  return estimateTokens(msg.content) + 4;
}

export function buildContext(history: SimpleMessage[]): SimpleMessage[] {
  const systemMsg = history.find((m) => m.role === "system");
  const nonSystem = history.filter((m) => m.role !== "system");

  if (nonSystem.length === 0) {
    return systemMsg ? [systemMsg] : [];
  }

  const totalTokens = nonSystem.reduce((sum, m) => sum + messageTokens(m), 0);
  const systemTokens = systemMsg ? messageTokens(systemMsg) : 0;

  if (totalTokens + systemTokens <= CONTEXT_WINDOW) {
    return systemMsg ? [systemMsg, ...nonSystem] : nonSystem;
  }

  const context: SimpleMessage[] = [];
  let usedTokens = systemTokens;
  const recentMessages: SimpleMessage[] = [];

  for (let i = nonSystem.length - 1; i >= 0; i--) {
    const msgTokens = messageTokens(nonSystem[i]);
    if (usedTokens + msgTokens > CONTEXT_WINDOW) break;
    usedTokens += msgTokens;
    recentMessages.unshift(nonSystem[i]);
  }

  const olderMessages = nonSystem.slice(0, nonSystem.length - recentMessages.length);
  if (olderMessages.length > 0) {
    const summary = summarizeMessages(olderMessages);
    if (summary) {
      context.push({
        role: "system",
        content: `[Historial previo resumido]: ${summary}`,
      });
    }
  }

  context.push(...recentMessages);

  if (systemMsg) {
    context.unshift(systemMsg);
  }

  return context;
}

function summarizeMessages(messages: SimpleMessage[]): string {
  const topics: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      topics.push(msg.content.slice(0, 80));
    }
  }
  if (topics.length === 0) return "";
  return `El usuario preguntó sobre: ${topics.join("; ")}`;
}

export function getContextStats(history: SimpleMessage[]) {
  const nonSystem = history.filter((m) => m.role !== "system");
  const totalTokens = nonSystem.reduce((sum, m) => sum + messageTokens(m), 0);
  const context = buildContext(history);
  const contextTokens = context.reduce((sum, m) => sum + messageTokens(m), 0);

  return {
    totalMessages: nonSystem.length,
    estimatedTokens: totalTokens,
    contextTokens,
    contextLimit: CONTEXT_WINDOW,
  };
}
