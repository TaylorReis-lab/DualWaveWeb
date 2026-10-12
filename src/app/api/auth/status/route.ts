import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getAccounts } from "@/lib/syncService";

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const accounts = await getAccounts(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      ...accounts,
      hasSpotifyConfig: Boolean(process.env.SPOTIFY_CLIENT_ID),
      hasGoogleConfig: Boolean(process.env.GOOGLE_CLIENT_ID),
    });
  } catch (error: any) {
    console.error("Error fetching auth status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch auth status" },
      { status: 500 }
    );
  }
}
