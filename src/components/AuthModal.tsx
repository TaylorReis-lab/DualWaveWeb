"use client";

import React, { useState } from "react";
import { X, LogIn, UserPlus, AlertCircle, CheckCircle2, KeyRound, Code2 } from "lucide-react";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: "dev" | "user";
  createdAt: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser, message?: string) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devCode, setDevCode] = useState("");
  const [showDevCode, setShowDevCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { email, password, displayName, devCode: devCode || undefined }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha na autenticação.");
      }

      // Limpa o formulário e avisa o app para recarregar contas/playlists.
      setPassword("");
      setDevCode("");
      onAuthSuccess(data.user, data.message);
    } catch (err: any) {
      setError(err.message || "Falha na autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center text-white shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
              </h2>
              <p className="text-xs text-zinc-400">
                {mode === "login"
                  ? "Seus Spotify e YouTube ficam salvos nesta conta"
                  : "Salve seus logins do Spotify e YouTube no servidor"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 m-4 mb-0 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === "login" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            onClick={() => switchMode("register")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === "register" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar conta</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome de exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex.: Gabriel"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Senha {mode === "register" && <span className="text-zinc-500 font-normal">(mínimo 8 caracteres)</span>}
            </label>
            <input
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {mode === "register" && (
            <div>
              {!showDevCode ? (
                <button
                  type="button"
                  onClick={() => setShowDevCode(true)}
                  className="text-[11px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Sou desenvolvedor — tenho o código dev</span>
                </button>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Código de desenvolvedor</label>
                  <input
                    type="text"
                    value={devCode}
                    onChange={(e) => setDevCode(e.target.value)}
                    placeholder="Código dev (opcional)"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-amber-900/50 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Contas dev abrem com os logins de demonstração já presentes e acesso ao Console Dev.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            {mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? "Entrando..." : "Entrar e renovar tokens"}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? "Criando..." : "Criar conta grátis"}</span>
              </>
            )}
          </button>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              {mode === "login"
                ? "Ao entrar, verificamos automaticamente se os tokens do Spotify e do YouTube Music expiraram e os renovamos."
                : "Sua senha é armazenada com hash seguro (scrypt) e seus tokens do Spotify/YouTube ficam vinculados a esta conta."}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
