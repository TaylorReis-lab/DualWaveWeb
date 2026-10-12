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

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?modal=connect_spotify&missing_creds=1", req.url));
  }

  try {
    // Exchange token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Falha ao obter token do Spotify");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    // Fetch user playlists
    const playlistsRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const playlistsData = await playlistsRes.json();

    let totalTracks = 0;

    // Save or update account
    const existing = await db
      .select()
      .from(connectedAccounts)
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "spotify")))
      .limit(1);

    const displayName = profile.display_name || profile.id || "Usuário Spotify";
    const avatarUrl = profile.images?.[0]?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

    if (existing.length > 0) {
      await db
        .update(connectedAccounts)
        .set({
          isConnected: true,
          accountId: profile.id,
          displayName,
          email: profile.email || null,
          avatarUrl,
          accessToken,
          refreshToken,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, existing[0].id));
    } else {
      await db.insert(connectedAccounts).values({
        sessionId,
        platform: "spotify",
        accountId: profile.id,
        displayName,
        email: profile.email || null,
        avatarUrl,
        accessToken,
        refreshToken,
        isConnected: true,
        syncStatus: "synced",
        lastSyncedAt: new Date(),
      });
    }

    // Save playlists & some tracks
    if (playlistsData.items && Array.isArray(playlistsData.items)) {
      for (const pl of playlistsData.items) {
        const [savedPl] = await db
          .insert(playlists)
          .values({
            sessionId,
            platform: "spotify",
            externalId: pl.id,
            title: pl.name,
            description: pl.description || "",
            coverUrl: pl.images?.[0]?.url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80",
            trackCount: pl.tracks?.total || 0,
            isPublic: pl.public ?? true,
          })
          .returning();

        // Fetch top tracks for this playlist
        try {
          const plTracksRes = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=15`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const plTracksData = await plTracksRes.json();
          if (plTracksData.items && Array.isArray(plTracksData.items)) {
            for (let i = 0; i < plTracksData.items.length; i++) {
              const item = plTracksData.items[i];
              if (!item.track) continue;
              const t = item.track;
              totalTracks++;
              await db.insert(tracks).values({
                sessionId,
                playlistId: savedPl.id,
                platform: "spotify",
                externalId: t.id,
                title: t.name,
                artist: t.artists?.map((a: any) => a.name).join(", ") || "Artista Desconhecido",
                album: t.album?.name,
                durationSeconds: Math.floor((t.duration_ms || 0) / 1000),
                thumbnailUrl: t.album?.images?.[0]?.url,
                previewUrl: t.preview_url,
                spotifyUri: t.uri,
                position: i,
              });
            }
          }
        } catch (e) {
          console.error("Error fetching tracks for playlist", pl.id, e);
        }
      }
    }

    // Update count
    await db
      .update(connectedAccounts)
      .set({ itemCount: totalTracks })
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "spotify")));

    return NextResponse.redirect(new URL("/?connected=spotify", req.url));
  } catch (err: any) {
    console.error("Spotify OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?auth_error=" + encodeURIComponent(err.message), req.url));
  }
}
