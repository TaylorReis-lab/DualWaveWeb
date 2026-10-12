import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { getCredentials, getOrigin, getRedirectUris } from "@/lib/credentials";

export const dynamic = "force-dynamic";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-read-recently-played",
  "user-top-read",
  "user-follow-read",
].join(" ");

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * GET /api/auth/spotify
 * Manda o usuário para a TELA DE LOGIN OFICIAL DO SPOTIFY.
 * Suporta dois modos:
 *  - Confidencial: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
 *  - Público (PKCE): apenas SPOTIFY_CLIENT_ID (ótimo para dev/teste)
 */
export async function GET(req: Request) {
  const origin = getOrigin(req);
  const { spotify: redirectUri } = getRedirectUris(origin);
  const creds = await getCredentials();
  const cookieStore = await cookies();

  if (!creds.spotifyClientId) {
    return NextResponse.redirect(
      `${origin}/dev?need=spotify&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
  }

  const state = randomBytes(12).toString("hex");
  cookieStore.set("dw_sp_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", creds.spotifyClientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("show_dialog", "true");

  // Sem client secret → fluxo público com PKCE
  if (!creds.spotifyClientSecret) {
    const verifier = base64url(randomBytes(48));
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    cookieStore.set("dw_sp_verifier", verifier, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
    });
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);
  }

  return NextResponse.redirect(authUrl.toString());
}
