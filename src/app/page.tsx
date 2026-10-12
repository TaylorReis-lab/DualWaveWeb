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
import { MobileNav } from "@/components/MobileNav";

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
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [isHybridModalOpen, setIsHybridModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Load account status
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

        // If neither account is connected on first visit, open connect modal automatically to guide user!
        if (!data.anyConnected && !localStorage.getItem("duo_visited_prompt")) {
          setIsConnectModalOpen(true);
          localStorage.setItem("duo_visited_prompt", "true");
        }
      }
    } catch (e) {
      console.error("Failed to fetch auth status", e);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        accounts={accounts}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenHybridModal={() => setIsHybridModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

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
