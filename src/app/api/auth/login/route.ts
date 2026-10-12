import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginAndPrepare, sanitizeUser, verifyUserCredentials } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 * Entra com e-mail + senha. Ao logar, verifica automaticamente se os tokens
 * do Spotify e do YouTube Music expiraram e os renova via refresh token.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const anonSessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

    const user = await verifyUserCredentials(String(body.email || ""), String(body.password || ""));
    const prep = await loginAndPrepare(user, anonSessionId);

    const renewed: string[] = [];
    if (prep.refreshed.spotify?.renewed) renewed.push("Spotify");
    if (prep.refreshed.youtube?.renewed) renewed.push("YouTube Music");

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      sessionId: prep.sessionId,
      migration: prep.migration,
      tokenHealth: prep.tokenHealth,
      refreshed: prep.refreshed,
      seededDemo: prep.seededDemo,
      message:
        renewed.length > 0
          ? `Bem-vindo de volta! Token renovado automaticamente: ${renewed.join(" e ")}.`
          : "Bem-vindo de volta! Suas contas e playlists foram carregadas.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Não foi possível entrar." },
      { status: 401 }
    );
  }
}
