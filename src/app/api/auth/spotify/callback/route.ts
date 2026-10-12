import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionId } from "@/lib/session";
import { getCredentials, getOrigin, getRedirectUris } from "@/lib/credentials";
import { syncSpotifyAccount } from "@/lib/platformSync";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/spotify/callback
 * Recebe o `code` da tela de login do Spotify, troca por access_token,
 * puxa o ID do usuário + todas as playlists/faixas e grava no banco local.
 */
export async function GET(req: Request) {
  const origin = getOrigin(req);
  const { spotify: redirectUri } = getRedirectUris(origin);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const creds = await getCredentials();
  const sessionId = await getSessionId();

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/dev?error=spotify&msg=${encodeURIComponent(msg)}`);

  if (error) return fail(`login_cancelado_ou_negado:${error}`);
  if (!code) return fail("code_ausente_no_callback");

  const expectedState = cookieStore.get("dw_sp_state")?.value;
  if (expectedState && state !== expectedState) return fail("state_invalido_possivel_csrf");

  if (!creds.spotifyClientId) return fail("SPOTIFY_CLIENT_ID_nao_configurado");

  try {
    // 1) Troca do authorization code por tokens
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
      // Fluxo público PKCE
      body.set("client_id", creds.spotifyClientId);
      const verifier = cookieStore.get("dw_sp_verifier")?.value;
      if (verifier) body.set("code_verifier", verifier);
    }

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

    // 2) Sincronização completa (perfil + playlists + faixas + curtidas + top)
    const report = await syncSpotifyAccount(sessionId, tokenData.access_token, tokenData.refresh_token ?? null, {
      autoMatchYoutube: true,
      youtubeApiKey: creds.youtubeApiKey,
    });

    // 3) Registra avisos não-fatais para inspeção no Console Dev
    if (report.warnings.length > 0) {
      await db
        .update(connectedAccounts)
        .set({ lastError: report.warnings.slice(0, 6).join(" | ").slice(0, 900) })
        .where(
          and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "spotify"))
        );
    }

    cookieStore.delete("dw_sp_state");
    cookieStore.delete("dw_sp_verifier");

    const params = new URLSearchParams({
      connected: "spotify",
      account: report.accountId || "",
      playlists: String(report.playlists),
      tracks: String(report.tracks),
    });
    return NextResponse.redirect(`${origin}/?${params.toString()}`);
  } catch (err: any) {
    console.error("[Spotify OAuth]", err);
    await db
      .update(connectedAccounts)
      .set({ syncStatus: "error", lastError: String(err?.message || err).slice(0, 900) })
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "spotify")))
      .catch(() => undefined);
    return fail(String(err?.message || "erro_desconhecido"));
  }
}
