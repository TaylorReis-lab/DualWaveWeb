import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCredentials, getOrigin, getRedirectUris } from "@/lib/credentials";
import { syncSpotifyAccount, syncYoutubeAccount } from "@/lib/platformSync";

export const dynamic = "force-dynamic";

/**
 * GET /api/login/extract
 * Recebe o authorization code da tela oficial, troca por tokens,
 * extrai os dados necessários da resposta oficial e grava no banco.
 * Retorna o perfil bruto + os campos extraídos + o resumo da sync.
 */
export async function GET(req: Request) {
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const platform = (url.searchParams.get("platform") || "spotify") as "spotify" | "youtube";

  const cookieStore = await cookies();
  const creds = await getCredentials();
  const fail = (msg: string) =>
    NextResponse.json({ success: false, error: msg }, { status: 400 });

  if (!code) return fail("code ausente");

  if (platform === "spotify") {
    if (!creds.spotifyClientId) return fail("SPOTIFY_CLIENT_ID não configurado");

    const { spotify: redirectUri } = getRedirectUris(origin);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (creds.spotifyClientSecret) {
      headers.Authorization =
        "Basic " + Buffer.from(`${creds.spotifyClientId}:${creds.spotifyClientSecret}`).toString("base64");
    } else {
      body.set("client_id", creds.spotifyClientId);
      const verifier = cookieStore.get("dw_sp_verifier")?.value;
      if (verifier) body.set("code_verifier", verifier);
    }

    try {
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers,
        body: body.toString(),
        cache: "no-store",
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          `troca_de_token_falhou (${tokenRes.status}): ${tokenData.error_description || tokenData.error || "desconhecido"}`
        );
      }

      const sessionId = "extract_" + Math.random().toString(36).slice(2, 10);
      const report = await syncSpotifyAccount(sessionId, tokenData.access_token, tokenData.refresh_token ?? null, {
        expiresInSeconds: Number(tokenData.expires_in) || 3600,
      });

      // Perfil bruto usado na extração (vem do /me dentro da sync)
      const profile = {
        id: report.accountId,
        display_name: report.displayName,
        email: report.email,
        images: report.avatarUrl ? [{ url: report.avatarUrl }] : [],
        product: null,
        country: null,
        followers: { total: null },
        scopes: null,
      };

      return NextResponse.json({
        success: true,
        platform,
        profile,
        extracted: {
          accountId: report.accountId,
          displayName: report.displayName,
          email: report.email,
          avatarUrl: report.avatarUrl,
          extra: {
            scopes: null,
            product: null,
            country: null,
            followers: null,
          },
        },
        summary: {
          platform: report.platform,
          accountId: report.accountId,
          displayName: report.displayName,
          email: report.email,
          avatarUrl: report.avatarUrl,
          playlists: report.playlists,
          tracks: report.tracks,
          liked: report.liked,
          warnings: report.warnings,
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || "falha na extração" }, { status: 500 });
    }
  }

  if (platform === "youtube") {
    if (!creds.googleClientId || !creds.googleClientSecret) {
      return fail("GOOGLE_CLIENT_ID/SECRET não configurados");
    }
    const { youtube: redirectUri } = getRedirectUris(origin);

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: creds.googleClientId,
          client_secret: creds.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        cache: "no-store",
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          `troca_de_token_falhou (${tokenRes.status}): ${tokenData.error_description || tokenData.error || "desconhecido"}`
        );
      }

      const sessionId = "extract_" + Math.random().toString(36).slice(2, 10);
      const report = await syncYoutubeAccount(sessionId, tokenData.access_token, tokenData.refresh_token ?? null, {
        expiresInSeconds: Number(tokenData.expires_in) || 3600,
      });

      return NextResponse.json({
        success: true,
        platform,
        profile: {
          sub: report.accountId,
          name: report.displayName,
          email: report.email,
          picture: report.avatarUrl,
        },
        extracted: {
          accountId: report.accountId,
          displayName: report.displayName,
          email: report.email,
          avatarUrl: report.avatarUrl,
          extra: {
            channelId: report.accountId,
            scopes: "youtube.readonly",
          },
        },
        summary: {
          platform: report.platform,
          accountId: report.accountId,
          displayName: report.displayName,
          email: report.email,
          avatarUrl: report.avatarUrl,
          playlists: report.playlists,
          tracks: report.tracks,
          liked: report.liked,
          warnings: report.warnings,
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || "falha na extração" }, { status: 500 });
    }
  }

  return fail("platform deve ser spotify ou youtube");
}
