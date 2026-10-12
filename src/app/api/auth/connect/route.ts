import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { connectDemoPlatform } from "@/lib/syncService";

export async function POST(req: Request) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const platform = body.platform as "spotify" | "youtube";

    if (!platform || (platform !== "spotify" && platform !== "youtube")) {
      return NextResponse.json({ success: false, error: "Plataforma inválida" }, { status: 400 });
    }

    const result = await connectDemoPlatform(sessionId, platform);
    return NextResponse.json({
      success: true,
      platform,
      count: result.count,
      message: `${platform === "spotify" ? "Spotify" : "YouTube Music"} conectado e sincronizado com sucesso!`,
    });
  } catch (error: any) {
    console.error("Error connecting platform:", error);
    return NextResponse.json({ success: false, error: error.message || "Falha ao conectar plataforma" }, { status: 500 });
  }
}
