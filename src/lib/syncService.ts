import { db } from "@/db";
import { connectedAccounts, playlists, tracks, userSessions } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { SPOTIFY_DEMO_PLAYLISTS, YOUTUBE_DEMO_PLAYLISTS, CATALOG_SEARCH_INDEX } from "./mockData";

export async function ensureSession(sessionId: string) {
  const existing = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, sessionId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userSessions).values({
      id: sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getAccounts(sessionId: string) {
  await ensureSession(sessionId);
  const rows = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, sessionId));

  const spotify = rows.find((r) => r.platform === "spotify") || null;
  const youtube = rows.find((r) => r.platform === "youtube") || null;

  return {
    spotify,
    youtube,
    bothConnected: Boolean(spotify?.isConnected && youtube?.isConnected),
    anyConnected: Boolean(spotify?.isConnected || youtube?.isConnected),
  };
}

export async function connectDemoPlatform(sessionId: string, platform: "spotify" | "youtube") {
  await ensureSession(sessionId);

  const isSpotify = platform === "spotify";
  const displayName = isSpotify ? "Gabriel Silva (Spotify)" : "Gabriel S. (YouTube Music)";
  const email = isSpotify ? "gabriel.spotify@exemplo.com" : "gabriel.yt@gmail.com";
  const avatarUrl = isSpotify
    ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
    : "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80";

  // Check if account already exists
  const existingAccount = await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, platform)))
    .limit(1);

  // Delete existing demo playlists and tracks for this platform before re-populating
  const existingPls = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.sessionId, sessionId), eq(playlists.platform, platform)));

  if (existingPls.length > 0) {
    const plIds = existingPls.map((p) => p.id);
    await db.delete(tracks).where(inArray(tracks.playlistId, plIds));
    await db.delete(playlists).where(and(eq(playlists.sessionId, sessionId), eq(playlists.platform, platform)));
  }

  // Also clean up loose tracks from this platform
  await db
    .delete(tracks)
    .where(and(eq(tracks.sessionId, sessionId), eq(tracks.platform, platform)));

  const demoPlaylists = isSpotify ? SPOTIFY_DEMO_PLAYLISTS : YOUTUBE_DEMO_PLAYLISTS;
  let totalTracksCount = 0;

  // Insert playlists and tracks
  for (const pl of demoPlaylists) {
    const [insertedPl] = await db
      .insert(playlists)
      .values({
        sessionId,
        platform,
        externalId: pl.externalId,
        title: pl.title,
        description: pl.description,
        coverUrl: pl.coverUrl,
        trackCount: pl.tracks.length,
        isPublic: true,
      })
      .returning({ id: playlists.id });

    if (insertedPl) {
      for (let i = 0; i < pl.tracks.length; i++) {
        const tr = pl.tracks[i];
        totalTracksCount++;
        await db.insert(tracks).values({
          sessionId,
          playlistId: insertedPl.id,
          platform,
          externalId: tr.externalId,
          title: tr.title,
          artist: tr.artist,
          album: tr.album,
          durationSeconds: tr.durationSeconds,
          thumbnailUrl: tr.thumbnailUrl,
          previewUrl: tr.previewUrl || null,
          youtubeVideoId: tr.youtubeVideoId,
          spotifyUri: tr.spotifyUri || null,
          isLiked: tr.isLiked ?? false,
          position: i,
        });
      }
    }
  }

  if (existingAccount.length > 0) {
    await db
      .update(connectedAccounts)
      .set({
        isConnected: true,
        displayName,
        email,
        avatarUrl,
        itemCount: totalTracksCount,
        lastSyncedAt: new Date(),
        syncStatus: "synced",
      })
      .where(eq(connectedAccounts.id, existingAccount[0].id));
  } else {
    await db.insert(connectedAccounts).values({
      sessionId,
      platform,
      accountId: `${platform}_user_${sessionId.slice(0, 6)}`,
      displayName,
      email,
      avatarUrl,
      isConnected: true,
      itemCount: totalTracksCount,
      syncStatus: "synced",
      lastSyncedAt: new Date(),
    });
  }

  return { success: true, count: totalTracksCount };
}

export async function disconnectPlatform(sessionId: string, platform: "spotify" | "youtube") {
  await db
    .update(connectedAccounts)
    .set({
      isConnected: false,
      syncStatus: "pending",
      lastSyncedAt: new Date(),
    })
    .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, platform)));

  // Remove playlists and tracks belonging exclusively to this platform
  const existingPls = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.sessionId, sessionId), eq(playlists.platform, platform)));

  if (existingPls.length > 0) {
    const plIds = existingPls.map((p) => p.id);
    await db.delete(tracks).where(inArray(tracks.playlistId, plIds));
    await db.delete(playlists).where(and(eq(playlists.sessionId, sessionId), eq(playlists.platform, platform)));
  }

  await db
    .delete(tracks)
    .where(and(eq(tracks.sessionId, sessionId), eq(tracks.platform, platform)));

  return { success: true };
}

export async function getPlaylists(sessionId: string, platformFilter?: "spotify" | "youtube" | "hybrid" | "all") {
  await ensureSession(sessionId);

  let query = db.select().from(playlists).where(eq(playlists.sessionId, sessionId)).orderBy(desc(playlists.createdAt));

  const allPlaylists = await query;
  if (platformFilter && platformFilter !== "all") {
    return allPlaylists.filter((p) => p.platform === platformFilter);
  }
  return allPlaylists;
}

export async function getPlaylistDetail(sessionId: string, playlistId: number) {
  await ensureSession(sessionId);

  const playlistRows = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.sessionId, sessionId), eq(playlists.id, playlistId)))
    .limit(1);

  if (playlistRows.length === 0) return null;
  const playlist = playlistRows[0];

  const trackRows = await db
    .select()
    .from(tracks)
    .where(and(eq(tracks.sessionId, sessionId), eq(tracks.playlistId, playlistId)))
    .orderBy(tracks.position, desc(tracks.addedAt));

  return {
    playlist,
    tracks: trackRows,
  };
}

export async function getLikedTracks(sessionId: string, platformFilter?: "spotify" | "youtube" | "all") {
  await ensureSession(sessionId);

  let condition = and(eq(tracks.sessionId, sessionId), eq(tracks.isLiked, true));

  if (platformFilter && platformFilter !== "all") {
    condition = and(condition, eq(tracks.platform, platformFilter));
  }

  return await db.select().from(tracks).where(condition).orderBy(desc(tracks.addedAt));
}

export async function toggleTrackLiked(sessionId: string, trackId: number) {
  const existing = await db
    .select()
    .from(tracks)
    .where(and(eq(tracks.sessionId, sessionId), eq(tracks.id, trackId)))
    .limit(1);

  if (existing.length === 0) return null;

  const nextLiked = !existing[0].isLiked;
  await db
    .update(tracks)
    .set({ isLiked: nextLiked })
    .where(eq(tracks.id, trackId));

  return { id: trackId, isLiked: nextLiked };
}

export async function createHybridPlaylist(
  sessionId: string,
  title: string,
  description: string,
  trackIds: number[]
) {
  await ensureSession(sessionId);

  const coverUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80";

  const [newPlaylist] = await db
    .insert(playlists)
    .values({
      sessionId,
      platform: "hybrid",
      title,
      description,
      coverUrl,
      trackCount: trackIds.length,
      isPublic: true,
    })
    .returning();

  if (newPlaylist && trackIds.length > 0) {
    const selectedTracks = await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.sessionId, sessionId), inArray(tracks.id, trackIds)));

    for (let i = 0; i < selectedTracks.length; i++) {
      const src = selectedTracks[i];
      await db.insert(tracks).values({
        sessionId,
        playlistId: newPlaylist.id,
        platform: src.platform,
        externalId: src.externalId + "_hyb_" + Date.now(),
        title: src.title,
        artist: src.artist,
        album: src.album,
        durationSeconds: src.durationSeconds,
        thumbnailUrl: src.thumbnailUrl,
        previewUrl: src.previewUrl,
        youtubeVideoId: src.youtubeVideoId,
        spotifyUri: src.spotifyUri,
        isLiked: src.isLiked,
        position: i,
      });
    }
  }

  return newPlaylist;
}

export async function clonePlaylistToPlatform(
  sessionId: string,
  playlistId: number,
  targetPlatform: "spotify" | "youtube" | "hybrid"
) {
  const detail = await getPlaylistDetail(sessionId, playlistId);
  if (!detail) return null;

  const targetTitle = `${detail.playlist.title} (Copiada para ${
    targetPlatform === "spotify" ? "Spotify" : targetPlatform === "youtube" ? "YouTube Music" : "Híbrida"
  })`;

  const [newPlaylist] = await db
    .insert(playlists)
    .values({
      sessionId,
      platform: targetPlatform,
      title: targetTitle,
      description: `Migrada / Sincronizada a partir de ${detail.playlist.platform.toUpperCase()}: ${detail.playlist.description || ""}`,
      coverUrl: detail.playlist.coverUrl,
      trackCount: detail.tracks.length,
      isPublic: true,
    })
    .returning();

  for (let i = 0; i < detail.tracks.length; i++) {
    const tr = detail.tracks[i];
    await db.insert(tracks).values({
      sessionId,
      playlistId: newPlaylist.id,
      platform: targetPlatform === "hybrid" ? tr.platform : targetPlatform,
      externalId: `${targetPlatform}_${tr.externalId}_${Date.now()}`,
      title: tr.title,
      artist: tr.artist,
      album: tr.album,
      durationSeconds: tr.durationSeconds,
      thumbnailUrl: tr.thumbnailUrl,
      previewUrl: tr.previewUrl,
      youtubeVideoId: tr.youtubeVideoId,
      spotifyUri: tr.spotifyUri,
      isLiked: tr.isLiked,
      position: i,
    });
  }

  return newPlaylist;
}

export async function searchTracksAndPlaylists(
  sessionId: string,
  query: string,
  platformFilter: "all" | "spotify" | "youtube" = "all",
  categoryFilter: "all" | "tracks" | "playlists" = "all"
) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { tracks: [], playlists: [] };
  }

  // 1. Search database tracks
  const allDbTracks = await db
    .select()
    .from(tracks)
    .where(eq(tracks.sessionId, sessionId));

  // 2. Also search mock catalog index
  const catalogMatches = CATALOG_SEARCH_INDEX.filter((t) => {
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album && t.album.toLowerCase().includes(q))
    );
  });

  // Combine and deduplicate
  const combinedTracksMap = new Map<string, any>();

  // Add db tracks matching
  for (const t of allDbTracks) {
    if (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album && t.album.toLowerCase().includes(q))
    ) {
      if (platformFilter === "all" || t.platform === platformFilter) {
        combinedTracksMap.set(`${t.platform}_${t.title}_${t.artist}`.toLowerCase(), t);
      }
    }
  }

  // Add catalog matches
  for (const c of catalogMatches) {
    if (platformFilter === "all" || c.platform === platformFilter) {
      const key = `${c.platform}_${c.title}_${c.artist}`.toLowerCase();
      if (!combinedTracksMap.has(key)) {
        combinedTracksMap.set(key, {
          id: -Math.floor(Math.random() * 100000) - 1, // temporary mock id
          sessionId,
          playlistId: null,
          platform: c.platform,
          externalId: c.externalId,
          title: c.title,
          artist: c.artist,
          album: c.album,
          durationSeconds: c.durationSeconds,
          thumbnailUrl: c.thumbnailUrl,
          previewUrl: c.previewUrl || null,
          youtubeVideoId: c.youtubeVideoId,
          spotifyUri: c.spotifyUri || null,
          isLiked: c.isLiked ?? false,
          playsCount: 0,
          position: 0,
        });
      }
    }
  }

  // 3. Search playlists
  const allDbPlaylists = await db
    .select()
    .from(playlists)
    .where(eq(playlists.sessionId, sessionId));

  const matchedPlaylists = allDbPlaylists.filter((p) => {
    const matchText = p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
    const matchPlatform = platformFilter === "all" || p.platform === platformFilter;
    return matchText && matchPlatform;
  });

  const finalTracks = categoryFilter === "playlists" ? [] : Array.from(combinedTracksMap.values());
  const finalPlaylists = categoryFilter === "tracks" ? [] : matchedPlaylists;

  return {
    tracks: finalTracks,
    playlists: finalPlaylists,
  };
}
