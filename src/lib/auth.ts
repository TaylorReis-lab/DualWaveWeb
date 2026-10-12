import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  appUsers,
  authSessions,
  connectedAccounts,
  playlists,
  searchHistory,
  tracks,
  userSessions,
  type AppUser,
} from "@/db/schema";
import { ensureSession, getAccounts } from "./syncService";
import { SESSION_COOKIE_NAME } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { getSessionTokenHealth, refreshSessionTokens } from "./tokenRefresh";

export const AUTH_COOKIE_NAME = "dw_auth";
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

/** Código que transforma um registro em conta de desenvolvedor. */
export function getDevSignupCode(): string {
  return process.env.DEV_SIGNUP_CODE || "dualwave-dev";
}

/** Sessão de música estável de um usuário logado. */
export function userMusicSessionId(userId: number): string {
  return `u_${userId}`;
}

export function sanitizeUser(user: AppUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as "dev" | "user",
    createdAt: user.createdAt,
  };
}

export type SanitizedUser = ReturnType<typeof sanitizeUser>;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Usuário logado a partir do cookie dw_auth (null quando anônimo/expirado). */
export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: appUsers, session: authSessions })
    .from(authSessions)
    .innerJoin(appUsers, eq(authSessions.userId, appUsers.id))
    .where(eq(authSessions.token, token))
    .limit(1);

  if (rows.length === 0) return null;

  if (rows[0].session.expiresAt.getTime() < Date.now()) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
    return null;
  }

  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.token, token));
  return rows[0].user;
}

async function createAuthSession(userId: number) {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH_MAX_AGE_SECONDS * 1000);
  await db.insert(authSessions).values({ token, userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: AUTH_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return { token, expiresAt };
}

export async function destroyAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
  devCode?: string;
}): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const displayName = (input.displayName || "").trim() || email.split("@")[0] || "Usuário";

  if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");
  if (!input.password || input.password.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const existing = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, email)).limit(1);
  if (existing.length > 0) throw new Error("Este e-mail já está cadastrado. Tente entrar.");

  const role = input.devCode && input.devCode.trim() === getDevSignupCode() ? "dev" : "user";

  const [user] = await db
    .insert(appUsers)
    .values({ email, passwordHash: hashPassword(input.password), displayName, role })
    .returning();

  return user;
}

export async function verifyUserCredentials(email: string, password: string): Promise<AppUser> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db.select().from(appUsers).where(eq(appUsers.email, normalized)).limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("E-mail ou senha inválidos.");
  }
  return user;
}

/** Garante a sessão de música do usuário e aponta o cookie para ela. */
export async function ensureUserMusicSession(userId: number): Promise<string> {
  const sessionId = userMusicSessionId(userId);
  await ensureSession(sessionId);
  await db.update(userSessions).set({ userId }).where(eq(userSessions.id, sessionId));

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
  });

  return sessionId;
}

export interface MigrationStats {
  movedAccounts: number;
  movedPlaylists: number;
  movedTracks: number;
  movedSearches: number;
}

/**
 * Move os dados da sessão anônima (playlists, faixas, contas, buscas,
 * preferências) para a sessão permanente do usuário, sem duplicar playlists
 * que já existam no destino.
 */
export async function migrateAnonymousToUser(
  anonSessionId: string | null,
  userSessionId: string
): Promise<MigrationStats> {
  const stats: MigrationStats = { movedAccounts: 0, movedPlaylists: 0, movedTracks: 0, movedSearches: 0 };
  if (!anonSessionId || anonSessionId === userSessionId) return stats;

  await ensureSession(userSessionId);
  const [anonExists] = await db
    .select({ id: userSessions.id })
    .from(userSessions)
    .where(eq(userSessions.id, anonSessionId))
    .limit(1);
  if (!anonExists) return stats;

  // 1) Playlists: move ou mescla quando o destino já tem o mesmo externalId.
  const anonPlaylists = await db.select().from(playlists).where(eq(playlists.sessionId, anonSessionId));
  const mergedTargetIds = new Set<number>();

  for (const pl of anonPlaylists) {
    let targetId: number | null = null;

    if (pl.externalId) {
      const [existing] = await db
        .select({ id: playlists.id })
        .from(playlists)
        .where(
          and(
            eq(playlists.sessionId, userSessionId),
            eq(playlists.platform, pl.platform),
            eq(playlists.externalId, pl.externalId)
          )
        )
        .limit(1);
      if (existing) targetId = existing.id;
    }

    if (targetId) {
      const moved = await db
        .update(tracks)
        .set({ sessionId: userSessionId, playlistId: targetId })
        .where(and(eq(tracks.sessionId, anonSessionId), eq(tracks.playlistId, pl.id)))
        .returning({ id: tracks.id });
      stats.movedTracks += moved.length;
      await db.delete(playlists).where(eq(playlists.id, pl.id));
      mergedTargetIds.add(targetId);
    } else {
      await db.update(playlists).set({ sessionId: userSessionId }).where(eq(playlists.id, pl.id));
      stats.movedPlaylists++;
    }
  }

  // Recalcula contadores das playlists mescladas.
  for (const targetId of mergedTargetIds) {
    const [count] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tracks)
      .where(eq(tracks.playlistId, targetId));
    await db.update(playlists).set({ trackCount: count?.n ?? 0 }).where(eq(playlists.id, targetId));
  }

  // 2) Faixas avulsas restantes.
  const movedLoose = await db
    .update(tracks)
    .set({ sessionId: userSessionId })
    .where(eq(tracks.sessionId, anonSessionId))
    .returning({ id: tracks.id });
  stats.movedTracks += movedLoose.length;

  // 3) Contas conectadas: move a plataforma ou descarta a duplicada.
  const userAccounts = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, userSessionId));
  const userPlatforms = new Set(userAccounts.map((a) => a.platform));

  const anonAccounts = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, anonSessionId));

  for (const acc of anonAccounts) {
    if (userPlatforms.has(acc.platform)) {
      await db.delete(connectedAccounts).where(eq(connectedAccounts.id, acc.id));
    } else {
      await db
        .update(connectedAccounts)
        .set({ sessionId: userSessionId })
        .where(eq(connectedAccounts.id, acc.id));
      userPlatforms.add(acc.platform);
      stats.movedAccounts++;
    }
  }

  // 4) Histórico de buscas.
  const movedSearches = await db
    .update(searchHistory)
    .set({ sessionId: userSessionId })
    .where(eq(searchHistory.sessionId, anonSessionId))
    .returning({ id: searchHistory.id });
  stats.movedSearches += movedSearches.length;

  // 5) Preferências da sessão (só se o destino ainda não tiver).
  const [targetSettings] = await db
    .select({ id: appSettings.id })
    .from(appSettings)
    .where(eq(appSettings.sessionId, userSessionId))
    .limit(1);
  if (!targetSettings) {
    await db
      .update(appSettings)
      .set({ sessionId: userSessionId })
      .where(eq(appSettings.sessionId, anonSessionId));
  }

  // 6) Remove a sessão anônima (o cascade limpa qualquer resto).
  await db.delete(userSessions).where(eq(userSessions.id, anonSessionId));

  return stats;
}

export interface LoginPreparation {
  sessionId: string;
  migration: MigrationStats;
  refreshed: Awaited<ReturnType<typeof refreshSessionTokens>>;
  tokenHealth: Awaited<ReturnType<typeof getSessionTokenHealth>>;
  seededDemo: boolean;
}

/**
 * Rotina executada em todo registro/login:
 * sessão permanente + migração + (dev: seed) + renovação automática de tokens.
 */
export async function loginAndPrepare(
  user: AppUser,
  anonSessionId: string | null
): Promise<LoginPreparation> {
  const sessionId = await ensureUserMusicSession(user.id);
  const migration = await migrateAnonymousToUser(anonSessionId, sessionId);
  await createAuthSession(user.id);

  // Conta dev nova e vazia já abre com os logins de demonstração presentes.
  let seededDemo = false;
  if (user.role === "dev") {
    const accounts = await getAccounts(sessionId);
    if (!accounts.anyConnected) {
      const { connectDemoPlatform } = await import("./syncService");
      await connectDemoPlatform(sessionId, "spotify");
      await connectDemoPlatform(sessionId, "youtube");
      seededDemo = true;
    }
  }

  // Renova automaticamente os tokens expirados do Spotify/YouTube.
  const refreshed = await refreshSessionTokens(sessionId);
  const tokenHealth = await getSessionTokenHealth(sessionId);

  return { sessionId, migration, refreshed, tokenHealth, seededDemo };
}
