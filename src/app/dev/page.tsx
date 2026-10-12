"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DevUsersPanel } from "@/components/DevUsersPanel";
import { SiteCredits } from "@/components/SiteCredits";
import {
  Terminal,
  KeyRound,
  Database,
  Play,
  Trash2,
  RefreshCw,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Zap,
  Music2,
  ListMusic,
  ExternalLink,
  FlaskConical,
} from "lucide-react";

type Platform = "spotify" | "youtube";

interface DbDump {
  sessionId: string;
  nodeEnv: string;
  databaseUrl: string;
  totals: {
    sessions: number;
    accounts: number;
    playlists: number;
    tracks: number;
    searches: number;
  } | null;
  accounts: any[];
  playlists: any[];
  tracks: any[];
  recentSearches: any[];
}

interface CredsInfo {
  origin: string;
  redirectUris: { spotify: string; youtube: string };
  credentials: {
    spotifyClientId: string | null;
    spotifyClientSecret: string | null;
    googleClientId: string | null;
    googleClientSecret: string | null;
    youtubeApiKey: string | null;
    spotifySource: "env" | "db" | null;
    googleSource: "env" | "db" | null;
    spotifyReady: boolean;
    googleReady: boolean;
  };
  nodeEnv: string;
}

const inputCls =
  "w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono";
const labelCls = "block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider";
const btnPrimary =
  "px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center gap-1.5 disabled:opacity-50";
const btnGhost =
  "px-3.5 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5 disabled:opacity-50";
const btnDanger =
  "px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 transition-colors flex items-center gap-1.5 disabled:opacity-50";

export default function DevConsolePage() {
  const [dump, setDump] = useState<DbDump | null>(null);
  const [creds, setCreds] = useState<CredsInfo | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [devUsersRefreshKey, setDevUsersRefreshKey] = useState(0);

  // Formulários
  const [credForm, setCredForm] = useState({
    spotifyClientId: "",
    spotifyClientSecret: "",
    googleClientId: "",
    googleClientSecret: "",
    youtubeApiKey: "",
  });
  const [tokenForm, setTokenForm] = useState<{ platform: Platform; accessToken: string; refreshToken: string }>({
    platform: "spotify",
    accessToken: "",
    refreshToken: "",
  });
  const [trackForm, setTrackForm] = useState({
    platform: "youtube" as Platform,
    title: "",
    artist: "",
    album: "",
    youtubeVideoId: "",
    previewUrl: "",
    thumbnailUrl: "",
    durationSeconds: "210",
    playlistId: "",
  });
  const [playlistForm, setPlaylistForm] = useState({
    platform: "hybrid",
    title: "",
    description: "",
    coverUrl: "",
  });

  const notify = (kind: "ok" | "err" | "warn", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 6000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setDevUsersRefreshKey((value) => value + 1);
    try {
      const [dbRes, credRes] = await Promise.all([fetch("/api/dev/db?limit=60"), fetch("/api/dev/credentials")]);
      if (dbRes.status === 403) {
        setDisabled(true);
        return;
      }
      const dbData = await dbRes.json();
      const credData = await credRes.json();
      if (dbData.success) setDump(dbData);
      if (credData.success) setCreds(credData);
    } catch (e: any) {
      notify("err", `Falha ao ler o banco local: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Alertas vindos do fluxo OAuth (?need=, ?error=, ?connected=)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const need = params.get("need");
    const error = params.get("error");
    const msg = params.get("msg");
    const redirectUri = params.get("redirect_uri");

    if (need) {
      notify(
        "warn",
        `Credencial ausente para ${need.toUpperCase()}. Preencha abaixo e cadastre o Redirect URI: ${redirectUri || ""}`
      );
    } else if (error) {
      notify("err", `Erro no OAuth ${error}: ${msg || "detalhes desconhecidos"}`);
    }
  }, []);

  const post = async (url: string, payload: any) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      notify("err", "Não foi possível copiar (clipboard bloqueado).");
    }
  };

  /* ---------------- Ações ---------------- */

  const saveCredentials = async () => {
    try {
      const data = await post("/api/dev/credentials", credForm);
      notify("ok", data.message || "Credenciais gravadas no banco local.");
      setCredForm({
        spotifyClientId: "",
        spotifyClientSecret: "",
        googleClientId: "",
        googleClientSecret: "",
        youtubeApiKey: "",
      });
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const runTokenSync = async () => {
    try {
      const data = await post("/api/dev/token", {
        platform: tokenForm.platform,
        accessToken: tokenForm.accessToken,
        refreshToken: tokenForm.refreshToken || null,
      });
      const r = data.report;
      notify(
        "ok",
        `Sync ${r.platform} OK — conta ${r.accountId} · ${r.playlists} playlists · ${r.tracks} faixas · ${r.liked} curtidas` +
          (r.warnings?.length ? ` · avisos: ${r.warnings.length}` : "")
      );
      await loadAll();
    } catch (e: any) {
      notify("err", `Sync falhou: ${e.message}`);
    }
  };

  const seedDemo = async (platform?: Platform) => {
    try {
      const data = await post("/api/dev/db", { action: "seed-demo", platform: platform || "both" });
      notify("ok", `Demo gravada no banco local: ${JSON.stringify(data.results)}`);
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const insertTrack = async () => {
    try {
      await post("/api/dev/db", {
        action: "insert-track",
        platform: trackForm.platform,
        title: trackForm.title,
        artist: trackForm.artist,
        album: trackForm.album || null,
        youtubeVideoId: trackForm.youtubeVideoId || null,
        previewUrl: trackForm.previewUrl || null,
        thumbnailUrl: trackForm.thumbnailUrl || null,
        durationSeconds: Number(trackForm.durationSeconds) || 210,
        playlistId: trackForm.playlistId || null,
      });
      notify("ok", `Faixa "${trackForm.title}" gravada no banco local.`);
      setTrackForm((f) => ({ ...f, title: "", artist: "", youtubeVideoId: "" }));
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const insertPlaylist = async () => {
    try {
      const data = await post("/api/dev/db", { action: "insert-playlist", ...playlistForm });
      notify("ok", `Playlist criada (id ${data.playlist?.id}).`);
      setPlaylistForm({ platform: "hybrid", title: "", description: "", coverUrl: "" });
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const clearPlatform = async (platform: Platform) => {
    try {
      await post("/api/dev/db", { action: "clear-platform", platform });
      notify("ok", `Dados de ${platform} removidos da sessão.`);
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const wipeSession = async () => {
    if (!confirm("Apagar TODOS os dados desta sessão no banco local?")) return;
    try {
      await post("/api/dev/db", { action: "wipe-session" });
      notify("ok", "Sessão zerada.");
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  const wipeAll = async () => {
    if (!confirm("Apagar TODAS as sessões, contas, playlists e faixas do banco local?")) return;
    try {
      await post("/api/dev/db", { action: "wipe-all" });
      notify("warn", "Banco local completamente zerado.");
      await loadAll();
    } catch (e: any) {
      notify("err", e.message);
    }
  };

  if (disabled) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h1 className="text-lg font-bold">Console Dev desabilitado</h1>
          <p className="text-xs text-zinc-400">
            Defina <code className="bg-zinc-800 px-1 rounded">DISABLE_DEV_CONSOLE</code> como ausente/false no ambiente
            para acessar esta página.
          </p>
          <a href="/" className={btnPrimary + " mx-auto"}>
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao app
          </a>
        </div>
      </main>
    );
  }

  const spotifyReady = creds?.credentials.spotifyReady;
  const googleReady = creds?.credentials.googleReady;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">Console Dev — DualWave</h1>
              <p className="text-[11px] text-zinc-400">
                Banco local · sessão <code className="text-emerald-400">{dump?.sessionId || "..."}</code> · NODE_ENV={dump?.nodeEnv || "?"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadAll} className={btnGhost} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Recarregar
            </button>
            <a href="/" className={btnPrimary}>
              <ArrowLeft className="w-3.5 h-3.5" /> Abrir App
            </a>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-xl border text-xs shadow-2xl flex items-start gap-2 ${
              toast.kind === "ok"
                ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
                : toast.kind === "warn"
                ? "bg-amber-950/90 border-amber-700 text-amber-200"
                : "bg-rose-950/90 border-rose-700 text-rose-200"
            }`}
          >
            {toast.kind === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="break-words">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* 1. Status do banco */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" /> Banco de dados local
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Sessões", value: dump?.totals?.sessions },
              { label: "Contas", value: dump?.totals?.accounts },
              { label: "Playlists", value: dump?.totals?.playlists },
              { label: "Faixas", value: dump?.totals?.tracks },
              { label: "Buscas", value: dump?.totals?.searches },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
                <p className="text-xl font-black text-white font-mono">{s.value ?? "-"}</p>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono break-all bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
            DATABASE_URL = {dump?.databaseUrl || "carregando..."}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => seedDemo()} className={btnPrimary}>
              <Zap className="w-3.5 h-3.5" /> Seed demo (Spotify + YouTube)
            </button>
            <button onClick={() => seedDemo("spotify")} className={btnGhost}>
              <Music2 className="w-3.5 h-3.5 text-[#1DB954]" /> Seed só Spotify
            </button>
            <button onClick={() => seedDemo("youtube")} className={btnGhost}>
              <Play className="w-3.5 h-3.5 text-rose-500" /> Seed só YouTube
            </button>
            <button onClick={() => clearPlatform("spotify")} className={btnDanger}>
              <Trash2 className="w-3.5 h-3.5" /> Limpar Spotify
            </button>
            <button onClick={() => clearPlatform("youtube")} className={btnDanger}>
              <Trash2 className="w-3.5 h-3.5" /> Limpar YouTube
            </button>
            <button onClick={wipeSession} className={btnDanger}>
              <Trash2 className="w-3.5 h-3.5" /> Zerar sessão
            </button>
            <button onClick={wipeAll} className={btnDanger}>
              <AlertTriangle className="w-3.5 h-3.5" /> Zerar banco inteiro
            </button>
          </div>
        </section>

        <DevUsersPanel refreshKey={devUsersRefreshKey} onAuthenticated={() => void loadAll()} />

        {/* 2. Credenciais OAuth */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" /> Credenciais OAuth (gravadas no banco local)
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            {(["spotify", "youtube"] as Platform[]).map((p) => {
              const ready = p === "spotify" ? spotifyReady : googleReady;
              const source = p === "spotify" ? creds?.credentials.spotifySource : creds?.credentials.googleSource;
              const uri = p === "spotify" ? creds?.redirectUris.spotify : creds?.redirectUris.youtube;
              return (
                <div key={p} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {p === "spotify" ? "Spotify Developer" : "Google Cloud (YouTube)"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ready ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {ready ? `pronto (${source})` : "faltando"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 break-all font-mono">
                      {uri}
                    </code>
                    <button
                      onClick={() => copy(p, uri || "")}
                      className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
                      title="Copiar Redirect URI"
                    >
                      {copied === p ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <a
                    href={p === "spotify" ? "/api/auth/spotify" : "/api/auth/youtube"}
                    className={btnPrimary + " w-full justify-center"}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir tela de login do {p === "spotify" ? "Spotify" : "Google/YouTube"}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <div className="space-y-2">
              <label className={labelCls}>SPOTIFY_CLIENT_ID</label>
              <input
                className={inputCls}
                value={credForm.spotifyClientId}
                onChange={(e) => setCredForm({ ...credForm, spotifyClientId: e.target.value })}
                placeholder={creds?.credentials.spotifyClientId || "ex.: 9f2c..."}
              />
              <label className={labelCls}>SPOTIFY_CLIENT_SECRET (opcional → PKCE)</label>
              <input
                className={inputCls}
                type="password"
                value={credForm.spotifyClientSecret}
                onChange={(e) => setCredForm({ ...credForm, spotifyClientSecret: e.target.value })}
                placeholder={creds?.credentials.spotifyClientSecret || "deixe vazio para usar PKCE"}
              />
            </div>

            <div className="space-y-2">
              <label className={labelCls}>GOOGLE_CLIENT_ID</label>
              <input
                className={inputCls}
                value={credForm.googleClientId}
                onChange={(e) => setCredForm({ ...credForm, googleClientId: e.target.value })}
                placeholder={creds?.credentials.googleClientId || "ex.: 123456-abc.apps.googleusercontent.com"}
              />
              <label className={labelCls}>GOOGLE_CLIENT_SECRET</label>
              <input
                className={inputCls}
                type="password"
                value={credForm.googleClientSecret}
                onChange={(e) => setCredForm({ ...credForm, googleClientSecret: e.target.value })}
                placeholder={creds?.credentials.googleClientSecret || "GOCSPX-..."}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>YOUTUBE_API_KEY (usada para casar faixas do Spotify → vídeo do YouTube)</label>
            <input
              className={inputCls}
              value={credForm.youtubeApiKey}
              onChange={(e) => setCredForm({ ...credForm, youtubeApiKey: e.target.value })}
              placeholder={creds?.credentials.youtubeApiKey || "AIza..."}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={saveCredentials} className={btnPrimary}>
              <KeyRound className="w-3.5 h-3.5" /> Gravar no banco local
            </button>
            <button
              onClick={async () => {
                await fetch("/api/dev/credentials", { method: "DELETE" });
                notify("ok", "Credenciais do banco removidas (as do .env continuam valendo).");
                await loadAll();
              }}
              className={btnDanger}
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover do banco
            </button>
          </div>
        </section>

        {/* 3. Sincronização manual com token */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-sky-400" /> Sincronizar com token manual (sem passar pelo OAuth)
          </h2>
          <p className="text-[11px] text-zinc-400">
            Cole um <code className="bg-zinc-800 px-1 rounded">access_token</code> válido e o servidor puxa os IDs
            reais (usuário/canal, playlists, faixas) e grava no banco local. Ideal para testar a sincronização.
          </p>

          <div className="flex flex-wrap gap-2">
            {(["spotify", "youtube"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setTokenForm({ ...tokenForm, platform: p })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tokenForm.platform === p
                    ? p === "spotify"
                      ? "bg-[#1DB954] text-black"
                      : "bg-[#FF0000] text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {p === "spotify" ? "Spotify" : "YouTube"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Access Token</label>
            <textarea
              className={inputCls + " min-h-[70px] resize-y"}
              value={tokenForm.accessToken}
              onChange={(e) => setTokenForm({ ...tokenForm, accessToken: e.target.value })}
              placeholder="BQD... (Spotify) ou ya29... (Google)"
            />
            <label className={labelCls}>Refresh Token (opcional)</label>
            <input
              className={inputCls}
              value={tokenForm.refreshToken}
              onChange={(e) => setTokenForm({ ...tokenForm, refreshToken: e.target.value })}
              placeholder="AQB... / 1//0g..."
            />
          </div>

          <button onClick={runTokenSync} className={btnPrimary} disabled={!tokenForm.accessToken.trim()}>
            <RefreshCw className="w-3.5 h-3.5" /> Rodar sincronização real
          </button>
        </section>

        {/* 4. Inserção manual de registros */}
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Inserir faixa no banco
            </h2>

            <div className="flex gap-2">
              {(["spotify", "youtube"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrackForm({ ...trackForm, platform: p })}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                    trackForm.platform === p
                      ? p === "spotify"
                        ? "bg-[#1DB954] text-black"
                        : "bg-[#FF0000] text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Título *</label>
                <input
                  className={inputCls}
                  value={trackForm.title}
                  onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
                  placeholder="Blinding Lights"
                />
              </div>
              <div>
                <label className={labelCls}>Artista</label>
                <input
                  className={inputCls}
                  value={trackForm.artist}
                  onChange={(e) => setTrackForm({ ...trackForm, artist: e.target.value })}
                  placeholder="The Weeknd"
                />
              </div>
              <div>
                <label className={labelCls}>YouTube Video ID</label>
                <input
                  className={inputCls}
                  value={trackForm.youtubeVideoId}
                  onChange={(e) => setTrackForm({ ...trackForm, youtubeVideoId: e.target.value })}
                  placeholder="4NRXx6U8ABQ"
                />
              </div>
              <div>
                <label className={labelCls}>Duração (s)</label>
                <input
                  className={inputCls}
                  value={trackForm.durationSeconds}
                  onChange={(e) => setTrackForm({ ...trackForm, durationSeconds: e.target.value })}
                  placeholder="210"
                />
              </div>
              <div>
                <label className={labelCls}>Preview URL (Spotify)</label>
                <input
                  className={inputCls}
                  value={trackForm.previewUrl}
                  onChange={(e) => setTrackForm({ ...trackForm, previewUrl: e.target.value })}
                  placeholder="https://p.scdn.co/mp3-preview/..."
                />
              </div>
              <div>
                <label className={labelCls}>Playlist ID (opcional)</label>
                <input
                  className={inputCls}
                  value={trackForm.playlistId}
                  onChange={(e) => setTrackForm({ ...trackForm, playlistId: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <button onClick={insertTrack} className={btnPrimary} disabled={!trackForm.title.trim()}>
              <Plus className="w-3.5 h-3.5" /> Gravar faixa no banco
            </button>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-rose-400" /> Inserir playlist no banco
            </h2>

            <div className="flex gap-2">
              {["spotify", "youtube", "hybrid"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlaylistForm({ ...playlistForm, platform: p })}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                    playlistForm.platform === p ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <label className={labelCls}>Título *</label>
                <input
                  className={inputCls}
                  value={playlistForm.title}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, title: e.target.value })}
                  placeholder="Playlist de Teste Local"
                />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <input
                  className={inputCls}
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
                  placeholder="Criada pelo Console Dev"
                />
              </div>
              <div>
                <label className={labelCls}>Cover URL</label>
                <input
                  className={inputCls}
                  value={playlistForm.coverUrl}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, coverUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <button onClick={insertPlaylist} className={btnPrimary} disabled={!playlistForm.title.trim()}>
              <Plus className="w-3.5 h-3.5" /> Gravar playlist no banco
            </button>

            <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-400">Endpoints disponíveis:</p>
              <code className="block">GET /api/dev/db?limit=60</code>
              <code className="block">GET|POST|DELETE /api/dev/credentials</code>
              <code className="block">POST /api/dev/token</code>
              <code className="block">POST /api/dev/db {"{ action: seed-demo | insert-track | insert-playlist | clear-platform | wipe-session | wipe-all | toggle-like }"}</code>
            </div>
          </div>
        </section>

        {/* 5. Contas conectadas */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" /> Contas conectadas (IDs reais)
          </h2>

          {(!dump?.accounts || dump.accounts.length === 0) ? (
            <p className="text-xs text-zinc-500">Nenhuma conta vinculada a esta sessão.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {dump.accounts.map((a) => (
                <div key={a.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        a.platform === "spotify" ? "bg-[#1DB954]" : "bg-[#FF0000]"
                      }`}
                    />
                    <span className="font-bold text-white text-xs">{a.displayName}</span>
                    <span className="ml-auto text-zinc-500">{a.platform}</span>
                  </div>
                  <p className="text-zinc-400 font-mono break-all">accountId: {a.accountId || "—"}</p>
                  <p className="text-zinc-500">e-mail: {a.email || "—"}</p>
                  <p className="text-zinc-500">
                    status: <span className={a.syncStatus === "synced" ? "text-emerald-400" : "text-amber-400"}>{a.syncStatus}</span> · faixas: {a.itemCount} · plano: {a.product || "—"} · país: {a.country || "—"}
                  </p>
                  <p className="text-zinc-600 font-mono break-all">
                    token: {a.accessToken ? `${String(a.accessToken).slice(0, 12)}… (${String(a.accessToken).length} chars)` : "—"}
                  </p>
                  {a.lastError && (
                    <p className="text-amber-400/90 break-words bg-amber-950/30 border border-amber-900/40 rounded p-1.5">
                      avisos: {a.lastError}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6. Playlists e faixas */}
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-sky-400" /> Playlists ({dump?.playlists?.length ?? 0})
            </h2>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {(dump?.playlists || []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      #{p.id} · {p.title}
                    </p>
                    <p className="text-zinc-500 font-mono truncate">
                      {p.platform}/{p.kind} · ext: {p.externalId || "—"}
                    </p>
                  </div>
                  <span className="text-zinc-400 shrink-0">{p.trackCount} fx</span>
                </div>
              ))}
              {(!dump?.playlists || dump.playlists.length === 0) && (
                <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma playlist no banco.</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Music2 className="w-4 h-4 text-rose-400" /> Faixas ({dump?.tracks?.length ?? 0})
            </h2>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {(dump?.tracks || []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      #{t.id} · {t.title}
                    </p>
                    <p className="text-zinc-500 truncate">
                      {t.artist} · {t.platform} · ext: {t.externalId}
                    </p>
                    <p className="text-zinc-600 font-mono truncate">
                      yt: {t.youtubeVideoId || "—"} · sp: {t.spotifyUri ? "sim" : "—"} · match: {t.matchSource || "—"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await post("/api/dev/db", { action: "toggle-like", trackId: t.id });
                      await loadAll();
                    }}
                    className={`shrink-0 text-[10px] px-2 py-1 rounded ${
                      t.isLiked ? "bg-rose-500/20 text-rose-300" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {t.isLiked ? "♥ curtida" : "♡ curtir"}
                  </button>
                </div>
              ))}
              {(!dump?.tracks || dump.tracks.length === 0) && (
                <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma faixa no banco.</p>
              )}
            </div>
          </div>
        </section>

        <footer className="text-center text-[11px] text-zinc-600 py-6 space-y-5">
          <p>
            Console Dev do DualWave · dados gravados no PostgreSQL local ({dump?.databaseUrl || "..."}) ·{" "}
            <a href="/" className="text-emerald-400 hover:underline">voltar ao app</a>
          </p>
          <SiteCredits />
        </footer>
      </div>
    </main>
  );
}
