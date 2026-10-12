import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getLikedTracks } from "@/lib/syncService";

export async function GET(req: Request) {
  try {
    const sessionId = await getSessionId();
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") as any;

    const liked = await getLikedTracks(sessionId, platform || "all");
    return NextResponse.json({ success: true, tracks: liked });
  } catch (error: any) {
    console.error("Error fetching liked tracks:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch liked tracks" }, { status: 500 });
  }
}
