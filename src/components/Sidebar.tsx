"use client";

import React from "react";
import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Radio,
  Sparkles,
  Music2,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  activeTab: "home" | "library" | "search" | "liked";
  setActiveTab: (tab: "home" | "library" | "search" | "liked") => void;
  accounts: any;
  onOpenConnectModal: () => void;
  onOpenHybridModal: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  accounts,
  onOpenConnectModal,
  onOpenHybridModal,
}: SidebarProps) {
  const isSpotify = Boolean(accounts?.spotify?.isConnected);
  const isYoutube = Boolean(accounts?.youtube?.isConnected);

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col gap-4 p-4 h-[calc(100vh-64px)] sticky top-16 bg-zinc-950 border-r border-zinc-800/80">
      {/* Primary Navigation Links */}
      <div className="bg-zinc-900/60 rounded-2xl p-2.5 border border-zinc-800/60 space-y-1">
        <button
          onClick={() => setActiveTab("home")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "home"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <Home className={`w-4 h-4 ${activeTab === "home" ? "text-emerald-400" : ""}`} />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "search"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <Search className={`w-4 h-4 ${activeTab === "search" ? "text-emerald-400" : ""}`} />
          <span>Buscar & Filtros</span>
        </button>

        <button
          onClick={() => setActiveTab("library")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "library"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <Library className={`w-4 h-4 ${activeTab === "library" ? "text-emerald-400" : ""}`} />
          <span>Sua Biblioteca</span>
        </button>

        <button
          onClick={() => setActiveTab("liked")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "liked"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <Heart className={`w-4 h-4 ${activeTab === "liked" ? "text-rose-500 fill-rose-500" : ""}`} />
          <span>Músicas Curtidas</span>
        </button>
      </div>

      {/* Hybrid Playlist Quick Action */}
      <div className="bg-gradient-to-br from-emerald-950/40 to-rose-950/40 rounded-2xl p-3.5 border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-white">Playlists Híbridas</h4>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Crie playlists combinando músicas do Spotify e vídeos do YouTube.
        </p>
        <button
          onClick={onOpenHybridModal}
          className="w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Playlist</span>
        </button>
      </div>

      {/* Connected Accounts Status Card */}
      <div className="mt-auto bg-zinc-900/60 rounded-2xl p-3.5 border border-zinc-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Contas Vinculadas
          </span>
          <button
            onClick={onOpenConnectModal}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            Gerenciar
          </button>
        </div>

        <div className="space-y-2">
          {/* Spotify status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpotify ? "bg-[#1DB954]" : "bg-zinc-600"}`} />
              <span className={isSpotify ? "text-white font-medium" : "text-zinc-500"}>Spotify</span>
            </div>
            <span className={`text-[10px] ${isSpotify ? "text-emerald-400" : "text-zinc-600"}`}>
              {isSpotify ? "Ativo" : "Off"}
            </span>
          </div>

          {/* YouTube status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isYoutube ? "bg-[#FF0000]" : "bg-zinc-600"}`} />
              <span className={isYoutube ? "text-white font-medium" : "text-zinc-500"}>YouTube Music</span>
            </div>
            <span className={`text-[10px] ${isYoutube ? "text-rose-400" : "text-zinc-600"}`}>
              {isYoutube ? "Ativo" : "Off"}
            </span>
          </div>
        </div>

        {(!isSpotify || !isYoutube) && (
          <button
            onClick={onOpenConnectModal}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Conectar Ambos
          </button>
        )}
      </div>
    </aside>
  );
}
