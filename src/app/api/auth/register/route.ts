import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginAndPrepare, registerUser, sanitizeUser } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 * Cria a conta DualWave (e-mail + senha, salva no servidor) e já deixa o
 * usuário logado. Migra os dados anônimos do navegador para a conta,
 * prepara demo para devs e renova tokens OAuth vencidos.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const anonSessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

    const user = await registerUser({
      email: String(body.email || ""),
      password: String(body.password || ""),
      displayName: body.displayName ? String(body.displayName) : undefined,
      devCode: body.devCode ? String(body.devCode) : undefined,
    });

    const prep = await loginAndPrepare(user, anonSessionId);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      sessionId: prep.sessionId,
      migration: prep.migration,
      tokenHealth: prep.tokenHealth,
      refreshed: prep.refreshed,
      seededDemo: prep.seededDemo,
      message:
        user.role === "dev" && prep.seededDemo
          ? "Conta de desenvolvedor criada — logins de demonstração já estão presentes."
          : "Conta criada com sucesso. Seus Spotify e YouTube ficam salvos nesta conta.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Não foi possível criar a conta." },
      { status: 400 }
    );
  }
}
