import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getAccounts } from "@/lib/syncService";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";
import { getSessionTokenHealth } from "@/lib/tokenRefresh";
import {
  getCredentials,
  getOrigin,
  getRedirectUris,
  isDevConsoleEnabled,
  isDevRuntime,
} from "@/lib/credentials";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const sessionId = await getSessionId();
    const accounts = await getAccounts(sessionId);
    const creds = await getCredentials();
    const origin = getOrigin(req);
    const redirectUris = getRedirectUris(origin);
    const user = await getCurrentUser();
    const tokenHealth = await getSessionTokenHealth(sessionId);

    const strip = (a: any) =>
      a
        ? {
            id: a.id,
            platform: a.platform,
            accountId: a.accountId,
            displayName: a.displayName,
            email: a.email,
            avatarUrl: a.avatarUrl,
            isConnected: a.isConnected,
            syncStatus: a.syncStatus,
            itemCount: a.itemCount,
            lastSyncedAt: a.lastSyncedAt,
            product: a.product,
            country: a.country,
            followers: a.followers,
            hasAccessToken: Boolean(a.accessToken),
            hasRefreshToken: Boolean(a.refreshToken),
            expiresAt: a.expiresAt,
            lastError: a.lastError,
          }
        : null;

    return NextResponse.json({
      success: true,
      sessionId,
      user: user ? sanitizeUser(user) : null,
      spotify: strip(accounts.spotify),
      youtube: strip(accounts.youtube),
      bothConnected: accounts.bothConnected,
      anyConnected: accounts.anyConnected,
      tokenHealth,
      credentials: {
        spotifyReady: creds.spotifyReady,
        googleReady: creds.googleReady,
        spotifySource: creds.spotifySource,
        googleSource: creds.googleSource,
        hasYoutubeApiKey: Boolean(creds.youtubeApiKey),
      },
      redirectUris,
      dev: {
        consoleEnabled: isDevConsoleEnabled(),
        isDevRuntime: isDevRuntime(),
        consoleUrl: "/dev",
      },
      // retrocompatibilidade
      hasSpotifyConfig: creds.spotifyReady,
      hasGoogleConfig: creds.googleReady,
    });
  } catch (error: any) {
    console.error("Error fetching auth status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch auth status" },
      { status: 500 }
    );
  }
}
