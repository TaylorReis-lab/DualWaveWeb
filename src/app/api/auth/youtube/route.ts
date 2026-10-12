import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getCredentials, getOrigin, getRedirectUris } from "@/lib/credentials";

export const dynamic = "force-dynamic";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

/**
 * GET /api/auth/youtube
 * Manda o usuário para a TELA DE LOGIN OFICIAL DO GOOGLE / YOUTUBE.
 */
export async function GET(req: Request) {
  const origin = getOrigin(req);
  const { youtube: redirectUri } = getRedirectUris(origin);
  const creds = await getCredentials();
  const cookieStore = await cookies();

  if (!creds.googleClientId) {
    return NextResponse.redirect(
      `${origin}/dev?need=youtube&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
  }

  const state = randomBytes(12).toString("hex");
  cookieStore.set("dw_yt_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", creds.googleClientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", YOUTUBE_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
