"use client";

import React, { useState, useEffect } from "react";
import { X, Settings, Key, Sliders, CheckCircle2, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSession: () => void;
}

export function SettingsModal({ isOpen, onClose, onResetSession }: SettingsModalProps) {
  const [autoMatch, setAutoMatch] = useState(true);
  const [quality, setQuality] = useState("high");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setAutoMatch(data.settings.autoMatchYoutube ?? true);
          setQuality(data.settings.defaultAudioQuality || "high");
        }
      })
      .catch((e) => console.error("Error loading settings", e));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoMatchYoutube: autoMatch,
          defaultAudioQuality: quality,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error("Error saving settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Configurações do Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-zinc-300">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Configurações atualizadas com sucesso!</span>
            </div>
          )}

          {/* Engine Settings */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Motor de Reprodução Unificada</span>
            </h3>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMatch}
                onChange={(e) => setAutoMatch(e.target.checked)}
                className="mt-0.5 rounded accent-emerald-500 w-4 h-4"
              />
              <div>
                <p className="font-semibold text-white">Mapeamento Inteligente Spotify → YouTube</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Associa automaticamente as faixas da sua conta Spotify a vídeos oficiais do YouTube para tocar a música completa e com clipe sem limitações de preview de 30s.
                </p>
              </div>
            </label>
          </div>

          {/* Developer OAuth Info */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-rose-400" />
              <span>Credenciais Personalizadas</span>
            </h3>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              O DualWave já possui perfis de demonstração ricos com dezenas de músicas reais e vídeos para teste imediato. Se desejar usar seu próprio aplicativo OAuth, configure as variáveis de ambiente <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">SPOTIFY_CLIENT_ID</code>, <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">SPOTIFY_CLIENT_SECRET</code> e <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">GOOGLE_CLIENT_ID</code> no servidor.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onResetSession}
            className="text-[11px] text-rose-400 hover:underline"
          >
            Limpar Dados Locais
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all"
            >
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
