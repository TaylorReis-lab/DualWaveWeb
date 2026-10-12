"use client";

import React, { useState, useEffect } from "react";
import { usePlayer, TrackItem } from "@/context/PlayerContext";
import {
  X,
  Play,
  Shuffle,
  Heart,
  Plus,
  Trash2,
  ArrowRightLeft,
  Share2,
  Clock,
  Sparkles,
} from "lucide-react";

interface PlaylistModalProps {
  playlistId: number | null;
  onClose: () => void;
  onPlaylistUpdated?: () => void;
}

export function PlaylistModal({ playlistId, onClose, onPlaylistUpdated }: PlaylistModalProps) {
  const { playTrack, addToQueue, toggleTrackLikeInPlayer, currentTrack, isPlaying } = usePlayer();

  const [playlistData, setPlaylistData] = useState<{
    playlist: any;
    tracks: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cloningTo, setCloningTo] = useState<string | null>(null);
  const [cloneSuccessMsg, setCloneSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!playlistId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/playlists/${playlistId}`);
        const data = await res.json();
        if (data.success) {
          setPlaylistData(data);
        }
      } catch (e) {
        console.error("Error loading playlist details", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [playlistId]);

  if (!playlistId) return null;

  const playlist = playlistData?.playlist;
  const tracksList = playlistData?.tracks || [];

  const totalDurationSeconds = tracksList.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);

  const isSpotify = playlist?.platform === "spotify";
  const isYoutube = playlist?.platform === "youtube";
  const isHybrid = playlist?.platform === "hybrid";

  const handlePlayAll = (shuffle: boolean = false) => {
    if (tracksList.length === 0) return;

    let queue: TrackItem[] = tracksList.map((t) => ({
      id: t.id,
      platform: t.platform,
      externalId: t.externalId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationSeconds: t.durationSeconds,
      thumbnailUrl: t.thumbnailUrl,
      previewUrl: t.previewUrl,
      youtubeVideoId: t.youtubeVideoId,
      spotifyUri: t.spotifyUri,
      isLiked: t.isLiked,
    }));

    if (shuffle) {
      queue = [...queue].sort(() => Math.random() - 0.5);
    }

    playTrack(queue[0], queue);
  };

  const handleClone = async (targetPlatform: "spotify" | "youtube" | "hybrid") => {
    setCloningTo(targetPlatform);
    setCloneSuccessMsg(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlatform }),
      });
      const data = await res.json();
      if (data.success) {
        setCloneSuccessMsg(data.message);
        if (onPlaylistUpdated) onPlaylistUpdated();
      }
    } catch (e) {
      console.error("Error cloning playlist", e);
    } finally {
      setCloningTo(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta playlist?")) return;

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (onPlaylistUpdated) onPlaylistUpdated();
        onClose();
      }
    } catch (e) {
      console.error("Error deleting playlist", e);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close Button at Top */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isSpotify
                  ? "bg-[#1DB954] text-black"
                  : isYoutube
                  ? "bg-[#FF0000] text-white"
                  : "bg-gradient-to-r from-emerald-500 to-rose-600 text-white"
              }`}
            >
              {isSpotify ? "Spotify" : isYoutube ? "YouTube Music" : "Híbrida"}
            </span>
            <span className="text-xs text-zinc-400">Playlist Unificada</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading || !playlist ? (
            <div className="py-16 text-center text-zinc-500 text-xs">Carregando detalhes da playlist...</div>
          ) : (
            <>
              {cloneSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  {cloneSuccessMsg}
                </div>
              )}

              {/* Playlist Header Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-zinc-800/40 to-transparent p-4 rounded-2xl border border-zinc-800/60">
                <img
                  src={playlist.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400"}
                  alt={playlist.title}
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl object-cover shadow-2xl border border-zinc-700/60 shrink-0"
                />

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Playlist
                  </span>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {playlist.title}
                  </h2>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {playlist.description || "Coleção de faixas sincronizadas para reprodução contínua."}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400 pt-1">
                    <span className="font-semibold text-white">{tracksList.length} músicas</span>
                    <span>•</span>
                    <span>{totalMinutes} min aprox.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayAll(false)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:scale-105 transition-all"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Tocar Tudo</span>
                  </button>

                  <button
                    onClick={() => handlePlayAll(true)}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Aleatório</span>
                  </button>
                </div>

                {/* Clone / Transfer options */}
                <div className="flex items-center gap-2">
                  {/* Clone to other platform button */}
                  <div className="relative group">
                    <button
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1.5 transition-colors"
                      title="Copiar/Sincronizar esta playlist para outra plataforma"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Transferir / Clonar</span>
                    </button>

                    <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-20 w-48 text-xs">
                      {isSpotify && (
                        <button
                          onClick={() => handleClone("youtube")}
                          className="px-3 py-2 text-left hover:bg-zinc-800 rounded-lg text-rose-300 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
                          <span>Copiar para YouTube</span>
                        </button>
                      )}
                      {isYoutube && (
                        <button
                          onClick={() => handleClone("spotify")}
                          className="px-3 py-2 text-left hover:bg-zinc-800 rounded-lg text-emerald-300 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                          <span>Copiar para Spotify</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleClone("hybrid")}
                        className="px-3 py-2 text-left hover:bg-zinc-800 rounded-lg text-purple-300 flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Converter em Híbrida</span>
                      </button>
                    </div>
                  </div>

                  {/* Delete Playlist Button */}
                  <button
                    onClick={handleDelete}
                    className="p-2 text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Excluir playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tracks Table */}
              <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/40">
                <div className="grid grid-cols-12 px-4 py-2.5 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-500 uppercase">
                  <span className="col-span-1 text-center">#</span>
                  <span className="col-span-6 sm:col-span-5">Título</span>
                  <span className="hidden sm:block col-span-3">Álbum</span>
                  <span className="col-span-3 sm:col-span-2 text-center">Plataforma</span>
                  <span className="col-span-2 sm:col-span-1 text-right flex items-center justify-end">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/40">
                  {tracksList.map((t, idx) => {
                    const isPlayingCurrent = currentTrack && currentTrack.id === t.id && isPlaying;
                    const isSpTrack = t.platform === "spotify";

                    return (
                      <div
                        key={t.id}
                        className="group grid grid-cols-12 items-center px-4 py-2.5 hover:bg-zinc-800/50 transition-colors text-xs"
                      >
                        {/* Track Index or Play button */}
                        <div className="col-span-1 text-center flex items-center justify-center">
                          <button
                            onClick={() => {
                              const item: TrackItem = {
                                id: t.id,
                                platform: t.platform,
                                externalId: t.externalId,
                                title: t.title,
                                artist: t.artist,
                                album: t.album,
                                durationSeconds: t.durationSeconds,
                                thumbnailUrl: t.thumbnailUrl,
                                previewUrl: t.previewUrl,
                                youtubeVideoId: t.youtubeVideoId,
                                spotifyUri: t.spotifyUri,
                                isLiked: t.isLiked,
                              };
                              playTrack(item, tracksList);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-white"
                          >
                            {isPlayingCurrent ? (
                              <Play className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
                            ) : (
                              <span className="group-hover:hidden text-zinc-500 font-mono">{idx + 1}</span>
                            )}
                            <Play className="w-4 h-4 fill-current hidden group-hover:block" />
                          </button>
                        </div>

                        {/* Title & Artist */}
                        <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                          <img
                            src={t.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80"}
                            alt={t.title}
                            className="w-9 h-9 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4
                              onClick={() => {
                                const item: TrackItem = {
                                  id: t.id,
                                  platform: t.platform,
                                  externalId: t.externalId,
                                  title: t.title,
                                  artist: t.artist,
                                  album: t.album,
                                  durationSeconds: t.durationSeconds,
                                  thumbnailUrl: t.thumbnailUrl,
                                  previewUrl: t.previewUrl,
                                  youtubeVideoId: t.youtubeVideoId,
                                  spotifyUri: t.spotifyUri,
                                  isLiked: t.isLiked,
                                };
                                playTrack(item, tracksList);
                              }}
                              className={`font-semibold truncate cursor-pointer hover:underline ${
                                isPlayingCurrent ? "text-emerald-400" : "text-white"
                              }`}
                            >
                              {t.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                          </div>
                        </div>

                        {/* Album */}
                        <div className="hidden sm:block col-span-3 text-zinc-400 truncate pr-2 text-[11px]">
                          {t.album || "-"}
                        </div>

                        {/* Platform Badge */}
                        <div className="col-span-3 sm:col-span-2 text-center">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSpTrack
                                ? "bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/30"
                                : "bg-[#FF0000]/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {isSpTrack ? "Spotify" : "YouTube"}
                          </span>
                        </div>

                        {/* Duration & Quick Actions */}
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5 font-mono text-zinc-400 text-[11px]">
                          <button
                            onClick={() => {
                              const item: TrackItem = {
                                id: t.id,
                                platform: t.platform,
                                externalId: t.externalId,
                                title: t.title,
                                artist: t.artist,
                                album: t.album,
                                durationSeconds: t.durationSeconds,
                                thumbnailUrl: t.thumbnailUrl,
                                previewUrl: t.previewUrl,
                                youtubeVideoId: t.youtubeVideoId,
                                spotifyUri: t.spotifyUri,
                                isLiked: t.isLiked,
                              };
                              addToQueue(item);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity"
                            title="Adicionar à fila"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span>{formatSeconds(t.durationSeconds || 180)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
