"use client";

import React, { useEffect, useState } from "react";
import { usePlayer, TrackItem } from "@/context/PlayerContext";
import {
  Sparkles,
  Play,
  Shuffle,
  Radio,
  ListMusic,
  Heart,
  CheckCircle2,
  ArrowRight,
  Plus,
  Flame,
  Music,
  ExternalLink,
} from "lucide-react";

interface HomeFeedProps {
  accounts: any;
  onOpenConnectModal: () => void;
  onOpenPlaylistModal: (id: number) => void;
  onOpenHybridModal: () => void;
  onNavigateToSearch: (term?: string) => void;
  onNavigateToLibrary: () => void;
}

export function HomeFeed({
  accounts,
  onOpenConnectModal,
  onOpenPlaylistModal,
  onOpenHybridModal,
  onNavigateToSearch,
  onNavigateToLibrary,
}: HomeFeedProps) {
  const { playTrack } = usePlayer();
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);

  const isSpotifyConnected = Boolean(accounts?.spotify?.isConnected);
  const isYoutubeConnected = Boolean(accounts?.youtube?.isConnected);
  const bothConnected = isSpotifyConnected && isYoutubeConnected;

  useEffect(() => {
    // Fetch playlists & tracks for home feed
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.playlists) {
          setFeaturedPlaylists(data.playlists);
        }
      })
      .catch((e) => console.error("Error fetching playlists for home", e));

    fetch("/api/search?q=a&platform=all&category=tracks")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.tracks) {
          setTopTracks(data.tracks.slice(0, 10));
        }
      })
      .catch((e) => console.error("Error fetching tracks for home", e));
  }, [accounts]);

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
    playTrack(trackItem, topTracks);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#1DB954]/15 via-[#FF0000]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {getTimeGreeting()} • Hub Dual Spotify + YouTube Music
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
            Todas as suas músicas.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-rose-500 bg-clip-text text-transparent">
              Zero barreiras.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
            Conecte suas contas do Spotify e do YouTube Music para sincronizar playlists, ouvir faixas diretamente no player integrado e pesquisar em ambas ao mesmo tempo.
          </p>

          {/* Connection Status Cards / Call to Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {!bothConnected ? (
              <button
                onClick={onOpenConnectModal}
                className="px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 via-emerald-600 to-rose-600 text-white shadow-xl shadow-emerald-950/40 hover:opacity-95 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Conectar Contas (1-Clique Instantâneo)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Spotify e YouTube Music Conectados & Sincronizados!</span>
              </div>
            )}

            <button
              onClick={() => onNavigateToSearch()}
              className="px-5 py-3 rounded-2xl font-semibold text-xs sm:text-sm bg-zinc-800/90 hover:bg-zinc-700 text-white border border-zinc-700/80 flex items-center justify-center gap-2 transition-all"
            >
              <span>Pesquisar em Ambos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Platform Status Bar inside Hero */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Spotify Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-bold text-xs">
                S
              </div>
              <div>
                <p className="text-xs font-bold text-white">Spotify</p>
                <p className="text-[11px] text-zinc-400">
                  {isSpotifyConnected ? accounts?.spotify?.displayName : "Não conectado"}
                </p>
              </div>
            </div>
            {isSpotifyConnected ? (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {accounts?.spotify?.itemCount || 0} faixas
              </span>
            ) : (
              <button
                onClick={onOpenConnectModal}
                className="text-[11px] font-semibold text-black bg-[#1DB954] px-2.5 py-1 rounded-lg hover:bg-[#1aa34a] transition-colors"
              >
                Conectar
              </button>
            )}
          </div>

          {/* YouTube Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#FF0000] flex items-center justify-center text-white font-bold text-xs">
                Y
              </div>
              <div>
                <p className="text-xs font-bold text-white">YouTube Music</p>
                <p className="text-[11px] text-zinc-400">
                  {isYoutubeConnected ? accounts?.youtube?.displayName : "Não conectado"}
                </p>
              </div>
            </div>
            {isYoutubeConnected ? (
              <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {accounts?.youtube?.itemCount || 0} faixas
              </span>
            ) : (
              <button
                onClick={onOpenConnectModal}
                className="text-[11px] font-semibold text-white bg-[#FF0000] px-2.5 py-1 rounded-lg hover:bg-[#cc0000] transition-colors"
              >
                Conectar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured Playlists Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Playlists em Destaque</h2>
            <p className="text-xs text-zinc-400">Suas seleções sincronizadas de ambos os serviços</p>
          </div>
          <button
            onClick={onNavigateToLibrary}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {featuredPlaylists.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <ListMusic className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-white">Nenhuma playlist importada ainda</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Conecte suas contas do Spotify e YouTube Music para carregar suas coleções automaticamente.
            </p>
            <button
              onClick={onOpenConnectModal}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Conectar Agora em 1-Clique
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featuredPlaylists.slice(0, 6).map((pl) => {
              const isSp = pl.platform === "spotify";
              const isYt = pl.platform === "youtube";
              const isHyb = pl.platform === "hybrid";

              return (
                <div
                  key={pl.id}
                  onClick={() => onOpenPlaylistModal(pl.id)}
                  className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 bg-zinc-800 shadow-md">
                    <img
                      src={pl.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300"}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Badge */}
                    <span
                      className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                        isSp
                          ? "bg-[#1DB954] text-black"
                          : isYt
                          ? "bg-[#FF0000] text-white"
                          : "bg-gradient-to-r from-emerald-500 to-rose-600 text-white"
                      }`}
                    >
                      {isSp ? "Spotify" : isYt ? "YT Music" : "Híbrida"}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-emerald-400 transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                      {pl.trackCount || 0} faixas
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Top Tracks Side by Side Showcase: Spotify vs YouTube Music */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>Destaques dos Catálogos</span>
            </h2>
            <p className="text-xs text-zinc-400">Escute os maiores sucessos de cada plataforma com um clique</p>
          </div>
          <button
            onClick={() => onNavigateToSearch()}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Buscar mais</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spotify Column */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954]" />
                <h3 className="font-bold text-sm text-white">Mais Tocadas no Spotify</h3>
              </div>
              <span className="text-[10px] font-semibold text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full">
                Áudio Oficial
              </span>
            </div>

            <div className="space-y-1.5">
              {topTracks
                .filter((t) => t.platform === "spotify")
                .slice(0, 4)
                .map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handlePlaySong(track)}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/70 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={track.thumbnailUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80"}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(track);
                      }}
                      className="w-8 h-8 rounded-full bg-[#1DB954] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* YouTube Column */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF0000]" />
                <h3 className="font-bold text-sm text-white">Supermixes do YouTube Music</h3>
              </div>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                Vídeo + Áudio
              </span>
            </div>

            <div className="space-y-1.5">
              {topTracks
                .filter((t) => t.platform === "youtube")
                .slice(0, 4)
                .map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handlePlaySong(track)}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/70 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={track.thumbnailUrl || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=80"}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(track);
                      }}
                      className="w-8 h-8 rounded-full bg-[#FF0000] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hybrid Playlist Promo Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-rose-950/40 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Exclusivo do DualWave
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Crie Playlists Híbridas Sem Restrições
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Misture suas músicas favoritas do Spotify com os lançamentos e apresentações ao vivo do YouTube Music numa playlist única com reprodução ininterrupta.
          </p>
        </div>

        <button
          onClick={onOpenHybridModal}
          className="px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-rose-600 hover:opacity-90 text-white shadow-xl shadow-emerald-950/40 flex items-center gap-2 shrink-0 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Criar Minha Primeira Playlist Híbrida</span>
        </button>
      </section>
    </div>
  );
}
