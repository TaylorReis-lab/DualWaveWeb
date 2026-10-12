import { NextResponse } from "next/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, authSessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isDevConsoleEnabled } from "@/lib/credentials";
import type { DevUsersResponse } from "@/types/dev-users";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
const ACTIVITY_WINDOW_MINUTES = 5;

/**
 * GET /api/dev/users
 * Exclusivo para uma conta dev autenticada, com Console Dev habilitado.
 * Retorna um registro por desenvolvedor com sessões de login não expiradas.
 * Não seleciona tokens de sessão, senhas ou credenciais OAuth.
 * "recentlyActive" significa atividade registrada nos últimos 5 minutos,
 * não uma garantia de que a aba/dispositivo continua conectado.
 */
export async function GET() {
  if (!isDevConsoleEnabled()) {
    return NextResponse.json(
      { success: false, error: "Console Dev desabilitado." },
      { status: 403, headers: privateHeaders }
    );
  }

  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return NextResponse.json(
        { success: false, error: "Entre com uma conta de desenvolvedor para visualizar os usuários dev logados." },
        { status: 401, headers: privateHeaders }
      );
    }
    if (viewer.role !== "dev") {
      return NextResponse.json(
        { success: false, error: "A lista de sessões é restrita a contas com perfil de desenvolvedor." },
        { status: 403, headers: privateHeaders }
      );
    }

    const now = new Date();
    const recentCutoff = now.getTime() - ACTIVITY_WINDOW_MINUTES * 60 * 1000;
    // Tipos genéricos de SQL não convertem valores em runtime. Os agregados
    // precisam dos decodificadores das colunas para produzir objetos Date.
    const lastActivity = sql<Date>`max(${authSessions.lastSeenAt})`.mapWith(authSessions.lastSeenAt);
    const rows = await db
      .select({
        id: appUsers.id,
        displayName: appUsers.displayName,
        email: appUsers.email,
        activeSessions: sql<number>`count(*)::int`.mapWith(Number),
        lastLoginAt: sql<Date>`max(${authSessions.createdAt})`.mapWith(authSessions.createdAt),
        lastSeenAt: lastActivity,
        expiresAt: sql<Date>`max(${authSessions.expiresAt})`.mapWith(authSessions.expiresAt),
      })
      .from(appUsers)
      .innerJoin(authSessions, eq(authSessions.userId, appUsers.id))
      .where(and(eq(appUsers.role, "dev"), gt(authSessions.expiresAt, now)))
      .groupBy(appUsers.id, appUsers.displayName, appUsers.email)
      .orderBy(desc(lastActivity));

    const users: DevUsersResponse["users"] = rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      email: row.email,
      role: "dev",
      activeSessions: row.activeSessions,
      lastLoginAt: row.lastLoginAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      recentlyActive: row.lastSeenAt.getTime() >= recentCutoff,
      isCurrentUser: row.id === viewer.id,
    }));

    const payload: DevUsersResponse = {
      success: true,
      users,
      totals: {
        developers: users.length,
        sessions: users.reduce((total, user) => total + user.activeSessions, 0),
        recentlyActive: users.filter((user) => user.recentlyActive).length,
      },
      viewer: { id: viewer.id, displayName: viewer.displayName },
      checkedAt: now.toISOString(),
      recentActivityWindowMinutes: ACTIVITY_WINDOW_MINUTES,
    };

    return NextResponse.json(payload, { headers: privateHeaders });
  } catch (error) {
    console.error("[dev-users] Falha ao consultar as sessões de desenvolvedores:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar as sessões. Tente atualizar a lista." },
      { status: 500, headers: privateHeaders }
    );
  }
}
