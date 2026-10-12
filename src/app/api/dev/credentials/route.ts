import { NextResponse } from "next/server";
import {
  getCredentials,
  getOrigin,
  getRedirectUris,
  isDevConsoleEnabled,
  maskSecret,
  saveDevCredentials,
  DEV_CREDENTIALS_KEY,
} from "@/lib/credentials";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function guard() {
  return isDevConsoleEnabled()
    ? null
    : NextResponse.json(
        { success: false, error: "Console Dev desabilitado (DISABLE_DEV_CONSOLE=true)" },
        { status: 403 }
      );
}

/**
 * GET /api/dev/credentials
 * Mostra quais credenciais estão ativas (env ou banco) e os redirect URIs exatos
 * que precisam ser cadastrados nos painéis do Spotify e do Google.
 */
export async function GET(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;

  const origin = getOrigin(req);
  const uris = getRedirectUris(origin);
  const creds = await getCredentials();

  return NextResponse.json({
    success: true,
    origin,
    redirectUris: uris,
    credentials: {
      spotifyClientId: creds.spotifyClientId ? maskSecret(creds.spotifyClientId) : null,
      spotifyClientSecret: maskSecret(creds.spotifyClientSecret),
      googleClientId: creds.googleClientId ? maskSecret(creds.googleClientId) : null,
      googleClientSecret: maskSecret(creds.googleClientSecret),
      youtubeApiKey: maskSecret(creds.youtubeApiKey),
      spotifySource: creds.spotifySource,
      googleSource: creds.googleSource,
      spotifyReady: creds.spotifyReady,
      googleReady: creds.googleReady,
    },
    storageKey: DEV_CREDENTIALS_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}

/**
 * POST /api/dev/credentials
 * GRAVA as credenciais no banco local (tabela app_settings) — permite testar o
 * OAuth real sem reiniciar o servidor ou editar o .env.
 * body: { spotifyClientId, spotifyClientSecret, googleClientId, googleClientSecret, youtubeApiKey }
 */
export async function POST(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const saved = await saveDevCredentials({
      spotifyClientId: body.spotifyClientId,
      spotifyClientSecret: body.spotifyClientSecret,
      googleClientId: body.googleClientId,
      googleClientSecret: body.googleClientSecret,
      youtubeApiKey: body.youtubeApiKey,
    });

    const creds = await getCredentials();

    return NextResponse.json({
      success: true,
      message: "Credenciais gravadas no banco local (app_settings).",
      saved: {
        spotifyClientId: maskSecret(saved?.spotifyClientId ?? null),
        googleClientId: maskSecret(saved?.googleClientId ?? null),
        youtubeApiKey: maskSecret(saved?.youtubeApiKey ?? null),
        hasSpotifySecret: Boolean(saved?.spotifyClientSecret),
        hasGoogleSecret: Boolean(saved?.googleClientSecret),
      },
      effective: {
        spotifyReady: creds.spotifyReady,
        googleReady: creds.googleReady,
        spotifySource: creds.spotifySource,
        googleSource: creds.googleSource,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "falha ao gravar" }, { status: 500 });
  }
}

/**
 * DELETE /api/dev/credentials
 * Apaga as credenciais gravadas no banco local (mantém as do .env).
 */
export async function DELETE() {
  const blocked = guard();
  if (blocked) return blocked;

  await db.delete(appSettings).where(eq(appSettings.sessionId, DEV_CREDENTIALS_KEY));
  return NextResponse.json({ success: true, message: "Credenciais do banco local removidas." });
}
