"use client";

import { useState, useEffect, useCallback } from "react";
import ChatView from "@/components/chat/ChatView";
import Sidebar from "@/components/sidebar/Sidebar";
import type { ChatMessage } from "@/types";
import type { EmotionState } from "@/lib/emotions";

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

export default function Home() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmotion, setUserEmotion] = useState<EmotionState | null>(null);
  const [kyunMood, setKyunMood] = useState<{ current: string; energy: number } | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setChats(
        data.map((s: any) => ({
          id: s.id,
          title: s.last_message?.slice(0, 50) || "Nuevo chat",
          updatedAt: s.updated_at,
        }))
      );
    } catch {}
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/history?sessionId=${sessionId}`);
      const data = await res.json();
      setMessages(data);
      setActiveChatId(sessionId);
      setSidebarOpen(false);
      setUserEmotion(null);
      setKyunMood(null);
    } catch {}
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setSidebarOpen(false);
    setUserEmotion(null);
    setKyunMood(null);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMsg: ChatMessage = { role: "user", content };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingText("");

      const sid = activeChatId || crypto.randomUUID();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            personalityId: "default",
            sessionId: sid,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No hay stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // Handle emotion data
                if (data.emotion) {
                  setUserEmotion(data.emotion);
                }
                if (data.kyunMood) {
                  setKyunMood(data.kyunMood);
                }

                if (data.error) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `Error: ${data.error}` },
                  ]);
                  break;
                }

                if (data.done) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: accumulated },
                  ]);
                  if (!activeChatId) {
                    setActiveChatId(sid);
                  }
                  loadChats();
                  break;
                }

                if (data.chunk) {
                  accumulated += data.chunk;
                  setStreamingText(accumulated);
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
      } finally {
        setIsLoading(false);
        setStreamingText("");
      }
    },
    [isLoading, activeChatId, loadChats]
  );

  const handleDeleteChat = useCallback(
    async (id: string) => {
      await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (activeChatId === id) {
        setActiveChatId(null);
        setMessages([]);
      }
      loadChats();
    },
    [activeChatId, loadChats]
  );

  return (
    <div className="flex h-screen bg-[#1e1f20]">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        isOpen={sidebarOpen}
        onNewChat={handleNewChat}
        onSelectChat={loadMessages}
        onDeleteChat={handleDeleteChat}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 min-w-0">
        <ChatView
          messages={messages}
          isLoading={isLoading}
          streamingText={streamingText}
          userEmotion={userEmotion}
          kyunMood={kyunMood}
          onSend={handleSend}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
      </main>
    </div>
  );
}
