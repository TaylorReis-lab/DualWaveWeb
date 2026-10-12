"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Check, Plus, Music2 } from "lucide-react";

interface CreateHybridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateHybridModal({ isOpen, onClose, onCreated }: CreateHybridModalProps) {
  const [title, setTitle] = useState("Meu Mix Híbrido Spotify & YouTube");
  const [description, setDescription] = useState("Uma playlist unindo as melhores faixas de ambas as plataformas.");
  const [availableTracks, setAvailableTracks] = useState<any[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [platformTab, setPlatformTab] = useState<"all" | "spotify" | "youtube">("all");

  useEffect(() => {
    if (!isOpen) return;

    // Fetch all tracks in user's library
    const loadTracks = async () => {
      try {
        const res = await fetch("/api/search?q=a&platform=all&category=tracks");
        const data = await res.json();
        if (data.success && data.tracks) {
          // Filter to only positive ID tracks (saved in DB)
          const valid = data.tracks.filter((t: any) => t.id > 0);
          setAvailableTracks(valid);
          // Pre-select first 4 tracks
          if (valid.length > 0) {
            setSelectedTrackIds(valid.slice(0, 4).map((t: any) => t.id));
          }
        }
      } catch (e) {
        console.error("Error loading library tracks", e);
      }
    };

    loadTracks();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelectTrack = (id: number) => {
    setSelectedTrackIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          trackIds: selectedTrackIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated();
        onClose();
      }
    } catch (e) {
      console.error("Error creating hybrid playlist", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTracks = availableTracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPlatform = platformTab === "all" || t.platform === platformTab;
    return matchesSearch && matchesPlatform;
  });

  const spotifySelectedCount = availableTracks.filter(
    (t) => selectedTrackIds.includes(t.id) && t.platform === "spotify"
  ).length;

  const youtubeSelectedCount = availableTracks.filter(
    (t) => selectedTrackIds.includes(t.id) && t.platform === "youtube"
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-rose-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Criar Playlist Híbrida</h2>
              <p className="text-xs text-zinc-400">Junte faixas do Spotify e do YouTube Music numa única playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Título da Playlist</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da sua playlist..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o clima da playlist..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Selection Stats */}
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Composição Selecionada:</span>
            <div className="flex items-center gap-3">
              <span className="text-[#1DB954] font-medium">🟢 {spotifySelectedCount} Spotify</span>
              <span className="text-rose-400 font-medium">🔴 {youtubeSelectedCount} YouTube Music</span>
              <span className="font-bold text-white font-mono">Total: {selectedTrackIds.length}</span>
            </div>
          </div>

          {/* Track selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Escolha as Músicas</h4>
              {/* Platform Filter */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
                <button
                  onClick={() => setPlatformTab("all")}
                  className={`px-2 py-0.5 rounded ${platformTab === "all" ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setPlatformTab("spotify")}
                  className={`px-2 py-0.5 rounded ${platformTab === "spotify" ? "bg-[#1DB954] text-black font-semibold" : "text-zinc-400"}`}
                >
                  Spotify
                </button>
                <button
                  onClick={() => setPlatformTab("youtube")}
                  className={`px-2 py-0.5 rounded ${platformTab === "youtube" ? "bg-[#FF0000] text-white font-semibold" : "text-zinc-400"}`}
                >
                  YouTube
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por nome da música ou artista..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none"
            />

            {/* List */}
            <div className="max-h-56 overflow-y-auto border border-zinc-800/80 rounded-xl divide-y divide-zinc-800/40 bg-zinc-950/40">
              {filteredTracks.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Nenhuma música encontrada. Conecte contas para ter mais músicas.
                </div>
              ) : (
                filteredTracks.map((t) => {
                  const isSelected = selectedTrackIds.includes(t.id);
                  const isSp = t.platform === "spotify";

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleSelectTrack(t.id)}
                      className={`flex items-center justify-between p-2.5 hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-950/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500 text-black"
                              : "border-zinc-700 bg-zinc-900"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <img
                          src={t.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80"}
                          alt={t.title}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isSp ? "bg-[#1DB954]/20 text-[#1DB954]" : "bg-[#FF0000]/20 text-rose-400"
                        }`}
                      >
                        {isSp ? "Spotify" : "YouTube"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            {selectedTrackIds.length} músicas selecionadas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-rose-600 text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Criando..." : "Criar Playlist Híbrida"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
