"use client";

import React, { useState, useEffect } from "react";
import { usePlayer, TrackItem } from "@/context/PlayerContext";
import {
  Search,
  Filter,
  Play,
  Plus,
  Heart,
  Disc3,
  ExternalLink,
  Sparkles,
  Music2,
  Tv,
  Columns,
  List,
} from "lucide-react";

interface SearchViewProps {
  initialQuery?: string;
  onOpenPlaylistModal: (playlistId: number) => void;
  onOpenConnectModal: () => void;
  accounts: any;
}

export function SearchView({
  initialQuery = "",
  onOpenPlaylistModal,
  onOpenConnectModal,
  accounts,
}: SearchViewProps) {
  const { playTrack, addToQueue, toggleTrackLikeInPlayer, currentTrack, isPlaying } = usePlayer();

  const [query, setQuery] = useState(initialQuery);
  const [platformFilter, setPlatformFilter] = useState<"all" | "spotify" | "youtube">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "tracks" | "playlists">("all");
  const [viewLayout, setViewLayout] = useState<"combined" | "split">("combined");

  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    tracks: any[];
    playlists: any[];
    byPlatform: {
      spotify: { tracks: any[]; playlists: any[]; total: number };
      youtube: { tracks: any[]; playlists: any[]; total: number };
    };
    counts: { total: number; tracks: number; playlists: number; spotify: number; youtube: number };
  }>({
    tracks: [],
    playlists: [],
    byPlatform: {
      spotify: { tracks: [], playlists: [], total: 0 },
      youtube: { tracks: [], playlists: [], total: 0 },
    },
    counts: { total: 0, tracks: 0, playlists: 0, spotify: 0, youtube: 0 },
  });

  const popularQueries = [
    "The Weeknd",
    "Billie Eilish",
    "Coldplay",
    "Dua Lipa",
    "Kendrick Lamar",
    "Taylor Swift",
    "Matuê",
    "Queen",
    "Post Malone",
    "Alok",
  ];

  // Fetch search results whenever query, platform, or category changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults({
        tracks: [],
        playlists: [],
        byPlatform: {
          spotify: { tracks: [], playlists: [], total: 0 },
          youtube: { tracks: [], playlists: [], total: 0 },
        },
        counts: { total: 0, tracks: 0, playlists: 0, spotify: 0, youtube: 0 },
      });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = `/api/search?q=${encodeURIComponent(query)}&platform=${platformFilter}&category=${categoryFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data);
        }
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, platformFilter, categoryFilter]);

  const handlePlaySong = (t: any) => {
    const trackItem: TrackItem = {
      id: t.id || Math.floor(Math.random() * 10000),
      platform: t.platform,
      externalId: t.externalId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationSeconds: t.durationSeconds || 180,
      thumbnailUrl: t.thumbnailUrl,
      previewUrl: t.previewUrl,
      youtubeVideoId: t.youtubeVideoId,
      spotifyUri: t.spotifyUri,
      isLiked: t.isLiked,
    };
    playTrack(trackItem, searchResults.tracks);
  };

  const handleAddSongToQueue = (t: any) => {
    const trackItem: TrackItem = {
      id: t.id || Math.floor(Math.random() * 10000),
      platform: t.platform,
      externalId: t.externalId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationSeconds: t.durationSeconds || 180,
      thumbnailUrl: t.thumbnailUrl,
      previewUrl: t.previewUrl,
      youtubeVideoId: t.youtubeVideoId,
      spotifyUri: t.spotifyUri,
      isLiked: t.isLiked,
    };
    addToQueue(trackItem);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isCurrentPlaying = (t: any): boolean => {
    return Boolean(currentTrack && currentTrack.title === t.title && isPlaying);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Search Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#1DB954]/10 via-[#FF0000]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Busca Unificada Multiplataforma
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pesquise no <span className="text-[#1DB954]">Spotify</span> e no{" "}
            <span className="text-[#FF0000]">YouTube Music</span> simultaneamente
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400">
            Digite o nome de uma música, artista ou álbum para encontrar resultados de ambos os catálogos com filtro instantâneo.
          </p>

          {/* Search Box Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Blinding Lights, Billie Eilish, Bohemian Rhapsody, Matuê..."
              className="w-full pl-12 pr-12 py-3.5 bg-zinc-950/90 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm shadow-xl transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 text-xs text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick suggestions pills */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-zinc-500 font-medium text-[11px]">Sugestões:</span>
            {popularQueries.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/50 text-[11px]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
        {/* Platform Filters (Spotify / YouTube / All) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
          <button
            onClick={() => setPlatformFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              platformFilter === "all"
                ? "bg-zinc-800 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Ambas ({searchResults.counts.total || 0})
          </button>

          <button
            onClick={() => setPlatformFilter("spotify")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              platformFilter === "spotify"
                ? "bg-[#1DB954] text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-[#1DB954]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
            <span>Spotify ({searchResults.counts.spotify || 0})</span>
          </button>

          <button
            onClick={() => setPlatformFilter("youtube")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              platformFilter === "youtube"
                ? "bg-[#FF0000] text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#FF0000]" />
            <span>YouTube Music ({searchResults.counts.youtube || 0})</span>
          </button>
        </div>

        {/* Category Filter Pills & Layout Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Category */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span className="hidden sm:inline text-zinc-500">Tipo:</span>
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs ${
                categoryFilter === "all" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => setCategoryFilter("tracks")}
              className={`px-2.5 py-1 rounded-md text-xs ${
                categoryFilter === "tracks" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Músicas
            </button>
            <button
              onClick={() => setCategoryFilter("playlists")}
              className={`px-2.5 py-1 rounded-md text-xs ${
                categoryFilter === "playlists" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Playlists
            </button>
          </div>

          {/* Split vs Combined view toggle (only if filter is 'all') */}
          {platformFilter === "all" && (
            <div className="flex items-center gap-1 pl-2 border-l border-zinc-800">
              <button
                onClick={() => setViewLayout("combined")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewLayout === "combined" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Visualização em Lista Única"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("split")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewLayout === "split" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Visualização Lado a Lado (Comparação)"
              >
                <Columns className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
          <Disc3 className="w-7 h-7 animate-spin text-emerald-400" />
          <p className="text-xs">Consultando Spotify & YouTube Music...</p>
        </div>
      )}

      {/* Initial state (no query) */}
      {!query && !isLoading && (
        <div className="text-center py-16 px-4 bg-zinc-950/40 rounded-2xl border border-zinc-900">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1DB954]/20 to-[#FF0000]/20 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Comece a pesquisar</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
            Digite qualquer faixa ou artista para descobrir versões oficiais do Spotify e vídeos do YouTube Music com reprodução direta no site.
          </p>
        </div>
      )}

      {/* Search Results Display */}
      {query && !isLoading && (
        <div className="space-y-8">
          {searchResults.counts.total === 0 ? (
            <div className="text-center py-16 px-4 bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <p className="text-sm font-semibold text-white">Nenhum resultado encontrado para "{query}"</p>
              <p className="text-xs text-zinc-400 mt-1">
                Tente buscar por termos mais populares como "The Weeknd", "Coldplay", "Queen" ou "Billie Eilish".
              </p>
            </div>
          ) : (
            <>
              {/* Playlists Section if any match */}
              {searchResults.playlists.length > 0 && categoryFilter !== "tracks" && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Playlists Encontradas</span>
                      <span className="text-xs text-zinc-500 font-normal">
                        ({searchResults.playlists.length})
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {searchResults.playlists.map((pl) => {
                      const isSp = pl.platform === "spotify";
                      return (
                        <div
                          key={pl.id}
                          onClick={() => onOpenPlaylistModal(pl.id)}
                          className="group p-3 rounded-xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-800">
                            <img
                              src={pl.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300"}
                              alt={pl.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Platform badge */}
                            <span
                              className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                                isSp ? "bg-[#1DB954] text-black" : "bg-[#FF0000] text-white"
                              }`}
                            >
                              {isSp ? "Spotify" : "YouTube"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs text-white truncate">{pl.title}</h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-1">{pl.description || `${pl.trackCount} faixas`}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tracks Section */}
              {searchResults.tracks.length > 0 && categoryFilter !== "playlists" && (
                <section className="space-y-3">
                  {/* If Layout is Split and platform filter is 'all', show side by side */}
                  {viewLayout === "split" && platformFilter === "all" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Spotify Results Column */}
                      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#1DB954]" />
                            <h3 className="font-bold text-sm text-white">Spotify</h3>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium">
                            {searchResults.byPlatform.spotify.tracks.length} faixas
                          </span>
                        </div>

                        <div className="space-y-2">
                          {searchResults.byPlatform.spotify.tracks.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma faixa encontrada no Spotify.</p>
                          ) : (
                            searchResults.byPlatform.spotify.tracks.map((t, idx) => (
                              <TrackRowItem
                                key={`sp_${t.id || t.externalId}_${idx}`}
                                track={t}
                                isPlayingThis={isCurrentPlaying(t)}
                                onPlay={() => handlePlaySong(t)}
                                onQueue={() => handleAddSongToQueue(t)}
                                onLike={() => toggleTrackLikeInPlayer(t.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: YouTube Music Results Column */}
                      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#FF0000]" />
                            <h3 className="font-bold text-sm text-white">YouTube Music</h3>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium">
                            {searchResults.byPlatform.youtube.tracks.length} faixas
                          </span>
                        </div>

                        <div className="space-y-2">
                          {searchResults.byPlatform.youtube.tracks.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma faixa encontrada no YouTube Music.</p>
                          ) : (
                            searchResults.byPlatform.youtube.tracks.map((t, idx) => (
                              <TrackRowItem
                                key={`yt_${t.id || t.externalId}_${idx}`}
                                track={t}
                                isPlayingThis={isCurrentPlaying(t)}
                                onPlay={() => handlePlaySong(t)}
                                onQueue={() => handleAddSongToQueue(t)}
                                onLike={() => toggleTrackLikeInPlayer(t.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Combined List View */
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 font-medium">
                        <span>Músicas Encontradas ({searchResults.tracks.length})</span>
                        <span>Origem & Controles</span>
                      </div>
                      <div className="divide-y divide-zinc-800/50">
                        {searchResults.tracks.map((t, idx) => (
                          <TrackRowItem
                            key={`comb_${t.id || t.externalId}_${idx}`}
                            track={t}
                            isPlayingThis={isCurrentPlaying(t)}
                            onPlay={() => handlePlaySong(t)}
                            onQueue={() => handleAddSongToQueue(t)}
                            onLike={() => toggleTrackLikeInPlayer(t.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TrackRowItem({
  track,
  isPlayingThis,
  onPlay,
  onQueue,
  onLike,
}: {
  track: any;
  isPlayingThis: boolean;
  onPlay: () => void;
  onQueue: () => void;
  onLike: () => void;
}) {
  const isSpotify = track.platform === "spotify";

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 hover:bg-zinc-800/60 transition-colors rounded-xl">
      {/* Left: Thumbnail & Song detail */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <img
            src={track.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100"}
            alt={track.title}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover bg-zinc-800"
          />
          {/* Quick Play overlay button */}
          <button
            onClick={onPlay}
            className={`absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center transition-opacity ${
              isPlayingThis ? "opacity-100 text-emerald-400" : "opacity-0 group-hover:opacity-100 text-white"
            }`}
          >
            <Play className={`w-4 h-4 fill-current ${isPlayingThis ? "animate-pulse" : ""}`} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              onClick={onPlay}
              className={`text-xs sm:text-sm font-semibold truncate cursor-pointer hover:underline ${
                isPlayingThis ? "text-emerald-400" : "text-white"
              }`}
            >
              {track.title}
            </h4>
          </div>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Middle: Platform Tag */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isSpotify
              ? "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30"
              : "bg-[#FF0000]/10 text-rose-400 border-rose-500/30"
          }`}
        >
          {isSpotify ? "Spotify" : "YouTube"}
        </span>
      </div>

      {/* Right: Actions (Play, Queue, Like, Duration) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
          {formatSeconds(track.durationSeconds || 180)}
        </span>

        {/* Add to Queue */}
        <button
          onClick={onQueue}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          title="Adicionar à fila de reprodução"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Play Now Button */}
        <button
          onClick={onPlay}
          className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            isPlayingThis
              ? "bg-emerald-500 text-black font-semibold"
              : isSpotify
              ? "bg-[#1DB954]/20 hover:bg-[#1DB954] text-[#1DB954] hover:text-black"
              : "bg-[#FF0000]/20 hover:bg-[#FF0000] text-rose-300 hover:text-white"
          }`}
          title="Tocar agora"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Tocar</span>
        </button>
      </div>
    </div>
  );
}
