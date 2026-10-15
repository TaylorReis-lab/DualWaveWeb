import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionId } from "@/lib/session";
import { getCredentials, resolveOrigin, getRedirectUris } from "@/lib/credentials";
import { syncYoutubeAccount } from "@/lib/platformSync";
import { oauthFailureRedirect } from "@/lib/oauthDiagnostics";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/youtube/callback
 * Recebe o `code` da tela de login do Google, troca por access_token,
 * puxa o channelId + playlists (inclusive "curtidas") e grava no banco local.
 */
export async function GET(req: Request) {
  const { origin } = resolveOrigin(req);
  const { youtube: redirectUri } = getRedirectUris(origin);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const creds = await getCredentials();
  const sessionId = await getSessionId();

  // Toda falha volta ao Console Dev com a URI exata e o passo a passo.
  const fail = (msg: string) => oauthFailureRedirect(req, "youtube", msg);

  if (error) return fail(`login_cancelado_ou_negado:${error}`);
  if (!code) return fail("code_ausente_no_callback");

  const expectedState = cookieStore.get("dw_yt_state")?.value;
  if (expectedState && state !== expectedState) return fail("state_invalido_possivel_csrf");

  if (!creds.googleClientId || !creds.googleClientSecret) {
    return fail("GOOGLE_CLIENT_ID_ou_GOOGLE_CLIENT_SECRET_nao_configurados");
  }

  try {
    // 1) Troca do authorization code por tokens
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

    // 2) Sincronização completa (canal + playlists + curtidas + faixas com duração real)
    const report = await syncYoutubeAccount(sessionId, tokenData.access_token, tokenData.refresh_token ?? null, {
      expiresInSeconds: Number(tokenData.expires_in) || 3600,
    });

    if (report.warnings.length > 0) {
      await db
        .update(connectedAccounts)
        .set({ lastError: report.warnings.slice(0, 6).join(" | ").slice(0, 900) })
        .where(
          and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "youtube"))
        );
    }

    cookieStore.delete("dw_yt_state");

    // Página de extração: mostra a resposta oficial e o que foi puxado.
    const params = new URLSearchParams({
      platform: "youtube",
      account: report.accountId || "",
      playlists: String(report.playlists),
      tracks: String(report.tracks),
    });
    return NextResponse.redirect(`${origin}/login/extract?${params.toString()}`);
  } catch (err: any) {
    console.error("[YouTube OAuth]", err);
    await db
      .update(connectedAccounts)
      .set({ syncStatus: "error", lastError: String(err?.message || err).slice(0, 900) })
      .where(and(eq(connectedAccounts.sessionId, sessionId), eq(connectedAccounts.platform, "youtube")))
      .catch(() => undefined);
    return fail(String(err?.message || "erro_desconhecido"));
  }
}
