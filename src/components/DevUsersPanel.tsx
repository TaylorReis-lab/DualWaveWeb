"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock3,
  LogIn,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AuthModal } from "./AuthModal";
import type { DevUsersResponse } from "@/types/dev-users";

interface DevUsersPanelProps {
  refreshKey?: number;
  onAuthenticated?: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function relativeActivity(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return `Há ${Math.floor(hours / 24)} dia(s)`;
}

export function DevUsersPanel({ refreshKey = 0, onAuthenticated }: DevUsersPanelProps) {
  const [data, setData] = useState<DevUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"allowed" | "login" | "forbidden" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  const loadUsers = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/dev/users", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401 || response.status === 403) {
        setAccess(response.status === 401 ? "login" : "forbidden");
        setError(payload.error || "Acesso restrito a desenvolvedores.");
        setData(null);
        return;
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Falha ao consultar as sessões.");
      }
      setData(payload as DevUsersResponse);
      setAccess("allowed");
      setError(null);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Falha ao consultar as sessões.");
      setData(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadUsers();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadUsers();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      activeRequest.current?.abort();
    };
  }, [loadUsers, refreshKey]);

  const filtered = (data?.users ?? []).filter((user) => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return `${user.displayName} ${user.email}`.toLocaleLowerCase("pt-BR").includes(normalized);
  });

  return (
    <section aria-labelledby="dev-users-heading" className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="dev-users-heading" className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Desenvolvedores logados
              <span className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Sessões ativas
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Contas dev com login não expirado. Atualização automática a cada 30 segundos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar lista
          </button>
        </div>

        {access === "login" || access === "forbidden" ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-white">Acesso exclusivo para desenvolvedores</p>
              <p className="text-xs text-zinc-400">{error}</p>
              <p className="text-[11px] text-zinc-500">Não mostramos informações de outros usuários para visitantes ou contas comuns.</p>
            </div>
            {access === "login" ? (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" /> Entrar na conta dev
              </button>
            ) : (
              <Link href="/" className="text-xs font-medium text-emerald-400 hover:underline shrink-0">
                Voltar ao app
              </Link>
            )}
          </div>
        ) : error ? (
          <div role="alert" className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Devs logados", value: data?.totals.developers, icon: Users },
                { label: "Sessões abertas", value: data?.totals.sessions, icon: Monitor },
                { label: "Atividade nos últimos 5 min", value: data?.totals.recentlyActive, icon: Activity },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className="text-xl font-black font-mono text-white">{value ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  aria-label="Buscar desenvolvedor por nome ou e-mail"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filtrar por nome ou e-mail..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <p aria-live="polite" className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                <Clock3 className="w-3 h-3" />
                {data ? `Consultado em ${formatDate(data.checkedAt)}` : "Consultando sessões..."}
              </p>
            </div>

            {!data && loading ? (
              <div className="py-8 text-center text-xs text-zinc-500" role="status">Carregando desenvolvedores...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                <Users className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">
                  {query ? "Nenhum desenvolvedor corresponde à busca." : "Nenhum desenvolvedor com sessão ativa."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/50">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-zinc-950 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Desenvolvedor</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Atividade</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-center">Sessões</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Último login</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Validade do login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-rose-500/20 border border-zinc-700 text-emerald-300 flex items-center justify-center font-bold shrink-0" aria-hidden="true">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                {user.displayName}
                                {user.isCurrentUser && <span className="text-[9px] rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-400">Você</span>}
                              </p>
                              <p className="text-[11px] text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`flex items-center gap-1.5 ${user.recentlyActive ? "text-emerald-400" : "text-zinc-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.recentlyActive ? "bg-emerald-400" : "bg-zinc-600"}`} />
                            {user.recentlyActive ? "Ativo recentemente" : "Sessão aberta"}
                          </p>
                          <p title={formatDate(user.lastSeenAt)} className="text-[10px] text-zinc-500 mt-0.5">{relativeActivity(user.lastSeenAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-300 font-mono">{user.activeSessions}</td>
                        <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDate(user.lastLoginAt)}</td>
                        <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDate(user.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/40 text-[10px] text-zinc-500 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
        <p>Uma sessão aberta não garante que o dispositivo esteja online. A última atividade é registrada pelo servidor; senhas, hashes e tokens não são retornados nesta lista.</p>
      </div>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => {
          setAuthOpen(false);
          void loadUsers();
          onAuthenticated?.();
        }}
      />
    </section>
  );
}
