import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { ensureSession, searchTracksAndPlaylists } from "@/lib/syncService";
import { db } from "@/db";
import { searchHistory } from "@/db/schema";

export async function GET(req: Request) {
  try {
    const sessionId = await getSessionId();
    await ensureSession(sessionId);
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const platform = (url.searchParams.get("platform") || "all") as "all" | "spotify" | "youtube";
    const category = (url.searchParams.get("category") || "all") as "all" | "tracks" | "playlists";

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        query: "",
        tracks: [],
        playlists: [],
        counts: { spotify: 0, youtube: 0, total: 0 },
      });
    }

    // Save to search history asynchronously
    try {
      await db.insert(searchHistory).values({
        sessionId,
        query: query.trim(),
        searchedAt: new Date(),
      });
    } catch (e) {
      // Ignore search history write error
    }

    const { tracks: allTracks, playlists: allPlaylists } = await searchTracksAndPlaylists(
      sessionId,
      query,
      platform,
      category
    );

    const spotifyTracks = allTracks.filter((t) => t.platform === "spotify");
    const youtubeTracks = allTracks.filter((t) => t.platform === "youtube");

    const spotifyPlaylists = allPlaylists.filter((p) => p.platform === "spotify");
    const youtubePlaylists = allPlaylists.filter((p) => p.platform === "youtube");

    return NextResponse.json({
      success: true,
      query,
      platform,
      category,
      tracks: allTracks,
      playlists: allPlaylists,
      byPlatform: {
        spotify: {
          tracks: spotifyTracks,
          playlists: spotifyPlaylists,
          total: spotifyTracks.length + spotifyPlaylists.length,
        },
        youtube: {
          tracks: youtubeTracks,
          playlists: youtubePlaylists,
          total: youtubeTracks.length + youtubePlaylists.length,
        },
      },
      counts: {
        total: allTracks.length + allPlaylists.length,
        tracks: allTracks.length,
        playlists: allPlaylists.length,
        spotify: spotifyTracks.length + spotifyPlaylists.length,
        youtube: youtubeTracks.length + youtubePlaylists.length,
      },
    });
  } catch (error: any) {
    console.error("Error executing search:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to search" }, { status: 500 });
  }
}
