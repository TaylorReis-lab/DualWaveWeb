import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { disconnectPlatform } from "@/lib/syncService";

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const platform = body.platform as "spotify" | "youtube";

    if (!platform || (platform !== "spotify" && platform !== "youtube")) {
      return NextResponse.json({ success: false, error: "Plataforma inválida" }, { status: 400 });
    }

    await disconnectPlatform(sessionId, platform);
    return NextResponse.json({
      success: true,
      platform,
      message: `${platform === "spotify" ? "Spotify" : "YouTube Music"} desconectado.`,
    });
  } catch (error: any) {
    console.error("Error disconnecting platform:", error);
    return NextResponse.json({ success: false, error: error.message || "Falha ao desconectar" }, { status: 500 });
  }
}
