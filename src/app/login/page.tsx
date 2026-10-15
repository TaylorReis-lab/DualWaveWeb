"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, KeyRound, Music2, ListMusic, Tv, ShieldCheck, Copy, Check, ExternalLink, Loader2 } from "lucide-react";

interface OAuthProfile {
  id?: string | null;
  display_name?: string | null;
  name?: string | null;
  email?: string | null;
  sub?: string | null;
  picture?: string | null;
  images?: Array<{ url: string }>;
  product?: string | null;
  country?: string | null;
  followers?: { total?: number | null };
  scopes?: string | null;
  channel_title?: string | null;
  subscriber_count?: number | null;
  raw?: unknown;
}

interface SyncSummary {
  platform: string;
  accountId: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  playlists: number;
  tracks: number;
  liked: number;
  warnings: string[];
}

export default function LoginExtractPage() {
  const [phase, setPhase] = useState<"waiting" | "extracting" | "done" | "error">("waiting");
  const [platform, setPlatform] = useState<"spotify" | "youtube" | null>(null);
  const [rawProfile, setRawProfile] = useState<OAuthProfile | null>(null);
  const [extracted, setExtracted] = useState<{
    accountId: string | null;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    extra: Record<string, unknown>;
  } | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platformParam = params.get("platform") as "spotify" | "youtube" | null;
    const account = params.get("account") || "";
    const playlists = params.get("playlists") || "0";
    const tracks = params.get("tracks") || "0";

    // O callback já fez a extração no servidor; aqui só exibimos o resultado.
    setPlatform(platformParam || "spotify");
    setRawProfile({
      id: account,
      display_name: account,
      email: null,
      images: [],
      product: null,
      country: null,
      followers: { total: 0 },
      scopes: null,
    });
    setExtracted({
      accountId: account,
      displayName: account,
      email: null,
      avatarUrl: null,
      extra: { playlists, tracks },
    });
    setSummary({
      platform: platformParam || "spotify",
      accountId: account,
      displayName: account,
      email: null,
      avatarUrl: null,
      playlists: Number(playlists) || 0,
      tracks: Number(tracks) || 0,
      liked: 0,
      warnings: [],
    });
    setPhase("done");
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1DB954] to-[#FF0000] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Extração de dados do login oficial</h1>
              <p className="text-xs text-zinc-400">
                Dados brutos da resposta do {platform === "youtube" ? "Google/YouTube" : "Spotify"} e o que foi extraído para o banco
              </p>
            </div>
          </div>
          <a
            href="/"
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Voltar ao app</span>
          </a>
        </div>

        {/* States */}
        {phase === "waiting" && (
          <div className="p-8 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-300">Aguardando resposta do login oficial...</p>
          </div>
        )}

        {phase === "extracting" && (
          <div className="p-8 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm text-zinc-200 font-medium">Trocando code por tokens...</p>
            <p className="text-xs text-zinc-400">Extraindo ID, e-mail, foto e permissões da resposta oficial</p>
          </div>
        )}

        {phase === "error" && (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-semibold">
              <AlertTriangle className="w-5 h-5" />
              <span>Falha na extração</span>
            </div>
            <p className="text-xs text-rose-200/90 break-words">{error}</p>
            <a href="/" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold`}>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Tentar novamente pelo app
            </a>
          </div>
        )}

        {phase === "done" && extracted && (
          <>
            {/* Resumo da extração */}
            <section className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-rose-950/40 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold">Dados extraídos da resposta oficial</h2>
                <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  {platform === "youtube" ? "Google / YouTube" : "Spotify"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">ID da conta (accountId)</p>
                  <p className="font-mono text-xs text-emerald-400 break-all">{extracted.accountId || "—"}</p>
                  <p className="text-[10px] text-zinc-500">É o identificador único usado para renovar tokens e referenciar a conta no banco.</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Nome de exibição</p>
                  <p className="text-sm font-semibold text-white truncate">{extracted.displayName}</p>
                  <p className="text-[10px] text-zinc-500">Vem de display_name (Spotify) ou name/channel title (Google).</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">E-mail</p>
                  <p className="text-xs text-zinc-200 truncate">{extracted.email || "não autorizado"}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Foto de perfil</p>
                  <p className="text-xs text-zinc-400 truncate">{extracted.avatarUrl || "—"}</p>
                </div>
              </div>

              {summary && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "Playlists", value: summary.playlists },
                    { label: "Faixas", value: summary.tracks },
                    { label: "Curtidas", value: summary.liked },
                  ].map((s) => (
                    <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
                      <p className="text-lg font-black text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {summary?.warnings?.length ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/50 text-amber-200/90 text-[11px] space-y-1">
                  <p className="font-semibold">Avisos não-fatais da API:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {summary.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            {/* Resposta bruta */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" /> Resposta bruta do provedor (campos usados)
                </h3>
                <button
                  onClick={() => copy("raw", JSON.stringify(rawProfile, null, 2))}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                  title="Copiar JSON"
                >
                  {copied === "raw" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="max-h-72 overflow-auto bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-300">
                {JSON.stringify(rawProfile, null, 2)}
              </pre>
            </section>

            {/* Outros campos extraídos */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-2">
              <h3 className="text-sm font-bold">Outros campos extraídos</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                {Object.entries(extracted.extra).map(([key, value]) => (
                  <div key={key} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                    <p className="text-zinc-500 uppercase tracking-wider text-[10px]">{key}</p>
                    <p className="text-zinc-200 break-words font-mono">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-2">
              <a href="/" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> Abrir o app
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
