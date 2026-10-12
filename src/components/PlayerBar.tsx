"use client";

import React, { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Tv,
  ExternalLink,
} from "lucide-react";

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    queue,
    showVideo,
    showQueueModal,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    prevTrack,
    setShowVideo,
    setShowQueueModal,
    toggleTrackLikeInPlayer,
    playbackSource,
  } = usePlayer();

  const [isHoveringProgress, setIsHoveringProgress] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Player Unificado Pronto — Escolha uma música do Spotify ou YouTube Music para reproduzir</span>
          </div>
          <div className="flex items-center gap-3 hidden sm:flex text-zinc-500 text-[11px]">
            <span>Streaming Híbrido</span>
            <span>•</span>
            <span>Controles Globais</span>
          </div>
        </div>
      </footer>
    );
  }

  const isSpotify = currentTrack.platform === "spotify";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-3 sm:px-6 py-2.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
          <div className="relative group shrink-0">
            <img
              src={currentTrack.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80"}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-lg object-cover shadow-md border border-zinc-800"
            />
            {/* Platform badge on artwork */}
            <span
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow ${
                isSpotify ? "bg-[#1DB954]" : "bg-[#FF0000]"
              }`}
              title={isSpotify ? "Faixa do Spotify" : "Faixa do YouTube Music"}
            >
              {isSpotify ? "S" : "Y"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </h4>
            </div>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[9px] font-semibold uppercase px-1 rounded ${
                  isSpotify ? "bg-[#1DB954]/20 text-[#1DB954]" : "bg-[#FF0000]/20 text-rose-400"
                }`}
              >
                {isSpotify ? "Spotify" : "YouTube"}
              </span>
              <span className="text-[10px] text-zinc-500 truncate">
                {currentTrack.album || (playbackSource === "youtube" ? "Áudio Direto" : "Preview 30s")}
              </span>
            </div>
          </div>

          {/* Like button */}
          <button
            onClick={() => toggleTrackLikeInPlayer(currentTrack.id)}
            className={`p-1.5 rounded-full transition-colors ${
              currentTrack.isLiked
                ? "text-rose-500 hover:text-rose-400"
                : "text-zinc-400 hover:text-white"
            }`}
            title={currentTrack.isLiked ? "Remover dos favoritos" : "Salvar em favoritos"}
          >
            <Heart className={`w-4 h-4 ${currentTrack.isLiked ? "fill-rose-500" : ""}`} />
          </button>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-xl">
          {/* Action buttons */}
          <div className="flex items-center gap-3 sm:gap-4 mb-1">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition-colors ${
                isShuffle ? "text-emerald-400" : "text-zinc-400 hover:text-white"
              }`}
              title="Aleatório"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Prev */}
            <button
              onClick={prevTrack}
              className="p-1.5 text-zinc-300 hover:text-white transition-colors"
              title="Anterior"
            >
              <SkipBack className="w-5 h-5 fill-zinc-300 hover:fill-white" />
            </button>

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all"
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={nextTrack}
              className="p-1.5 text-zinc-300 hover:text-white transition-colors"
              title="Próxima"
            >
              <SkipForward className="w-5 h-5 fill-zinc-300 hover:fill-white" />
            </button>

            {/* Repeat */}
            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-full transition-colors ${
                repeatMode !== "off" ? "text-emerald-400" : "text-zinc-400 hover:text-white"
              }`}
              title={`Repetir: ${repeatMode === "off" ? "Desativado" : repeatMode === "all" ? "Todas" : "Uma"}`}
            >
              {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Time & Progress bar */}
          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
            <span>{formatTime(progress)}</span>
            <div
              className="relative flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer flex items-center group py-1"
              onMouseEnter={() => setIsHoveringProgress(true)}
              onMouseLeave={() => setIsHoveringProgress(false)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                seekTo(clickPos * duration);
              }}
            >
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full group-hover:brightness-125"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Auxiliary controls & Volume */}
        <div className="flex items-center justify-end gap-3 w-full md:w-1/4">
          {/* Video Toggle button */}
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              showVideo
                ? "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
            title="Assistir clipe oficial no YouTube"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Vídeo</span>
          </button>

          {/* Queue toggle */}
          <button
            onClick={() => setShowQueueModal(!showQueueModal)}
            className={`relative p-1.5 rounded-full transition-colors ${
              showQueueModal ? "text-emerald-400 bg-zinc-800" : "text-zinc-400 hover:text-white"
            }`}
            title="Fila de Reprodução"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <button
              onClick={toggleMute}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
