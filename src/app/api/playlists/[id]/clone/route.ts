import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { clonePlaylistToPlatform } from "@/lib/syncService";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const playlistId = parseInt(id, 10);
    if (isNaN(playlistId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const sessionId = await getSessionId();
    const body = await req.json();
    const targetPlatform = body.targetPlatform as "spotify" | "youtube" | "hybrid";

    if (!targetPlatform || !["spotify", "youtube", "hybrid"].includes(targetPlatform)) {
      return NextResponse.json({ success: false, error: "Plataforma de destino inválida" }, { status: 400 });
    }

    const cloned = await clonePlaylistToPlatform(sessionId, playlistId, targetPlatform);
    if (!cloned) {
      return NextResponse.json({ success: false, error: "Playlist original não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      playlist: cloned,
      message: `Playlist migrada com sucesso para ${targetPlatform.toUpperCase()}!`,
    });
  } catch (error: any) {
    console.error("Error cloning playlist:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to clone playlist" }, { status: 500 });
  }
}
