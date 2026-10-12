"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export interface TrackItem {
  id: number;
  platform: "spotify" | "youtube";
  externalId: string;
  title: string;
  artist: string;
  album?: string | null;
  durationSeconds: number;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  youtubeVideoId?: string | null;
  spotifyUri?: string | null;
  isLiked?: boolean;
}

interface PlayerContextType {
  currentTrack: TrackItem | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one";
  queue: TrackItem[];
  showVideo: boolean;
  showQueueModal: boolean;
  playTrack: (track: TrackItem, newQueue?: TrackItem[]) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: TrackItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setShowVideo: (show: boolean) => void;
  setShowQueueModal: (show: boolean) => void;
  toggleTrackLikeInPlayer: (trackId: number) => Promise<void>;
  playbackSource: "youtube" | "preview";
}

const PlayerContext = createContext<PlayerContextType | null>(null);

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<TrackItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [queue, setQueue] = useState<TrackItem[]>([]);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [playbackSource, setPlaybackSource] = useState<"youtube" | "preview">("youtube");

  const ytPlayerRef = useRef<any>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize YouTube API script once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      initYouTubePlayer();
    };

    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const initYouTubePlayer = () => {
    const el = document.getElementById("duo-yt-iframe-player");
    if (!el || ytPlayerRef.current) return;

    try {
      ytPlayerRef.current = new window.YT.Player("duo-yt-iframe-player", {
        height: "100%",
        width: "100%",
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              handleTrackEnded();
            }
          },
        },
      });
    } catch (e) {
      console.error("Error creating YouTube player:", e);
    }
  };

  // Progress polling interval
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playbackSource === "youtube" && ytPlayerRef.current?.getCurrentTime) {
          try {
            const current = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || (currentTrack?.durationSeconds || 0);
            setProgress(current);
            if (dur > 0) setDuration(dur);
          } catch (e) {
            // Ignore cross-origin error during load
          }
        } else if (playbackSource === "preview" && htmlAudioRef.current) {
          setProgress(htmlAudioRef.current.currentTime);
          if (htmlAudioRef.current.duration) {
            setDuration(htmlAudioRef.current.duration);
          }
        }
      }, 500);
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, playbackSource, currentTrack]);

  const handleTrackEnded = () => {
    if (repeatMode === "one") {
      seekTo(0);
      togglePlay();
    } else {
      nextTrack();
    }
  };

  const playTrack = (track: TrackItem, newQueue?: TrackItem[]) => {
    setCurrentTrack(track);
    setProgress(0);

    if (newQueue) {
      // Find current track index
      const idx = newQueue.findIndex((t) => t.id === track.id || t.externalId === track.externalId);
      if (idx !== -1) {
        // Queue is rest of the playlist
        setQueue(newQueue.slice(idx + 1));
      } else {
        setQueue(newQueue);
      }
    }

    // Estratégia de reprodução:
    // 1) youtubeVideoId  → toca o vídeo oficial (faixa completa)
    // 2) sem videoId     → busca automática no YouTube via IFrame (listType=search)
    // 3) sem YouTube     → preview oficial do Spotify (30s) em <audio>
    const ytPlayer = ytPlayerRef.current;
    const ytReady = Boolean(ytPlayer?.loadVideoById || ytPlayer?.cuePlaylist);

    const startYoutube = (player: any) => {
      try {
        if (track.youtubeVideoId) {
          player.loadVideoById(track.youtubeVideoId);
        } else {
          // Fallback poderoso: pede ao IFrame para buscar a faixa no YouTube
          player.loadPlaylist({
            listType: "search",
            list: `${track.artist} ${track.title} official audio`,
          });
        }
        player.playVideo?.();
        setIsPlaying(true);
      } catch (e) {
        console.error("Falha ao iniciar reprodução no YouTube", e);
      }
    };

    if (ytReady) {
      setPlaybackSource("youtube");
      if (htmlAudioRef.current) htmlAudioRef.current.pause();
      startYoutube(ytPlayer);
    } else if (!track.previewUrl) {
      // Player ainda não carregou: tenta inicializar e repete em seguida
      setPlaybackSource("youtube");
      initYouTubePlayer();
      setTimeout(() => {
        if (ytPlayerRef.current?.loadVideoById || ytPlayerRef.current?.cuePlaylist) {
          startYoutube(ytPlayerRef.current);
        }
      }, 900);
    } else if (track.previewUrl) {
      setPlaybackSource("preview");
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.src = track.previewUrl;
        htmlAudioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;

    if (isPlaying) {
      if (playbackSource === "youtube" && ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      } else if (playbackSource === "preview" && htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (playbackSource === "youtube" && ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
      } else if (playbackSource === "preview" && htmlAudioRef.current) {
        htmlAudioRef.current.play();
      }
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    setProgress(seconds);
    if (playbackSource === "youtube" && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(seconds, true);
    } else if (playbackSource === "preview" && htmlAudioRef.current) {
      htmlAudioRef.current.currentTime = seconds;
    }
  };

  const setVolume = (val: number) => {
    setVolumeState(val);
    setIsMuted(val === 0);
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(val);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = val / 100;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(volume || 50);
    } else {
      setIsMuted(true);
      if (ytPlayerRef.current?.mute) ytPlayerRef.current.mute();
      if (htmlAudioRef.current) htmlAudioRef.current.muted = true;
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    let next: TrackItem;
    let remainingQueue = [...queue];

    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * queue.length);
      next = queue[randIdx];
      remainingQueue.splice(randIdx, 1);
    } else {
      next = queue[0];
      remainingQueue.shift();
    }

    setQueue(remainingQueue);
    playTrack(next);
  };

  const prevTrack = () => {
    if (progress > 3) {
      seekTo(0);
    } else {
      // Repeat current track from start
      seekTo(0);
    }
  };

  const addToQueue = (track: TrackItem) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const toggleTrackLikeInPlayer = async (trackId: number) => {
    try {
      const res = await fetch("/api/tracks/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (data.success && currentTrack && currentTrack.id === trackId) {
        setCurrentTrack({ ...currentTrack, isLiked: data.isLiked });
      }
    } catch (e) {
      console.error("Error toggling like in player", e);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration: duration || currentTrack?.durationSeconds || 180,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        showVideo,
        showQueueModal,
        playTrack,
        togglePlay,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        nextTrack,
        prevTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setShowVideo,
        setShowQueueModal,
        toggleTrackLikeInPlayer,
        playbackSource,
      }}
    >
      {children}
      {/* Hidden/Popout YouTube IFrame Video element */}
      <div
        className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black ${
          showVideo
            ? "bottom-36 md:bottom-28 right-4 md:right-6 w-72 sm:w-80 md:w-96 aspect-video opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-90 w-1 h-1 bottom-0 right-0"
        }`}
      >
        <div className="relative w-full h-full bg-black">
          <div id="duo-yt-iframe-player" className="w-full h-full" />
          {showVideo && (
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-10"
              title="Fechar vídeo (áudio continuará tocando)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Hidden HTML5 Audio Element for previews */}
      <audio
        ref={htmlAudioRef}
        onEnded={handleTrackEnded}
        className="hidden"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return context;
}
