"use client";

import React, { useState, useEffect } from "react";
import { usePlayer, TrackItem } from "@/context/PlayerContext";
import {
  ListMusic,
  Heart,
  Plus,
  Play,
  Shuffle,
  Sparkles,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface LibraryViewProps {
  accounts: any;
  onOpenPlaylistModal: (playlistId: number) => void;
  onOpenConnectModal: () => void;
  onOpenHybridModal: () => void;
}

export function LibraryView({
  accounts,
  onOpenPlaylistModal,
  onOpenConnectModal,
  onOpenHybridModal,
}: LibraryViewProps) {
  const { playTrack } = usePlayer();

  const [activeTab, setActiveTab] = useState<"all" | "spotify" | "youtube" | "hybrid" | "liked">("all");
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedTracks, setLikedTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
      }
    } catch (e) {
      console.error("Failed to fetch playlists", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLikedTracks = async () => {
    try {
      const res = await fetch("/api/tracks/liked");
      const data = await res.json();
      if (data.success) {
        setLikedTracks(data.tracks);
      }
    } catch (e) {
      console.error("Failed to fetch liked tracks", e);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    fetchLikedTracks();
  }, [accounts]);

  const filteredPlaylists = playlists.filter((pl) => {
    if (activeTab === "all") return true;
    if (activeTab === "spotify") return pl.platform === "spotify";
    if (activeTab === "youtube") return pl.platform === "youtube";
    if (activeTab === "hybrid") return pl.platform === "hybrid";
    return true;
  });

  const handlePlayPlaylist = async (playlistId: number) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      const data = await res.json();
      if (data.success && data.tracks.length > 0) {
        const queue: TrackItem[] = data.tracks.map((t: any) => ({
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
        playTrack(queue[0], queue);
      }
    } catch (e) {
      console.error("Error playing playlist", e);
    }
  };

  const handlePlayLikedAll = () => {
    if (likedTracks.length === 0) return;
    const queue: TrackItem[] = likedTracks.map((t: any) => ({
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
    playTrack(queue[0], queue);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sua Biblioteca Unificada
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Todas as suas músicas e playlists do Spotify e do YouTube Music juntas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHybridModal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-rose-600 text-white hover:opacity-90 flex items-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Playlist Híbrida</span>
          </button>

          <button
            onClick={fetchPlaylists}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors"
            title="Recarregar biblioteca"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800/80">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
            activeTab === "all"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          Todas as Playlists ({playlists.length})
        </button>

        <button
          onClick={() => setActiveTab("spotify")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === "spotify"
              ? "bg-[#1DB954] text-black"
              : "text-zinc-400 hover:text-[#1DB954] hover:bg-zinc-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
          <span>Spotify ({playlists.filter((p) => p.platform === "spotify").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("youtube")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === "youtube"
              ? "bg-[#FF0000] text-white"
              : "text-zinc-400 hover:text-rose-400 hover:bg-zinc-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
          <span>YouTube Music ({playlists.filter((p) => p.platform === "youtube").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("hybrid")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === "hybrid"
              ? "bg-gradient-to-r from-emerald-600 to-rose-600 text-white"
              : "text-zinc-400 hover:text-purple-300 hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Híbridas ({playlists.filter((p) => p.platform === "hybrid").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("liked")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === "liked"
              ? "bg-rose-600 text-white"
              : "text-zinc-400 hover:text-rose-400 hover:bg-zinc-900"
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Músicas Curtidas ({likedTracks.length})</span>
        </button>
      </div>

      {/* Liked Tracks Tab Content */}
      {activeTab === "liked" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-zinc-900 to-purple-950/40 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Coleção de Músicas Curtidas</h3>
                <p className="text-xs text-zinc-400">
                  {likedTracks.length} músicas favoritas unificadas do Spotify e do YouTube Music
                </p>
              </div>
            </div>

            {likedTracks.length > 0 && (
              <button
                onClick={handlePlayLikedAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 flex items-center gap-2 shadow-lg transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Tocar Todas</span>
              </button>
            )}
          </div>

          {likedTracks.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/40 rounded-2xl border border-zinc-900">
              <Heart className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Nenhuma música favoritada ainda</p>
              <p className="text-xs text-zinc-500 mt-1">
                Conecte suas contas ou clique no ícone de coração nas músicas para salvá-las aqui.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/50">
              {likedTracks.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs text-zinc-500 w-4 text-right font-mono">{idx + 1}</span>
                    <img
                      src={t.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80"}
                      alt={t.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{t.title}</h4>
                      <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      t.platform === "spotify"
                        ? "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30"
                        : "bg-[#FF0000]/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {t.platform === "spotify" ? "Spotify" : "YouTube"}
                  </span>

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
                      playTrack(item, likedTracks);
                    }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Playlists Grid */
        <div>
          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/40 rounded-2xl border border-zinc-900 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <ListMusic className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Nenhuma playlist encontrada nesta categoria</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Conecte seu Spotify e seu YouTube Music para importar suas playlists instantaneamente.
              </p>
              <button
                onClick={onOpenConnectModal}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Conectar Contas Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPlaylists.map((pl) => {
                const isSp = pl.platform === "spotify";
                const isYt = pl.platform === "youtube";
                const isHyb = pl.platform === "hybrid";

                return (
                  <div
                    key={pl.id}
                    onClick={() => onOpenPlaylistModal(pl.id)}
                    className="group p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-800 shadow-md">
                      <img
                        src={pl.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400"}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Platform Badge */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${
                          isSp
                            ? "bg-[#1DB954] text-black"
                            : isYt
                            ? "bg-[#FF0000] text-white"
                            : "bg-gradient-to-r from-emerald-500 to-rose-600 text-white"
                        }`}
                      >
                        {isSp ? "Spotify" : isYt ? "YT Music" : "Híbrida"}
                      </span>

                      {/* Play Hover Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist(pl.id);
                        }}
                        className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105"
                        title="Tocar Playlist"
                      >
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                        {pl.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {pl.description || `${pl.trackCount || 0} faixas`}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                        <span>{pl.trackCount || 0} músicas</span>
                        <span className="capitalize">{pl.platform}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
