import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL("/?modal=connect_youtube&missing_creds=1", req.url));
  }

  const sessionId = await getSessionId();
  const redirectUri = `${url.origin}/api/auth/youtube/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("scope", scopes);
  googleAuthUrl.searchParams.set("state", sessionId);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(googleAuthUrl.toString());
}
