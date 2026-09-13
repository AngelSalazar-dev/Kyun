"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "@/types";
import type { EmotionState } from "@/lib/emotions";

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingText: string;
  userEmotion: EmotionState | null;
  kyunMood: { current: string; energy: number } | null;
  personalityId: string;
  onSend: (message: string) => void;
  onStop?: () => void;
  onRegenerate?: () => void;
  onToggleSidebar: () => void;
  onPersonalityChange?: (id: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md transition-colors ${copied ? "text-green-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/10"}`}
      title="Copiar"
    >
      {copied ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <button
        onClick={handleCopy}
        className={`copy-btn ${copied ? "copied" : ""}`}
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
      <pre>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  code: CodeBlock,
};

export default function ChatView({
  messages,
  isLoading,
  streamingText,
  userEmotion,
  kyunMood,
  personalityId,
  onSend,
  onStop,
  onRegenerate,
  onToggleSidebar,
  onPersonalityChange,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Buenos días");
    else if (h < 19) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const isEmpty = messages.length === 0;

  const moodEmojis: Record<string, string> = {
    neutral: "😐",
    happy: "😊",
    empathetic: "💙",
    calm: "😌",
    helpful: "🤝",
    excited: "🔥",
    curious: "🤔",
    confident: "💪",
  };

  const emotionLabels: Record<string, string> = {
    happy: "contento",
    sad: "triste",
    angry: "molesto",
    frustrated: "frustrado",
    anxious: "ansioso",
    excited: "emocionado",
    grateful: "agradecido",
    curious: "con curiosidad",
    tired: "cansado",
    overwhelmed: "abrumado",
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1f20]">
      {/* Top bar - mobile */}
      <header className="md:hidden flex items-center px-3 py-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </header>

      {/* Messages or Welcome */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
              {greeting}
            </h1>
            <p className="text-gray-500 mb-8">¿En qué puedo ayudarte hoy?</p>

            {/* Input box - centered */}
            <form onSubmit={handleSubmit} className="w-full max-w-[640px]">
              <div className="flex items-end bg-[#2b2c2e] rounded-3xl px-4 py-3 border border-gray-600/50 focus-within:border-gray-500 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregúntale a Kyun"
                  rows={1}
                  className="flex-1 bg-transparent text-white text-base resize-none focus:outline-none placeholder:text-gray-500 max-h-[200px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-[768px] mx-auto px-4 py-6 space-y-6">
            {/* KYUN mood indicator */}
            {kyunMood && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-xs text-gray-500">
                  <span>{moodEmojis[kyunMood.current] || "😐"}</span>
                  <span>Kyun está {kyunMood.current}</span>
                  <span>·</span>
                  <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${kyunMood.energy * 100}%`,
                        backgroundColor: kyunMood.energy > 0.6 ? "#34d399" : kyunMood.energy > 0.3 ? "#fbbf24" : "#f87171",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* User emotion indicator */}
            {userEmotion && userEmotion.emotion !== "neutral" && (
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-xs text-gray-500">
                  <span>{userEmotion.emoji}</span>
                  <span>Parece que estás {emotionLabels[userEmotion.emotion] || userEmotion.emotion}</span>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-in group">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="flex items-end gap-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <CopyButton text={msg.content} />
                      </div>
                      <div className="bg-[#2b2c2e] text-white rounded-3xl rounded-br-lg px-5 py-3 max-w-[80%]">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[10px] text-gray-600 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                      K
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#2b2c2e] text-white rounded-3xl rounded-bl-lg px-5 py-3">
                        <div className="text-sm markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">{formatTime(msg.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={msg.content} />
                        {onRegenerate && (
                          <button
                            onClick={onRegenerate}
                            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
                            title="Regenerar"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 4v6h6M23 20v-6h-6" />
                              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming */}
            {streamingText && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                  K
                </div>
                <div className="bg-[#2b2c2e] text-white rounded-3xl rounded-bl-lg px-5 py-3 max-w-[85%]">
                  <div className="text-sm markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={markdownComponents}
                    >
                      {streamingText}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Loading dots */}
            {isLoading && !streamingText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  K
                </div>
                <div className="bg-[#2b2c2e] rounded-3xl rounded-bl-lg px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-500 rounded-full thinking-dot" />
                    <span className="w-2 h-2 bg-gray-500 rounded-full thinking-dot" />
                    <span className="w-2 h-2 bg-gray-500 rounded-full thinking-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input - when chatting */}
      {!isEmpty && (
        <div className="border-t border-gray-700/50 bg-[#1e1f20] px-4 py-3">
          <form onSubmit={handleSubmit} className="max-w-[768px] mx-auto">
            <div className="flex items-end bg-[#2b2c2e] rounded-3xl px-4 py-3 border border-gray-600/50 focus-within:border-gray-500 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntale a Kyun"
                rows={1}
                className="flex-1 bg-transparent text-white text-base resize-none focus:outline-none placeholder:text-gray-500 max-h-[200px]"
              />
              {isLoading && onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="ml-2 p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors shrink-0"
                  title="Detener generación"
                >
                  <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
