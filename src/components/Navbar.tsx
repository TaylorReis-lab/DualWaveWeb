"use client";

import React from "react";
import { Search, Music, Radio, Disc3, Plus, Settings, CheckCircle2, AlertCircle, LogOut, Terminal } from "lucide-react";

interface NavbarProps {
  activeTab: "home" | "library" | "search" | "liked";
  setActiveTab: (tab: "home" | "library" | "search" | "liked") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  accounts: {
    spotify: any;
    youtube: any;
    bothConnected: boolean;
    anyConnected: boolean;
  } | null;
  onOpenConnectModal: () => void;
  onOpenHybridModal: () => void;
  onOpenSettings: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  accounts,
  onOpenConnectModal,
  onOpenHybridModal,
  onOpenSettings,
}: NavbarProps) {
  const isSpotifyConnected = Boolean(accounts?.spotify?.isConnected);
  const isYoutubeConnected = Boolean(accounts?.youtube?.isConnected);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Platform Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1DB954] via-emerald-600 to-[#FF0000] p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-white animate-[spin_8s_linear_infinite]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">Dual<span className="text-emerald-400">Wave</span></span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Hub</span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Spotify + YouTube Music Unidos</p>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="flex-1 max-w-md mx-2">
          <div
            onClick={() => setActiveTab("search")}
            className="relative flex items-center w-full"
          >
            <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar músicas e playlists em ambas as plataformas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== "search") setActiveTab("search");
              }}
              onFocus={() => {
                if (activeTab !== "search") setActiveTab("search");
              }}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-full text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right Action buttons and Accounts Status */}
        <div className="flex items-center gap-2">
          {/* Create Hybrid Playlist Button */}
          <button
            onClick={onOpenHybridModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-600 to-rose-600 text-white hover:opacity-90 shadow-sm transition-all"
            title="Criar Playlist Híbrida combinando faixas do Spotify e YouTube"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Playlist Híbrida</span>
          </button>

          {/* Platform Status Pills */}
          <div
            onClick={onOpenConnectModal}
            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1.5 cursor-pointer hover:border-zinc-700 transition-all text-xs"
            title="Clique para gerenciar contas do Spotify e YouTube"
          >
            {/* Spotify Pill */}
            <div className="flex items-center gap-1" title={isSpotifyConnected ? "Spotify conectado" : "Spotify não conectado"}>
              <span className={`w-2 h-2 rounded-full ${isSpotifyConnected ? "bg-[#1DB954] shadow-[0_0_8px_#1DB954]" : "bg-zinc-600"}`} />
              <span className={`font-medium ${isSpotifyConnected ? "text-[#1DB954]" : "text-zinc-500"}`}>Spotify</span>
            </div>

            <span className="text-zinc-700">|</span>

            {/* YouTube Pill */}
            <div className="flex items-center gap-1" title={isYoutubeConnected ? "YouTube Music conectado" : "YouTube Music não conectado"}>
              <span className={`w-2 h-2 rounded-full ${isYoutubeConnected ? "bg-[#FF0000] shadow-[0_0_8px_#FF0000]" : "bg-zinc-600"}`} />
              <span className={`font-medium ${isYoutubeConnected ? "text-rose-400" : "text-zinc-500"}`}>YT Music</span>
            </div>
          </div>

          {/* Connect / Status Button */}
          <button
            onClick={onOpenConnectModal}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              accounts?.bothConnected
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
            }`}
          >
            {accounts?.bothConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">2 Contas Ativas</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>Conectar Contas</span>
              </>
            )}
          </button>

          {/* Console Dev */}
          <a
            href="/dev"
            className="hidden sm:flex p-2 text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-zinc-800 hover:border-emerald-700/60 rounded-full transition-colors"
            title="Console Dev (credenciais + dados no banco local)"
          >
            <Terminal className="w-4 h-4" />
          </a>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full transition-colors"
            title="Configurações & Integrações"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
