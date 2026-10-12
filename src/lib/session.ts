import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, userSessions } from "@/db/schema";
import { ensureSession } from "./syncService";

export const SESSION_COOKIE_NAME = "duo_music_session";
export const AUTH_COOKIE_NAME = "dw_auth";

/** Sessão de música estável de um usuário logado. */
export function userMusicSessionId(userId: number): string {
  return `u_${userId}`;
}

function newAnonymousId(): string {
  return "usr_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

function setMusicCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, sessionId: string) {
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    httpOnly: false,
    sameSite: "lax",
  });
}

/**
 * Sessão EFETIVA da requisição:
 * - Usuário logado (cookie dw_auth válido) → sessão permanente "u_<id>",
 *   então Spotify/YouTube, playlists e faixas ficam salvos no servidor por conta.
 * - Visitante anônimo → sessão aleatória isolada por navegador.
 */
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();

  const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (authToken) {
    try {
      const rows = await db
        .select({ userId: authSessions.userId, expiresAt: authSessions.expiresAt })
        .from(authSessions)
        .where(eq(authSessions.token, authToken))
        .limit(1);

      const row = rows[0];
      if (row && row.expiresAt.getTime() >= Date.now()) {
        const sessionId = userMusicSessionId(row.userId);
        await ensureSession(sessionId);
        await db
          .update(userSessions)
          .set({ userId: row.userId })
          .where(eq(userSessions.id, sessionId))
          .catch(() => undefined);
        setMusicCookie(cookieStore, sessionId);
        return sessionId;
      }
    } catch {
      // Qualquer falha no banco cai para o modo anônimo abaixo.
    }
  }

  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (existing) {
    try {
      await ensureSession(existing);
    } catch {
      // Ignora — a rota chamadora trata o erro de banco.
    }
    return existing;
  }

  const newId = newAnonymousId();
  setMusicCookie(cookieStore, newId);
  try {
    await ensureSession(newId);
  } catch {
    // Ignora — a rota chamadora trata o erro de banco.
  }
  return newId;
}
