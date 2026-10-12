"use client";

import React, { useState } from "react";
import { X, CheckCircle2, AlertCircle, RefreshCw, LogOut, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: {
    spotify: any;
    youtube: any;
    bothConnected: boolean;
    anyConnected: boolean;
    hasSpotifyConfig?: boolean;
    hasGoogleConfig?: boolean;
  } | null;
  onRefreshStatus: () => Promise<void>;
}

export function ConnectModal({ isOpen, onClose, accounts, onRefreshStatus }: ConnectModalProps) {
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const spotify = accounts?.spotify;
  const youtube = accounts?.youtube;
  const isSpotifyConnected = Boolean(spotify?.isConnected);
  const isYoutubeConnected = Boolean(youtube?.isConnected);

  const handleConnectDemo = async (platform: "spotify" | "youtube") => {
    setLoadingPlatform(platform);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao conectar conta");
      }
      setSuccessMessage(data.message);
      await onRefreshStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao conectar");
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleConnectBoth = async () => {
    setLoadingPlatform("both");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "spotify" }),
      });
      await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "youtube" }),
      });
      setSuccessMessage("Spotify e YouTube Music conectados e sincronizados!");
      await onRefreshStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao sincronizar contas");
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: "spotify" | "youtube") => {
    setLoadingPlatform(`disc_${platform}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao desconectar");
      }
      setSuccessMessage(data.message);
      await onRefreshStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Falha ao desconectar");
    } finally {
      setLoadingPlatform(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Conexão de Plataformas</h2>
              <p className="text-xs text-zinc-400">Vincule suas contas do Spotify e YouTube Music para unificar suas músicas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1-Click Connect All Button if not both connected */}
          {(!isSpotifyConnected || !isYoutubeConnected) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-rose-950/40 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mb-1">
                  Recomendado para Teste Imediato
                </span>
                <h4 className="text-sm font-semibold text-white">Conectar Ambas em 1-Clique</h4>
                <p className="text-xs text-zinc-400">Carrega playlists reais de ambas para escutar e pesquisar agora mesmo.</p>
              </div>
              <button
                onClick={handleConnectBoth}
                disabled={loadingPlatform === "both"}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-xs bg-gradient-to-r from-emerald-500 to-rose-600 hover:opacity-90 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 transition-all shrink-0 disabled:opacity-50"
              >
                {loadingPlatform === "both" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Conectar Ambas Agora</span>
              </button>
            </div>
          )}

          {/* Two Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spotify Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col justify-between relative overflow-hidden group hover:border-[#1DB954]/50 transition-all">
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#1DB954]/5 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Spotify Icon */}
                    <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308c-.216.353-.674.464-1.026.248-2.812-1.718-6.35-2.107-10.518-1.155-.403.092-.804-.162-.896-.564-.092-.403.161-.804.564-.896 4.566-1.042 8.49-.604 11.628 1.341.352.216.464.674.248 1.026zm1.47-3.267c-.272.443-.852.585-1.295.313-3.219-1.978-8.125-2.55-11.932-1.394-.499.151-1.031-.132-1.183-.631-.151-.499.132-1.031.631-1.183 4.354-1.321 9.774-.683 13.466 1.587.443.272.585.852.313 1.295zm.126-3.41c-3.86-2.292-10.226-2.503-13.918-1.382-.593.18-1.226-.157-1.406-.75-.18-.593.157-1.226.75-1.406 4.254-1.291 11.282-1.042 15.719 1.593.535.317.708 1.01.391 1.545-.317.535-1.01.708-1.545.391z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Spotify</h3>
                      <p className="text-[11px] text-zinc-400">Playlists, Descobertas & Músicas</p>
                    </div>
                  </div>

                  {isSpotifyConnected ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                      Desconectado
                    </span>
                  )}
                </div>

                {/* Spotify Account Info if connected */}
                {isSpotifyConnected ? (
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg mb-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Perfil:</span>
                      <span className="font-semibold text-white">{spotify?.displayName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Total Sincronizado:</span>
                      <span className="text-emerald-400 font-medium">{spotify?.itemCount || 0} músicas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Status:</span>
                      <span className="text-zinc-300">Sincronizado</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Acesse suas playlists do Spotify, artistas favoritos e reproduza via áudio integrado.
                  </p>
                )}
              </div>

              {/* Actions for Spotify */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                {isSpotifyConnected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConnectDemo("spotify")}
                      disabled={loadingPlatform === "spotify"}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingPlatform === "spotify" ? "animate-spin" : ""}`} />
                      <span>Re-sincronizar</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect("spotify")}
                      disabled={loadingPlatform === "disc_spotify"}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center justify-center gap-1 transition-colors"
                      title="Desconectar Spotify"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConnectDemo("spotify")}
                      disabled={loadingPlatform === "spotify"}
                      className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#1DB954] hover:bg-[#1aa34a] text-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/30"
                    >
                      {loadingPlatform === "spotify" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Conectar Spotify (Sandbox Instantâneo)</span>
                    </button>
                    <a
                      href="/api/auth/spotify"
                      className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Entrar com Login Spotify Oficial</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* YouTube Music Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col justify-between relative overflow-hidden group hover:border-[#FF0000]/50 transition-all">
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#FF0000]/5 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* YouTube Music Icon */}
                    <div className="w-8 h-8 rounded-full bg-[#FF0000] flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104 0-3.924 3.18-7.104 7.104-7.104 3.924 0 7.104 3.18 7.104 7.104 0 3.924-3.18 7.104-7.104 7.104zm-1.896-10.428v6.648l5.796-3.324-5.796-3.324z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">YouTube Music</h3>
                      <p className="text-[11px] text-zinc-400">Vídeos, Áudios & Mixes</p>
                    </div>
                  </div>

                  {isYoutubeConnected ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                      Desconectado
                    </span>
                  )}
                </div>

                {/* YouTube Account Info if connected */}
                {isYoutubeConnected ? (
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg mb-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Perfil:</span>
                      <span className="font-semibold text-white">{youtube?.displayName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Total Sincronizado:</span>
                      <span className="text-rose-400 font-medium">{youtube?.itemCount || 0} músicas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Status:</span>
                      <span className="text-zinc-300">Sincronizado</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Acesse seus supermixes do YouTube Music, músicas marcadas como 'Gostei' e escute diretamente.
                  </p>
                )}
              </div>

              {/* Actions for YouTube */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                {isYoutubeConnected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConnectDemo("youtube")}
                      disabled={loadingPlatform === "youtube"}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingPlatform === "youtube" ? "animate-spin" : ""}`} />
                      <span>Re-sincronizar</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect("youtube")}
                      disabled={loadingPlatform === "disc_youtube"}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center justify-center gap-1 transition-colors"
                      title="Desconectar YouTube Music"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConnectDemo("youtube")}
                      disabled={loadingPlatform === "youtube"}
                      className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#FF0000] hover:bg-[#cc0000] text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/30"
                    >
                      {loadingPlatform === "youtube" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Conectar YouTube Music (Sandbox Instantâneo)</span>
                    </button>
                    <a
                      href="/api/auth/youtube"
                      className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Entrar com Login Google / YT Oficial</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Privacy & Safe note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Suas credenciais e playlists são armazenadas com segurança no banco de dados isolado da sua sessão.
              Você pode desconectar ou limpar os dados a qualquer momento.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
          >
            Concluir e Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
