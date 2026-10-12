"use client";

import React from "react";
import { Home, Search, Library, Heart, Sparkles } from "lucide-react";

interface MobileNavProps {
  activeTab: "home" | "library" | "search" | "liked";
  setActiveTab: (tab: "home" | "library" | "search" | "liked") => void;
  onOpenConnectModal: () => void;
}

export function MobileNav({ activeTab, setActiveTab, onOpenConnectModal }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around text-xs">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
          activeTab === "home" ? "text-emerald-400 font-bold" : "text-zinc-400"
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px]">Início</span>
      </button>

      <button
        onClick={() => setActiveTab("search")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
          activeTab === "search" ? "text-emerald-400 font-bold" : "text-zinc-400"
        }`}
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px]">Buscar</span>
      </button>

      <button
        onClick={() => setActiveTab("library")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
          activeTab === "library" ? "text-emerald-400 font-bold" : "text-zinc-400"
        }`}
      >
        <Library className="w-4 h-4" />
        <span className="text-[10px]">Biblioteca</span>
      </button>

      <button
        onClick={() => setActiveTab("liked")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
          activeTab === "liked" ? "text-rose-500 font-bold" : "text-zinc-400"
        }`}
      >
        <Heart className={`w-4 h-4 ${activeTab === "liked" ? "fill-rose-500" : ""}`} />
        <span className="text-[10px]">Curtidas</span>
      </button>

      <button
        onClick={onOpenConnectModal}
        className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-[10px]">Contas</span>
      </button>
    </div>
  );
}
