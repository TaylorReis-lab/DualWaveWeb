import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getPlaylistDetail } from "@/lib/syncService";
import { db } from "@/db";
import { playlists, tracks } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const sessionId = await getSessionId();
    const data = await getPlaylistDetail(sessionId, playlistId);

    if (!data) {
      return NextResponse.json({ success: false, error: "Playlist não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch playlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const sessionId = await getSessionId();
    await db.delete(tracks).where(and(eq(tracks.sessionId, sessionId), eq(tracks.playlistId, playlistId)));
    await db.delete(playlists).where(and(eq(playlists.sessionId, sessionId), eq(playlists.id, playlistId)));

    return NextResponse.json({ success: true, message: "Playlist excluída com sucesso" });
  } catch (error: any) {
    console.error("Error deleting playlist:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete playlist" }, { status: 500 });
  }
}
