import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    // If not configured, redirect back with notification
    return NextResponse.redirect(new URL("/?modal=connect_spotify&missing_creds=1", req.url));
  }

  const sessionId = await getSessionId();
  const redirectUri = `${url.origin}/api/auth/spotify/callback`;
  const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-library-read",
    "user-read-recently-played",
    "user-top-read",
  ].join(" ");

  const spotifyAuthUrl = new URL("https://accounts.spotify.com/authorize");
  spotifyAuthUrl.searchParams.set("client_id", clientId);
  spotifyAuthUrl.searchParams.set("response_type", "code");
  spotifyAuthUrl.searchParams.set("redirect_uri", redirectUri);
  spotifyAuthUrl.searchParams.set("scope", scopes);
  spotifyAuthUrl.searchParams.set("state", sessionId);
  spotifyAuthUrl.searchParams.set("show_dialog", "true");

  return NextResponse.redirect(spotifyAuthUrl.toString());
}
