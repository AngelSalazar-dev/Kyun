"use client";

import type { ChatMessage } from "@/types";

interface SidebarProps {
  chats: { id: string; title: string; updatedAt: string }[];
  activeChatId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onToggle: () => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  isOpen,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onToggle,
}: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onToggle}
        />
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
                  onDeleteChat(chat.id);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Bottom - user */}
        <div className="border-t border-gray-700/50 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Ángel</p>
              <p className="text-[11px] text-gray-500">Kyun AI</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
