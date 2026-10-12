import { db } from "@/db";
import { connectedAccounts, playlists, tracks } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureSession } from "./syncService";
import { parseIsoDuration, searchYoutubeVideoId } from "./youtubeMatch";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export interface SyncReport {
  platform: "spotify" | "youtube";
  accountId: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  playlists: number;
  tracks: number;
  liked: number;
  warnings: string[];
}

/** Remove todos os dados de uma plataforma para a sessão antes de re-sincronizar. */
export async function clearPlatformData(sessionId: string, platform: "spotify" | "youtube") {
  const existing = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.sessionId, sessionId), eq(playlists.platform, platform)));

  if (existing.length > 0) {
    await db.delete(tracks).where(inArray(tracks.playlistId, existing.map((p) => p.id)));
    await db.delete(playlists).where(inArray(playlists.id, existing.map((p) => p.id)));
  }

  await db
    .delete(tracks)
    .where(and(eq(tracks.sessionId, sessionId), eq(tracks.platform, platform)));
}

async function upsertAccount(
  sessionId: string,
  platform: "spotify" | "youtube",
  data: {
    accountId: string | null;
    displayName: string;
    email?: string | null;
    avatarUrl?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    scopes?: string | null;
    product?: string | null;
    country?: string | null;
    followers?: number;
    rawProfile?: unknown;
  }
) {
  const existing = await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, platform)))
    .limit(1);

  const payload = {
    accountId: data.accountId,
    displayName: data.displayName,
    email: data.email ?? null,
    avatarUrl: data.avatarUrl ?? null,
    accessToken: data.accessToken ?? null,
    refreshToken: data.refreshToken ?? existing[0]?.refreshToken ?? null,
    expiresAt: data.expiresAt ?? null,
    scopes: data.scopes ?? null,
    product: data.product ?? null,
    country: data.country ?? null,
    followers: data.followers ?? 0,
    rawProfile: (data.rawProfile ?? null) as never,
    isConnected: true,
    syncStatus: "syncing" as const,
    lastError: null,
    lastSyncedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(connectedAccounts).set(payload).where(eq(connectedAccounts.id, existing[0].id));
    return existing[0].id;
  }

  const [created] = await db
    .insert(connectedAccounts)
    .values({ sessionId, platform, ...payload })
    .returning({ id: connectedAccounts.id });
  return created?.id ?? null;
}

async function markSynced(sessionId: string, platform: "spotify" | "youtube", count: number, error?: string) {
  await db
    .update(connectedAccounts)
    .set({
      syncStatus: error ? "error" : "synced",
      itemCount: count,
      lastError: error ?? null,
      lastSyncedAt: new Date(),
    })
    .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, platform)));
}

async function insertPlaylist(
  sessionId: string,
  platform: "spotify" | "youtube",
  data: {
    externalId: string | null;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    owner?: string | null;
    trackCount?: number;
    isPublic?: boolean;
    kind?: string;
    externalUrl?: string | null;
  }
) {
  const [row] = await db
    .insert(playlists)
    .values({
      sessionId,
      platform,
      externalId: data.externalId,
      title: data.title,
      description: data.description ?? null,
      coverUrl: data.coverUrl ?? null,
      owner: data.owner ?? null,
      trackCount: data.trackCount ?? 0,
      isPublic: data.isPublic ?? true,
      kind: data.kind ?? "user",
      externalUrl: data.externalUrl ?? null,
    })
    .returning({ id: playlists.id });
  return row.id;
}

/* ------------------------------------------------------------------ */
/*  SPOTIFY                                                            */
/* ------------------------------------------------------------------ */

const SPOTIFY_API = "https://api.spotify.com/v1";

async function spotifyFetch(path: string, token: string, warnings: string[]): Promise<any> {
  try {
    const res = await fetch(`${SPOTIFY_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      warnings.push(`Spotify ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    warnings.push(`Spotify ${path} → ${e?.message || "erro de rede"}`);
    return null;
  }
}

function mapSpotifyTrack(t: any) {
  if (!t || !t.id) return null;
  return {
    externalId: t.id as string,
    title: t.name as string,
    artist: (t.artists || []).map((a: any) => a.name).join(", ") || "Artista desconhecido",
    album: t.album?.name ?? null,
    durationSeconds: Math.round((t.duration_ms || 0) / 1000),
    thumbnailUrl: t.album?.images?.[0]?.url ?? null,
    previewUrl: t.preview_url ?? null,
    spotifyUri: t.uri ?? null,
    externalUrl: t.external_urls?.spotify ?? null,
    explicit: Boolean(t.explicit),
    youtubeVideoId: null as string | null,
  };
}

/**
 * Sincroniza TUDO do usuário logado no Spotify:
 * perfil (ID, e-mail, foto, plano, país, seguidores), playlists (com paginação),
 * faixas de cada playlist, músicas curtidas, top faixas e tocadas recentemente.
 */
export async function syncSpotifyAccount(
  sessionId: string,
  accessToken: string,
  refreshToken: string | null,
  opts?: {
    autoMatchYoutube?: boolean;
    youtubeApiKey?: string | null;
    maxTracksPerPlaylist?: number;
    expiresInSeconds?: number;
  }
): Promise<SyncReport> {
  await ensureSession(sessionId);
  const warnings: string[] = [];
  const autoMatch = opts?.autoMatchYoutube ?? true;
  const maxPerPlaylist = opts?.maxTracksPerPlaylist ?? 100;
  const expiresInSeconds = opts?.expiresInSeconds && opts.expiresInSeconds > 0 ? opts.expiresInSeconds : 3600;

  // 1. Perfil do usuário — aqui pegamos o ID real da conta Spotify
  const me = await spotifyFetch("/me", accessToken, warnings);
  if (!me) {
    throw new Error("Não foi possível ler o perfil do Spotify. Token inválido ou escopo user-read-private ausente.");
  }

  const accountId: string = me.id;
  await upsertAccount(sessionId, "spotify", {
    accountId,
    displayName: me.display_name || me.id,
    email: me.email ?? null,
    avatarUrl: me.images?.[0]?.url ?? null,
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    scopes: me.scopes ?? null,
    product: me.product ?? null,
    country: me.country ?? null,
    followers: me.followers?.total ?? 0,
    rawProfile: me,
  });

  await clearPlatformData(sessionId, "spotify");

  let trackCount = 0;
  let playlistCount = 0;
  let likedCount = 0;

  const saveTracks = async (playlistId: number, list: ReturnType<typeof mapSpotifyTrack>[]) => {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (!t) continue;

      // Auto-match: encontra o vídeo oficial no YouTube para tocar a faixa completa
      if (autoMatch && !t.youtubeVideoId) {
        const match = await searchYoutubeVideoId(`${t.artist} - ${t.title}`, opts?.youtubeApiKey ?? null);
        if (match) t.youtubeVideoId = match;
      }

      await db.insert(tracks).values({
        sessionId,
        playlistId,
        platform: "spotify",
        externalId: t.externalId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        durationSeconds: t.durationSeconds,
        thumbnailUrl: t.thumbnailUrl,
        previewUrl: t.previewUrl,
        spotifyUri: t.spotifyUri,
        externalUrl: t.externalUrl,
        explicit: t.explicit,
        youtubeVideoId: t.youtubeVideoId,
        matchSource: t.youtubeVideoId ? "auto" : null,
        position: i,
      });
      trackCount++;
    }
  };

  // 2. Músicas curtidas (Liked Songs)
  const liked = await spotifyFetch("/me/tracks?limit=50", accessToken, warnings);
  if (liked?.items?.length) {
    const likedId = await insertPlaylist(sessionId, "spotify", {
      externalId: `liked-${accountId}`,
      title: "Músicas Curtidas (Spotify)",
      description: "Suas faixas favoritadas na biblioteca do Spotify.",
      coverUrl: liked.items[0]?.track?.album?.images?.[0]?.url ?? null,
      owner: me.display_name || accountId,
      trackCount: liked.total ?? liked.items.length,
      kind: "liked",
      externalUrl: "https://open.spotify.com/collection/tracks",
    });
    await saveTracks(likedId, liked.items.map((i: any) => mapSpotifyTrack(i.track)));
    likedCount = liked.items.length;
    playlistCount++;
  }

  // 3. Top faixas do usuário
  const top = await spotifyFetch("/me/top/tracks?limit=20&time_range=medium_term", accessToken, warnings);
  if (top?.items?.length) {
    const topId = await insertPlaylist(sessionId, "spotify", {
      externalId: `top-${accountId}`,
      title: "Minhas Mais Tocadas (Spotify)",
      description: "As faixas que você mais ouviu no Spotify (últimos 6 meses).",
      coverUrl: top.items[0]?.album?.images?.[0]?.url ?? null,
      owner: me.display_name || accountId,
      trackCount: top.items.length,
      kind: "top",
    });
    await saveTracks(topId, top.items.map(mapSpotifyTrack));
    playlistCount++;
  }

  // 4. Tocadas recentemente
  const recent = await spotifyFetch("/me/player/recently-played?limit=25", accessToken, warnings);
  if (recent?.items?.length) {
    const recentId = await insertPlaylist(sessionId, "spotify", {
      externalId: `recent-${accountId}`,
      title: "Tocadas Recentemente (Spotify)",
      description: "Histórico das últimas faixas reproduzidas na sua conta.",
      coverUrl: recent.items[0]?.track?.album?.images?.[0]?.url ?? null,
      owner: me.display_name || accountId,
      trackCount: recent.items.length,
      kind: "recent",
    });
    await saveTracks(recentId, recent.items.map((i: any) => mapSpotifyTrack(i.track)));
    playlistCount++;
  }

  // 5. Playlists do usuário (com paginação completa)
  let plUrl: string | null = "/me/playlists?limit=50";
  const allPlaylists: any[] = [];
  let guard = 0;
  while (plUrl && guard < 10) {
    const page = await spotifyFetch(plUrl, accessToken, warnings);
    if (!page) break;
    allPlaylists.push(...(page.items || []));
    plUrl = page.next ? page.next.replace(SPOTIFY_API, "") : null;
    guard++;
  }

  for (const pl of allPlaylists) {
    const playlistId = await insertPlaylist(sessionId, "spotify", {
      externalId: pl.id,
      title: pl.name || "Playlist sem nome",
      description: pl.description || null,
      coverUrl: pl.images?.[0]?.url ?? null,
      owner: pl.owner?.display_name ?? me.display_name ?? accountId,
      trackCount: pl.tracks?.total ?? 0,
      isPublic: pl.public ?? true,
      kind: "user",
      externalUrl: pl.external_urls?.spotify ?? null,
    });
    playlistCount++;

    let trUrl: string | null = `/playlists/${pl.id}/tracks?limit=${Math.min(maxPerPlaylist, 100)}`;
    let pageGuard = 0;
    let fetched = 0;
    while (trUrl && pageGuard < 5 && fetched < maxPerPlaylist) {
      const page = await spotifyFetch(trUrl, accessToken, warnings);
      if (!page) break;
      const mapped = (page.items || []).map((i: any) => mapSpotifyTrack(i.track)).filter(Boolean);
      await saveTracks(playlistId, mapped);
      fetched += mapped.length;
      trUrl = page.next && fetched < maxPerPlaylist ? page.next.replace(SPOTIFY_API, "") : null;
      pageGuard++;
    }
  }

  await markSynced(sessionId, "spotify", trackCount);

  return {
    platform: "spotify",
    accountId,
    displayName: me.display_name || accountId,
    email: me.email ?? null,
    avatarUrl: me.images?.[0]?.url ?? null,
    playlists: playlistCount,
    tracks: trackCount,
    liked: likedCount,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  YOUTUBE MUSIC / GOOGLE                                             */
/* ------------------------------------------------------------------ */

const YT_API = "https://www.googleapis.com/youtube/v3";
const FALLBACK_COVER = "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80";

async function ytFetch(path: string, token: string, warnings: string[]): Promise<any> {
  try {
    const res = await fetch(`${YT_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      warnings.push(`YouTube ${path.split("?")[0]} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    warnings.push(`YouTube ${path.split("?")[0]} → ${e?.message || "erro de rede"}`);
    return null;
  }
}

/**
 * Sincroniza TUDO do usuário logado no Google/YouTube:
 * channel ID, e-mail, foto, playlists próprias, "Músicas curtidas" (LL<channelId>),
 * uploads e as faixas de cada playlist com duração real via /videos.
 */
export async function syncYoutubeAccount(
  sessionId: string,
  accessToken: string,
  refreshToken: string | null,
  opts?: { expiresInSeconds?: number }
): Promise<SyncReport> {
  await ensureSession(sessionId);
  const warnings: string[] = [];

  // 1. Perfil Google
  let profile: any = null;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) profile = await res.json();
    else warnings.push(`Google userinfo → HTTP ${res.status}`);
  } catch (e: any) {
    warnings.push(`Google userinfo → ${e?.message || "erro de rede"}`);
  }

  // 2. Canal do YouTube (aqui pegamos o channelId real — necessário para a playlist de curtidas)
  const channelPage = await ytFetch(
    "/channels?part=snippet,contentDetails,statistics&mine=true&maxResults=1",
    accessToken,
    warnings
  );
  const channel = channelPage?.items?.[0];
  const channelId: string | null = channel?.id ?? profile?.sub ?? null;
  const displayName = channel?.snippet?.title || profile?.name || "Usuário YouTube Music";
  const avatarUrl = channel?.snippet?.thumbnails?.default?.url || profile?.picture || null;
  const email = profile?.email ?? null;
  const likesPlaylistId: string | null = channel?.contentDetails?.relatedPlaylists?.likes ?? null;
  const uploadsPlaylistId: string | null = channel?.contentDetails?.relatedPlaylists?.uploads ?? null;

  if (!channelId) {
    throw new Error("Não foi possível obter o channelId do YouTube. Autorize o escopo youtube.readonly.");
  }

  const youtubeExpiresIn =
    opts?.expiresInSeconds && opts.expiresInSeconds > 0 ? opts.expiresInSeconds : 3600;

  await upsertAccount(sessionId, "youtube", {
    accountId: channelId,
    displayName,
    email,
    avatarUrl,
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + youtubeExpiresIn * 1000),
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
    followers: Number(channel?.statistics?.subscriberCount ?? 0),
    rawProfile: { channel, googleProfile: profile },
  });

  await clearPlatformData(sessionId, "youtube");

  let trackCount = 0;
  let playlistCount = 0;
  let likedCount = 0;

  /** Busca os metadados (duração real + thumbnail) de um lote de videoIds. */
  const fetchVideoMeta = async (videoIds: string[]) => {
    const out = new Map<string, { durationSeconds: number; thumbnailUrl: string | null; artist: string }>();
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const data = await ytFetch(
        `/videos?part=contentDetails,snippet&id=${batch.join(",")}`,
        accessToken,
        warnings
      );
      for (const v of data?.items || []) {
        out.set(v.id, {
          durationSeconds: parseIsoDuration(v.contentDetails?.duration),
          thumbnailUrl:
            v.snippet?.thumbnails?.medium?.url ||
            v.snippet?.thumbnails?.default?.url ||
            null,
          artist: v.snippet?.channelTitle || displayName,
        });
      }
    }
    return out;
  };

  const savePlaylistTracks = async (
    playlistRowId: number,
    remotePlaylistId: string,
    max: number
  ) => {
    const collected: any[] = [];
    let pageToken: string | undefined;
    let guard = 0;

    while (guard < 6 && collected.length < max) {
      const url =
        `/playlistItems?part=snippet,contentDetails&playlistId=${remotePlaylistId}&maxResults=50` +
        (pageToken ? `&pageToken=${pageToken}` : "");
      const page = await ytFetch(url, accessToken, warnings);
      if (!page) break;
      collected.push(...(page.items || []));
      pageToken = page.nextPageToken;
      guard++;
      if (!pageToken) break;
    }

    const items = collected.slice(0, max);
    const videoIds = items
      .map((i) => i.contentDetails?.videoId || i.snippet?.resourceId?.videoId)
      .filter(Boolean);

    const meta = await fetchVideoMeta(videoIds);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      const sn = item.snippet || {};
      const m = meta.get(videoId);

      await db.insert(tracks).values({
        sessionId,
        playlistId: playlistRowId,
        platform: "youtube",
        externalId: videoId,
        title: sn.title || "Vídeo do YouTube",
        artist: m?.artist || sn.videoOwnerChannelTitle || sn.channelTitle || displayName,
        album: null,
        durationSeconds: m?.durationSeconds ?? 0,
        thumbnailUrl:
          m?.thumbnailUrl ||
          sn.thumbnails?.medium?.url ||
          sn.thumbnails?.default?.url ||
          null,
        youtubeVideoId: videoId,
        externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        matchSource: "native",
        position: i,
      });
      trackCount++;
    }

    return items.length;
  };

  // 3. Músicas curtidas do YouTube (playlist "LL" do canal)
  if (likesPlaylistId) {
    const rowId = await insertPlaylist(sessionId, "youtube", {
      externalId: likesPlaylistId,
      title: "Músicas Curtidas (YouTube Music)",
      description: "Vídeos e faixas que você marcou com joinha no YouTube.",
      coverUrl: avatarUrl || FALLBACK_COVER,
      owner: displayName,
      kind: "liked",
      externalUrl: "https://music.youtube.com/library/liked",
    });
    const n = await savePlaylistTracks(rowId, likesPlaylistId, 100);
    likedCount = n;
    playlistCount++;
  }

  // 4. Playlists criadas pelo usuário (paginação completa)
  let nextPage: string | undefined;
  const allPlaylists: any[] = [];
  let guard = 0;
  while (guard < 6) {
    const url =
      "/playlists?part=snippet,contentDetails&mine=true&maxResults=50" +
      (nextPage ? `&pageToken=${nextPage}` : "");
    const page = await ytFetch(url, accessToken, warnings);
    if (!page) break;
    allPlaylists.push(...(page.items || []));
    nextPage = page.nextPageToken;
    guard++;
    if (!nextPage) break;
  }

  for (const pl of allPlaylists) {
    if (pl.id === likesPlaylistId || pl.id === uploadsPlaylistId) continue;
    const sn = pl.snippet || {};
    const rowId = await insertPlaylist(sessionId, "youtube", {
      externalId: pl.id,
      title: sn.title || "Playlist YouTube",
      description: sn.description || null,
      coverUrl:
        sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || FALLBACK_COVER,
      owner: sn.channelTitle || displayName,
      trackCount: pl.contentDetails?.itemCount ?? 0,
      kind: "user",
      externalUrl: `https://www.youtube.com/playlist?list=${pl.id}`,
    });
    playlistCount++;
    await savePlaylistTracks(rowId, pl.id, 100);
  }

  // 5. Uploads do canal (opcional, mas útil para artistas)
  if (uploadsPlaylistId && allPlaylists.length === 0) {
    const rowId = await insertPlaylist(sessionId, "youtube", {
      externalId: uploadsPlaylistId,
      title: "Uploads do Canal (YouTube)",
      description: "Vídeos enviados pelo seu canal do YouTube.",
      coverUrl: avatarUrl || FALLBACK_COVER,
      owner: displayName,
      kind: "uploads",
      externalUrl: `https://www.youtube.com/playlist?list=${uploadsPlaylistId}`,
    });
    await savePlaylistTracks(rowId, uploadsPlaylistId, 50);
    playlistCount++;
  }

  await markSynced(sessionId, "youtube", trackCount);

  return {
    platform: "youtube",
    accountId: channelId,
    displayName,
    email,
    avatarUrl,
    playlists: playlistCount,
    tracks: trackCount,
    liked: likedCount,
    warnings,
  };
}
