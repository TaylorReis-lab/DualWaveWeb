import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getCredentials, isDevConsoleEnabled } from "@/lib/credentials";
import { syncSpotifyAccount, syncYoutubeAccount } from "@/lib/platformSync";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/token
 * Rota exclusiva de DESENVOLVIMENTO: você cola um access_token obtido manualmente
 * (ex.: pelo console do Spotify ou OAuth Playground do Google) e o servidor roda a
 * sincronização real, gravando IDs, playlists e faixas no banco local.
 *
 * body: { platform: "spotify" | "youtube", accessToken, refreshToken?, autoMatchYoutube? }
 */
export async function POST(req: Request) {
  if (!isDevConsoleEnabled()) {
    return NextResponse.json({ success: false, error: "Console Dev desabilitado" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const platform = body.platform;
    const accessToken: string | undefined = body.accessToken?.trim();
    const refreshToken: string | null = body.refreshToken?.trim() || null;
    const sessionId = await getSessionId();

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "accessToken é obrigatório" }, { status: 400 });
    }

    const creds = await getCredentials();

    if (platform === "spotify") {
      const report = await syncSpotifyAccount(sessionId, accessToken, refreshToken, {
        autoMatchYoutube: body.autoMatchYoutube ?? true,
        youtubeApiKey: creds.youtubeApiKey,
        maxTracksPerPlaylist: Number(body.maxTracksPerPlaylist) || 100,
      });
      return NextResponse.json({ success: true, sessionId, report });
    }

    if (platform === "youtube") {
      const report = await syncYoutubeAccount(sessionId, accessToken, refreshToken);
      return NextResponse.json({ success: true, sessionId, report });
    }

    return NextResponse.json(
      { success: false, error: "platform deve ser 'spotify' ou 'youtube'" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "falha na sincronização manual" },
      { status: 500 }
    );
  }
}
