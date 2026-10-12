import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getPlaylists, createHybridPlaylist } from "@/lib/syncService";

export async function GET(req: Request) {
  try {
    const sessionId = await getSessionId();
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") as any;

    const playlistsList = await getPlaylists(sessionId, platform || "all");
    return NextResponse.json({ success: true, playlists: playlistsList });
  } catch (error: any) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch playlists" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const { title, description, trackIds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "O título da playlist é obrigatório" }, { status: 400 });
    }

    const playlist = await createHybridPlaylist(sessionId, title.trim(), description || "", trackIds || []);
    return NextResponse.json({ success: true, playlist });
  } catch (error: any) {
    console.error("Error creating playlist:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create playlist" }, { status: 500 });
  }
}
