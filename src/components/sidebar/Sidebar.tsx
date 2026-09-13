"use client";

import { useState, useEffect } from "react";
import type { Personality } from "@/types";

interface SidebarProps {
  chats: { id: string; title: string; updatedAt: string }[];
  activeChatId: string | null;
  isOpen: boolean;
  personalityId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onPersonalityChange: (id: string) => void;
  onToggle: () => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  isOpen,
  personalityId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onPersonalityChange,
  onToggle,
}: SidebarProps) {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPersonalityMenu, setShowPersonalityMenu] = useState(false);

  useEffect(() => {
    fetch("/api/personalities")
      .then((r) => r.json())
      .then(setPersonalities)
      .catch(() => {});
  }, []);

  const activePersonality = personalities.find((p) => p.id === personalityId) || personalities[0];

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2c2e] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-white font-medium text-lg mb-2">¿Eliminar chat?</h3>
            <p className="text-gray-400 text-sm mb-6">Esta acción no se puede deshacer. Se eliminarán todos los mensajes.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteChat(deleteTarget);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-[#1e1f20] flex flex-col z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        {/* Top actions */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            onClick={onToggle}
            className="md:hidden p-2 rounded-full hover:bg-white/10 text-gray-400"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-600 hover:bg-white/10 text-sm flex-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-8">
              No hay chats aún
            </p>
          )}
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm truncate ${
                chat.id === activeChatId
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <svg className="w-4 h-4 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="truncate">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(chat.id);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/10 transition-all"
              >
                <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Personality selector */}
        <div className="border-t border-gray-700/50 px-3 py-2 relative">
          <button
            onClick={() => setShowPersonalityMenu(!showPersonalityMenu)}
            className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
          >
            <span className="text-lg">{activePersonality?.emoji || "🤖"}</span>
            <span className="flex-1 text-left truncate">{activePersonality?.name || "Normal"}</span>
            <svg className={`w-4 h-4 transition-transform ${showPersonalityMenu ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showPersonalityMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-[#2b2c2e] rounded-xl border border-gray-600/50 shadow-xl overflow-hidden z-50">
              {personalities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPersonalityChange(p.id);
                    setShowPersonalityMenu(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${
                    p.id === personalityId ? "bg-white/10 text-white" : "text-gray-400"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.description}</p>
                  </div>
                  {p.id === personalityId && (
                    <svg className="w-4 h-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom - user */}
        <div className="border-t border-gray-700/50 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
              K
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Kyun</p>
              <p className="text-[11px] text-gray-500">Asistente AI</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
