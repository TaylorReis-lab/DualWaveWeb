import { NextResponse } from "next/server";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";
import { getSessionId } from "@/lib/session";
import { getSessionTokenHealth, refreshSessionTokens } from "@/lib/tokenRefresh";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Retorna o usuário logado (ou null). Sempre que chamado com login ativo,
 * confere e renova automaticamente os tokens do Spotify/YouTube Music.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: true, user: null });
    }

    const sessionId = await getSessionId();
    const refreshed = await refreshSessionTokens(sessionId);
    const tokenHealth = await getSessionTokenHealth(sessionId);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      sessionId,
      refreshed,
      tokenHealth,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Falha ao carregar sessão." },
      { status: 500 }
    );
  }
}
