import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { toggleTrackLiked } from "@/lib/syncService";

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const trackId = parseInt(body.trackId, 10);

    if (isNaN(trackId)) {
      return NextResponse.json({ success: false, error: "ID de faixa inválido" }, { status: 400 });
    }

    const updated = await toggleTrackLiked(sessionId, trackId);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Música não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...updated });
  } catch (error: any) {
    console.error("Error toggling like:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to toggle like" }, { status: 500 });
  }
}
