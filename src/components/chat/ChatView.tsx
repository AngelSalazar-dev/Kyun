"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";
import type { EmotionState } from "@/lib/emotions";

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingText: string;
  userEmotion: EmotionState | null;
  kyunMood: { current: string; energy: number } | null;
  onSend: (message: string) => void;
  onToggleSidebar: () => void;
}

export default function ChatView({
  messages,
  isLoading,
  streamingText,
  userEmotion,
  kyunMood,
  onSend,
  onToggleSidebar,
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
              {greeting}, Ángel
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
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${kyunMood.energy * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="animate-fade-in">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-[#2b2c2e] text-white rounded-3xl rounded-br-lg px-5 py-3 max-w-[80%]">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                      K
                    </div>
                    <div className="bg-[#2b2c2e] text-white rounded-3xl rounded-bl-lg px-5 py-3 max-w-[85%]">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingText}</p>
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
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
