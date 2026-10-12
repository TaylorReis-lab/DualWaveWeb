"use client";

import React, { useState, useEffect } from "react";
import { PlayerProvider } from "@/context/PlayerContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { HomeFeed } from "@/components/HomeFeed";
import { SearchView } from "@/components/SearchView";
import { LibraryView } from "@/components/LibraryView";
import { PlayerBar } from "@/components/PlayerBar";
import { QueueDrawer } from "@/components/QueueDrawer";
import { ConnectModal } from "@/components/ConnectModal";
import { PlaylistModal } from "@/components/PlaylistModal";
import { CreateHybridModal } from "@/components/CreateHybridModal";
import { SettingsModal } from "@/components/SettingsModal";
import { AuthModal, type AuthUser } from "@/components/AuthModal";
import { SiteCredits } from "@/components/SiteCredits";
import { MobileNav } from "@/components/MobileNav";
import { RefreshCw, CheckCircle2 } from "lucide-react";

export default function App() {
  return (
    <PlayerProvider>
      <MainLayout />
    </PlayerProvider>
  );
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState<"home" | "library" | "search" | "liked">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [tokenHealth, setTokenHealth] = useState<{
    spotify: { state: string; message: string; renewed?: boolean } | null;
    youtube: { state: string; message: string; renewed?: boolean } | null;
  } | null>(null);
  const [accounts, setAccounts] = useState<{
    spotify: any;
    youtube: any;
    bothConnected: boolean;
    anyConnected: boolean;
    hasSpotifyConfig?: boolean;
    hasGoogleConfig?: boolean;
    credentials?: {
      spotifyReady: boolean;
      googleReady: boolean;
      spotifySource: "env" | "db" | null;
      googleSource: "env" | "db" | null;
      hasYoutubeApiKey: boolean;
    };
    redirectUris?: { spotify: string; youtube: string };
    dev?: { consoleEnabled: boolean; isDevRuntime: boolean; consoleUrl: string };
  } | null>(null);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [isHybridModalOpen, setIsHybridModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Load account status (inclui usuário logado + saúde dos tokens, sem rede extra)
  const refreshAccounts = async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.success) {
        setAccounts({
          spotify: data.spotify,
          youtube: data.youtube,
          bothConnected: data.bothConnected,
          anyConnected: data.anyConnected,
          hasSpotifyConfig: data.hasSpotifyConfig,
          hasGoogleConfig: data.hasGoogleConfig,
          credentials: data.credentials,
          redirectUris: data.redirectUris,
          dev: data.dev,
        });
        if (data.user !== undefined) setUser(data.user);
        if (data.tokenHealth !== undefined) setTokenHealth(data.tokenHealth);

        // If neither account is connected on first visit, open connect modal automatically to guide user!
        if (!data.anyConnected && !data.user && !localStorage.getItem("duo_visited_prompt")) {
          setIsConnectModalOpen(true);
          localStorage.setItem("duo_visited_prompt", "true");
        }
      }
    } catch (e) {
      console.error("Failed to fetch auth status", e);
    }
  };

  // Ao abrir o app: /me renova automaticamente tokens expirados do usuário logado.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.tokenHealth) {
            const merged = {
              spotify: data.tokenHealth.spotify
                ? { ...data.tokenHealth.spotify, renewed: data.refreshed?.spotify?.renewed }
                : null,
              youtube: data.tokenHealth.youtube
                ? { ...data.tokenHealth.youtube, renewed: data.refreshed?.youtube?.renewed }
                : null,
            };
            setTokenHealth(merged);
            if (data.refreshed?.spotify?.renewed || data.refreshed?.youtube?.renewed) {
              const quais = [
                data.refreshed.spotify?.renewed ? "Spotify" : null,
                data.refreshed.youtube?.renewed ? "YouTube Music" : null,
              ].filter(Boolean);
              setAuthNotice(`Tokens renovados automaticamente: ${quais.join(" e ")}.`);
              setTimeout(() => setAuthNotice(null), 8000);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch session", e);
      } finally {
        await refreshAccounts();
      }
    })();
  }, []);

  const handleAuthSuccess = async (loggedUser: AuthUser, message?: string) => {
    setUser(loggedUser);
    setIsAuthModalOpen(false);
    if (message) {
      setAuthNotice(message);
      setTimeout(() => setAuthNotice(null), 8000);
    }
    await refreshAccounts();
    setLibraryRefreshKey((prev) => prev + 1);
  };

  const handleLogout = async () => {
    if (!confirm("Sair da conta? Seus dados ficam salvos no servidor.")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTokenHealth(null);
    setAuthNotice(null);
    await refreshAccounts();
    setLibraryRefreshKey((prev) => prev + 1);
  };

  const handleResetSession = async () => {
    if (confirm("Deseja desconectar todas as contas e limpar dados locais?")) {
      await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "spotify" }),
      });
      await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "youtube" }),
      });
      await refreshAccounts();
      setIsSettingsOpen(false);
      setLibraryRefreshKey((prev) => prev + 1);
    }
  };

  const tokenBadge = (label: string, info: { state: string } | null | undefined) => {
    if (!info) return null;
    const color =
      info.state === "valid"
        ? "text-emerald-400"
        : info.state === "demo"
          ? "text-zinc-400"
          : info.state === "error"
            ? "text-rose-400"
            : "text-amber-400";
    return (
      <span className="flex items-center gap-1" title={label}>
        <span className={`w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
        <span className={color}>{label}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        accounts={accounts}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenHybridModal={() => setIsHybridModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Avisos de conta / renovação de tokens */}
      {(authNotice || (user && tokenHealth)) && (
        <div className="bg-zinc-950 border-b border-zinc-800/80 px-4">
          <div className="max-w-7xl mx-auto py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            {authNotice && (
              <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {authNotice}
              </span>
            )}
            {user && tokenHealth && (tokenHealth.spotify || tokenHealth.youtube) && (
              <span className="flex items-center gap-3 text-zinc-400">
                <span className="flex items-center gap-1 text-zinc-500">
                  <RefreshCw className="w-3 h-3" />
                  Tokens:
                </span>
                {tokenBadge(
                  `Spotify ${tokenHealth.spotify?.renewed ? "• renovado" : ""}`,
                  tokenHealth.spotify
                )}
                {tokenBadge(
                  `YouTube ${tokenHealth.youtube?.renewed ? "• renovado" : ""}`,
                  tokenHealth.youtube
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex items-start">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          accounts={accounts}
          onOpenConnectModal={() => setIsConnectModalOpen(true)}
          onOpenHybridModal={() => setIsHybridModalOpen(true)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-32 md:pb-24">
          {/* Convite para criar conta (visitantes anônimos) */}
          {!user && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 border border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Crie sua conta grátis, salve tudo no servidor</h3>
                <p className="text-xs text-zinc-400">
                  Seus logins do Spotify e do YouTube ficam guardados na sua conta — ao entrar de novo,
                  renovamos os tokens automaticamente.
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shrink-0"
              >
                Criar conta / Entrar
              </button>
            </div>
          )}

          {activeTab === "home" && (
            <HomeFeed
              accounts={accounts}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              onOpenPlaylistModal={(id) => setSelectedPlaylistId(id)}
              onOpenHybridModal={() => setIsHybridModalOpen(true)}
              onNavigateToSearch={(term) => {
                if (term) setSearchQuery(term);
                setActiveTab("search");
              }}
              onNavigateToLibrary={() => setActiveTab("library")}
            />
          )}

          {activeTab === "search" && (
            <SearchView
              initialQuery={searchQuery}
              onOpenPlaylistModal={(id) => setSelectedPlaylistId(id)}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              accounts={accounts}
            />
          )}

          {(activeTab === "library" || activeTab === "liked") && (
            <LibraryView
              key={libraryRefreshKey}
              accounts={accounts}
              onOpenPlaylistModal={(id) => setSelectedPlaylistId(id)}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              onOpenHybridModal={() => setIsHybridModalOpen(true)}
            />
          )}
          <footer className="mt-6 pb-6">
            <SiteCredits />
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
      />

      {/* Unified Player Bar */}
      <PlayerBar />

      {/* Upcoming Tracks Queue Drawer */}
      <QueueDrawer />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        accounts={accounts}
        onRefreshStatus={async () => {
          await refreshAccounts();
          setLibraryRefreshKey((prev) => prev + 1);
        }}
      />

      <PlaylistModal
        playlistId={selectedPlaylistId}
        onClose={() => setSelectedPlaylistId(null)}
        onPlaylistUpdated={() => setLibraryRefreshKey((prev) => prev + 1)}
      />

      <CreateHybridModal
        isOpen={isHybridModalOpen}
        onClose={() => setIsHybridModalOpen(false)}
        onCreated={() => {
          setLibraryRefreshKey((prev) => prev + 1);
          setActiveTab("library");
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetSession={handleResetSession}
      />
    </div>
  );
}
