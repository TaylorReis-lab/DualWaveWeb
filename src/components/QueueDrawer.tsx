"use client";

import React from "react";
import { usePlayer } from "@/context/PlayerContext";
import { X, Trash2, Play, Music, Sparkles } from "lucide-react";

export function QueueDrawer() {
  const {
    queue,
    currentTrack,
    showQueueModal,
    setShowQueueModal,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayer();

  if (!showQueueModal) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Fila de Reprodução</h3>
          <span className="text-xs text-zinc-400">({queue.length} faixas)</span>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Limpar toda a fila"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowQueueModal(false)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Now Playing */}
        {currentTrack && (
          <div>
            <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider">
              Tocando Agora
            </span>
            <div className="mt-2 flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
              <img
                src={currentTrack.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100"}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-white truncate">{currentTrack.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentTrack.platform === "spotify"
                    ? "bg-[#1DB954]/20 text-[#1DB954]"
                    : "bg-[#FF0000]/20 text-rose-400"
                }`}
              >
                {currentTrack.platform === "spotify" ? "Spotify" : "YT Music"}
              </span>
            </div>
          </div>
        )}

        {/* Next in Queue */}
        <div>
          <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider">
            A Seguir na Fila
          </span>

          {queue.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-500">
                <Music className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-400">Sua fila está vazia.</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Adicione músicas do Spotify ou YouTube Music clicando nos botões de fila.
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {queue.map((track, idx) => (
                <div
                  key={`${track.id}_${idx}`}
                  className="group flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xs text-zinc-500 w-4 text-right">{idx + 1}</span>
                    <img
                      src={track.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80"}
                      alt={track.title}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-200 truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => playTrack(track, queue.slice(idx + 1))}
                      className="p-1 text-zinc-300 hover:text-white rounded"
                      title="Tocar agora"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                      title="Remover da fila"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
