import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  appUsers,
  connectedAccounts,
  playlists,
  searchHistory,
  tracks,
  userSessions,
} from "@/db/schema";
import { getSessionId } from "@/lib/session";
import { DEV_CREDENTIALS_KEY, isDevConsoleEnabled } from "@/lib/credentials";
import { connectDemoPlatform, ensureSession } from "@/lib/syncService";
import { clearPlatformData } from "@/lib/platformSync";

export const dynamic = "force-dynamic";

function blocked() {
  return NextResponse.json({ success: false, error: "Console Dev desabilitado" }, { status: 403 });
}

/**
 * GET /api/dev/db
 * Inspeciona o banco local: contagens globais, contas conectadas, playlists e faixas da sessão.
 * Query: ?limit=50
 */
export async function GET(req: Request) {
  if (!isDevConsoleEnabled()) return blocked();

  const sessionId = await getSessionId();
  await ensureSession(sessionId);
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 500);

  const [countRes] = await db
    .select({
      sessions: sql<number>`(select count(*)::int from user_sessions)`,
      accounts: sql<number>`(select count(*)::int from connected_accounts)`,
      playlists: sql<number>`(select count(*)::int from playlists)`,
      tracks: sql<number>`(select count(*)::int from tracks)`,
      searches: sql<number>`(select count(*)::int from search_history)`,
    })
    .from(userSessions)
    .limit(1);

  const sessionAccounts = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, sessionId));

  const sessionPlaylists = await db
    .select()
    .from(playlists)
    .where(eq(playlists.sessionId, sessionId))
    .orderBy(desc(playlists.createdAt))
    .limit(limit);

  const sessionTracks = await db
    .select({
      id: tracks.id,
      platform: tracks.platform,
      externalId: tracks.externalId,
      title: tracks.title,
      artist: tracks.artist,
      album: tracks.album,
      durationSeconds: tracks.durationSeconds,
      youtubeVideoId: tracks.youtubeVideoId,
      spotifyUri: tracks.spotifyUri,
      previewUrl: tracks.previewUrl,
      playlistId: tracks.playlistId,
      matchSource: tracks.matchSource,
      isLiked: tracks.isLiked,
      addedAt: tracks.addedAt,
    })
    .from(tracks)
    .where(eq(tracks.sessionId, sessionId))
    .orderBy(desc(tracks.addedAt))
    .limit(limit);

  const recentSearches = await db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.sessionId, sessionId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(15);

  return NextResponse.json({
    success: true,
    sessionId,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":****@"),
    totals: countRes ?? null,
    accounts: sessionAccounts,
    playlists: sessionPlaylists,
    tracks: sessionTracks,
    recentSearches,
  });
}

/**
 * POST /api/dev/db
 * Rota de desenvolvimento para gravar dados de teste no banco local.
 *
 * body: {
 *   action: "seed-demo" | "insert-track" | "insert-playlist" | "clear-platform" | "wipe-session" | "wipe-all" | "toggle-like",
 *   ...payload
 * }
 */
export async function POST(req: Request) {
  if (!isDevConsoleEnabled()) return blocked();

  const sessionId = await getSessionId();
  const body = await req.json().catch(() => ({}));
  const action: string = body.action;

  try {
    if (action !== "wipe-all") await ensureSession(sessionId);
    switch (action) {
      /* Popula dados de demonstração (playlists + faixas) no banco local */
      case "seed-demo": {
        const platforms: Array<"spotify" | "youtube"> =
          body.platform === "spotify" || body.platform === "youtube"
            ? [body.platform]
            : ["spotify", "youtube"];

        const results = [];
        for (const p of platforms) {
          const r = await connectDemoPlatform(sessionId, p);
          results.push({ platform: p, tracks: r.count });
        }
        return NextResponse.json({ success: true, action, sessionId, results });
      }

      /* Insere uma faixa avulsa direto no banco (ótimo para testar o player) */
      case "insert-track": {
        if (!body.title) {
          return NextResponse.json({ success: false, error: "title é obrigatório" }, { status: 400 });
        }

        const playlistId = body.playlistId ? Number(body.playlistId) : null;

        const [inserted] = await db
          .insert(tracks)
          .values({
            sessionId,
            playlistId,
            platform: body.platform === "youtube" ? "youtube" : "spotify",
            externalId: String(body.externalId || `dev_${Date.now()}`),
            title: String(body.title),
            artist: String(body.artist || "Artista de Teste"),
            album: body.album ? String(body.album) : null,
            durationSeconds: Number(body.durationSeconds) || 210,
            thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
            previewUrl: body.previewUrl ? String(body.previewUrl) : null,
            youtubeVideoId: body.youtubeVideoId ? String(body.youtubeVideoId) : null,
            spotifyUri: body.spotifyUri ? String(body.spotifyUri) : null,
            externalUrl: body.externalUrl ? String(body.externalUrl) : null,
            matchSource: body.youtubeVideoId ? "manual" : null,
            isLiked: Boolean(body.isLiked),
            position: Number(body.position) || 0,
          })
          .returning();

        if (playlistId) {
          const [c] = await db
            .select({ n: sql<number>`count(*)::int` })
            .from(tracks)
            .where(eq(tracks.playlistId, playlistId));
          await db.update(playlists).set({ trackCount: c?.n ?? 0 }).where(eq(playlists.id, playlistId));
        }

        return NextResponse.json({ success: true, action, track: inserted });
      }

      /* Cria uma playlist (spotify / youtube / hybrid) no banco local */
      case "insert-playlist": {
        if (!body.title) {
          return NextResponse.json({ success: false, error: "title é obrigatório" }, { status: 400 });
        }
        const [inserted] = await db
          .insert(playlists)
          .values({
            sessionId,
            platform: ["spotify", "youtube", "hybrid"].includes(body.platform) ? body.platform : "hybrid",
            externalId: body.externalId ? String(body.externalId) : `dev_pl_${Date.now()}`,
            title: String(body.title),
            description: body.description ? String(body.description) : null,
            coverUrl: body.coverUrl ? String(body.coverUrl) : null,
            owner: body.owner ? String(body.owner) : "Dev Console",
            trackCount: 0,
            isPublic: body.isPublic ?? true,
            kind: body.kind ? String(body.kind) : "user",
            externalUrl: body.externalUrl ? String(body.externalUrl) : null,
          })
          .returning();
        return NextResponse.json({ success: true, action, playlist: inserted });
      }

      /* Remove os dados de uma plataforma da sessão */
      case "clear-platform": {
        const platform = body.platform === "youtube" ? "youtube" : "spotify";
        await clearPlatformData(sessionId, platform);
        await db
          .update(connectedAccounts)
          .set({ isConnected: false, syncStatus: "pending", itemCount: 0 })
          .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, platform)));
        return NextResponse.json({ success: true, action, platform });
      }

      /* Limpa apenas a sessão atual */
      case "wipe-session": {
        await db.delete(tracks).where(eq(tracks.sessionId, sessionId));
        await db.delete(playlists).where(eq(playlists.sessionId, sessionId));
        await db.delete(searchHistory).where(eq(searchHistory.sessionId, sessionId));
        await db.delete(connectedAccounts).where(eq(connectedAccounts.sessionId, sessionId));
        if (sessionId !== DEV_CREDENTIALS_KEY) {
          await db.delete(appSettings).where(eq(appSettings.sessionId, sessionId));
        }
        await db.delete(userSessions).where(eq(userSessions.id, sessionId));
        return NextResponse.json({ success: true, action, sessionId });
      }

      /* Limpa TUDO do banco (todas as sessões) — usar com cuidado */
      case "wipe-all": {
        await db.delete(tracks);
        await db.delete(playlists);
        await db.delete(searchHistory);
        await db.delete(connectedAccounts);
        await db.delete(userSessions);
        return NextResponse.json({ success: true, action, message: "Banco local zerado." });
      }

      /* Alterna o like de uma faixa */
      case "toggle-like": {
        const trackId = Number(body.trackId);
        if (!trackId) {
          return NextResponse.json({ success: false, error: "trackId é obrigatório" }, { status: 400 });
        }
        const [row] = await db
          .select()
          .from(tracks)
          .where(and(eq(tracks.id, trackId), eq(tracks.sessionId, sessionId)))
          .limit(1);
        if (!row) {
          return NextResponse.json({ success: false, error: "faixa não encontrada" }, { status: 404 });
        }
        const [updated] = await db
          .update(tracks)
          .set({ isLiked: !row.isLiked })
          .where(eq(tracks.id, trackId))
          .returning();
        return NextResponse.json({ success: true, action, track: updated });
      }

      /* Remove um usuário de teste (e-mail) com suas sessões de login (dev only) */
      case "delete-user": {
        const email = String(body.email || "").trim().toLowerCase();
        if (!email) {
          return NextResponse.json({ success: false, error: "email é obrigatório" }, { status: 400 });
        }
        const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
        if (!user) {
          return NextResponse.json({ success: true, action, deleted: false });
        }
        await db.delete(appUsers).where(eq(appUsers.id, user.id));
        return NextResponse.json({ success: true, action, deleted: true, email });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "action inválida",
            availableActions: [
              "seed-demo",
              "insert-track",
              "insert-playlist",
              "clear-platform",
              "wipe-session",
              "wipe-all",
              "toggle-like",
              "delete-user",
            ],
          },
          { status: 400 }
        );
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "erro interno" }, { status: 500 });
  }
}
