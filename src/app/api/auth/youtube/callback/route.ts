import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { db } from "@/db";
import { connectedAccounts, playlists, tracks } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const sessionId = await getSessionId();

  if (error || !code) {
    return NextResponse.redirect(new URL("/?auth_error=" + encodeURIComponent(error || "no_code"), req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?modal=connect_youtube&missing_creds=1", req.url));
  }

  try {
    // Exchange token with Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Falha ao obter token do Google");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = await userInfoRes.json();

    // Fetch user YouTube playlists
    const ytPlaylistsRes = await fetch(
      "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const ytPlaylistsData = await ytPlaylistsRes.json();

    let totalTracks = 0;

    // Save or update account
    const existing = await db
      .select()
      .from(connectedAccounts)
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "youtube")))
      .limit(1);

    const displayName = userInfo.name || "Usuário YouTube Music";
    const avatarUrl = userInfo.picture || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80";

    if (existing.length > 0) {
      await db
        .update(connectedAccounts)
        .set({
          isConnected: true,
          accountId: userInfo.id,
          displayName,
          email: userInfo.email || null,
          avatarUrl,
          accessToken,
          refreshToken: refreshToken || existing[0].refreshToken,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, existing[0].id));
    } else {
      await db.insert(connectedAccounts).values({
        sessionId,
        platform: "youtube",
        accountId: userInfo.id,
        displayName,
        email: userInfo.email || null,
        avatarUrl,
        accessToken,
        refreshToken,
        isConnected: true,
        syncStatus: "synced",
        lastSyncedAt: new Date(),
      });
    }

    // Save playlists & items
    if (ytPlaylistsData.items && Array.isArray(ytPlaylistsData.items)) {
      for (const pl of ytPlaylistsData.items) {
        const snippet = pl.snippet;
        const [savedPl] = await db
          .insert(playlists)
          .values({
            sessionId,
            platform: "youtube",
            externalId: pl.id,
            title: snippet?.title || "Playlist YouTube",
            description: snippet?.description || "",
            coverUrl:
              snippet?.thumbnails?.medium?.url ||
              snippet?.thumbnails?.default?.url ||
              "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80",
            trackCount: pl.contentDetails?.itemCount || 0,
            isPublic: true,
          })
          .returning();

        // Fetch items
        try {
          const itemsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${pl.id}&maxResults=15`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const itemsData = await itemsRes.json();
          if (itemsData.items && Array.isArray(itemsData.items)) {
            for (let i = 0; i < itemsData.items.length; i++) {
              const item = itemsData.items[i];
              const sn = item.snippet;
              const videoId = sn?.resourceId?.videoId || item.contentDetails?.videoId;
              if (!videoId) continue;
              totalTracks++;
              await db.insert(tracks).values({
                sessionId,
                playlistId: savedPl.id,
                platform: "youtube",
                externalId: videoId,
                title: sn?.title || "Música YouTube",
                artist: sn?.videoOwnerChannelTitle || sn?.channelTitle || "YouTube Artist",
                album: snippet?.title,
                durationSeconds: 210, // default placeholder
                thumbnailUrl: sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url,
                youtubeVideoId: videoId,
                position: i,
              });
            }
          }
        } catch (e) {
          console.error("Error fetching playlist items for", pl.id, e);
        }
      }
    }

    // Update count
    await db
      .update(connectedAccounts)
      .set({ itemCount: totalTracks })
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "youtube")));

    return NextResponse.redirect(new URL("/?connected=youtube", req.url));
  } catch (err: any) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?auth_error=" + encodeURIComponent(err.message), req.url));
  }
}
