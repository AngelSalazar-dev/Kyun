export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
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

export interface Personality {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  provider?: "groq" | "openrouter";
  modelId?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  personalityId: string;
  isLoading: boolean;
  streamingText: string;
  activeProvider: ProviderName | null;
}
