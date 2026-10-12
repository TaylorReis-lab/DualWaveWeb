import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroyAuthSession } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { ensureSession } from "@/lib/syncService";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Encerra a sessão de login e volta o navegador para uma sessão anônima
 * nova — os dados da conta permanecem salvos no servidor.
 */
export async function POST() {
  await destroyAuthSession();

  const freshId = "usr_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  try {
    await ensureSession(freshId);
  } catch {
    // Ignora — o próximo acesso cria a sessão.
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, freshId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
  });

  return NextResponse.json({ success: true, message: "Você saiu da conta." });
}
