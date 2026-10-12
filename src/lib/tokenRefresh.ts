import { db } from "@/db";
import { connectedAccounts, type ConnectedAccount } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCredentials } from "./credentials";

/**
 * Renovação automática dos tokens do Spotify e do YouTube.
 *
 * - `getSessionTokenHealth()` apenas LÊ o banco (sem chamadas de rede) — usado
 *   pelo `/api/auth/status` para exibir o estado atual.
 * - `refreshSessionTokens()` faz as chamadas reais de refresh quando o token
 *   está expirado ou prestes a expirar — chamado no login e no `/api/auth/me`.
 */

/** Renova se já expirou ou expira nos próximos 5 minutos. */
export const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

export type TokenHealthState = "valid" | "expiring" | "expired" | "demo" | "error";

export interface PlatformTokenHealth {
  platform: "spotify" | "youtube";
  state: TokenHealthState;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  expiresAt: Date | null;
  message: string;
}

export interface PlatformRefreshReport extends PlatformTokenHealth {
  renewed: boolean;
  ok: boolean;
}

export function needsRefresh(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - Date.now() < TOKEN_REFRESH_SKEW_MS;
}

/** Estado atual do token de UMA conta, sem nenhuma chamada de rede. */
export function tokenHealthForAccount(account: ConnectedAccount | null): PlatformTokenHealth | null {
  if (!account || !account.isConnected) return null;

  const base = {
    platform: account.platform as "spotify" | "youtube",
    hasAccessToken: Boolean(account.accessToken),
    hasRefreshToken: Boolean(account.refreshToken),
    expiresAt: account.expiresAt,
  };

  if (!account.accessToken && !account.refreshToken) {
    return {
      ...base,
      state: "demo",
      message: "Conta de demonstração (sem tokens OAuth) — nada a renovar.",
    };
  }

  if (!account.refreshToken) {
    return {
      ...base,
      state: "valid",
      message: "Sem refresh token — reconecte a conta se o acesso expirar.",
    };
  }

  if (!account.expiresAt) {
    return {
      ...base,
      state: "expiring",
      message: "Validade desconhecida — será renovado no próximo login.",
    };
  }

  if (account.expiresAt.getTime() <= Date.now()) {
    return {
      ...base,
      state: "expired",
      message: "Token expirado — será renovado automaticamente no login.",
    };
  }

  if (needsRefresh(account.expiresAt)) {
    return {
      ...base,
      state: "expiring",
      message: "Token prestes a expirar — será renovado automaticamente no login.",
    };
  }

  return { ...base, state: "valid", message: "Token válido." };
}

/** Estado atual dos tokens da sessão (leitura do banco, sem rede). */
export async function getSessionTokenHealth(
  sessionId: string
): Promise<{ spotify: PlatformTokenHealth | null; youtube: PlatformTokenHealth | null }> {
  const rows = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, sessionId));

  const spotify = rows.find((r) => r.platform === "spotify") ?? null;
  const youtube = rows.find((r) => r.platform === "youtube") ?? null;

  return {
    spotify: tokenHealthForAccount(spotify),
    youtube: tokenHealthForAccount(youtube),
  };
}

interface RefreshedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string | null;
  scope: string | null;
}

async function refreshSpotifyToken(refreshToken: string): Promise<RefreshedTokens> {
  const creds = await getCredentials();
  if (!creds.spotifyClientId) {
    throw new Error("SPOTIFY_CLIENT_ID não configurado — impossível renovar o token.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (creds.spotifyClientSecret) {
    headers.Authorization =
      "Basic " +
      Buffer.from(`${creds.spotifyClientId}:${creds.spotifyClientSecret}`).toString("base64");
  } else {
    body.set("client_id", creds.spotifyClientId);
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body: body.toString(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Spotify recusou a renovação (${res.status}): ${data.error_description || data.error || "token inválido"}`
    );
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in) || 3600,
    refreshToken: data.refresh_token ?? null, // Spotify pode rotacionar o refresh token
    scope: data.scope ?? null,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<RefreshedTokens> {
  const creds = await getCredentials();
  if (!creds.googleClientId || !creds.googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET não configurados — impossível renovar o token.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: creds.googleClientId,
      client_secret: creds.googleClientSecret,
    }).toString(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google recusou a renovação (${res.status}): ${data.error_description || data.error || "token inválido"}`
    );
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in) || 3600,
    refreshToken: null, // Google mantém o mesmo refresh token
    scope: data.scope ?? null,
  };
}

/** Tenta renovar o token de UMA conta. Nunca quebra o login em caso de erro. */
export async function refreshAccountTokens(accountId: number): Promise<PlatformRefreshReport> {
  const [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.id, accountId))
    .limit(1);

  if (!account || !account.isConnected) {
    return {
      platform: "spotify",
      state: "error",
      hasAccessToken: false,
      hasRefreshToken: false,
      expiresAt: null,
      renewed: false,
      ok: false,
      message: "Conta não encontrada.",
    };
  }

  const platform = account.platform as "spotify" | "youtube";

  if (!account.refreshToken) {
    const health = tokenHealthForAccount(account)!;
    return { ...health, renewed: false, ok: true };
  }

  if (!needsRefresh(account.expiresAt)) {
    const health = tokenHealthForAccount(account)!;
    return { ...health, renewed: false, ok: true, message: "Token ainda válido — nenhuma renovação necessária." };
  }

  try {
    const result =
      platform === "spotify"
        ? await refreshSpotifyToken(account.refreshToken)
        : await refreshGoogleToken(account.refreshToken);

    const expiresAt = new Date(Date.now() + result.expiresIn * 1000);

    await db
      .update(connectedAccounts)
      .set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? account.refreshToken,
        expiresAt,
        scopes: result.scope ?? account.scopes,
        syncStatus: "synced",
        lastError: null,
        lastSyncedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, account.id));

    return {
      platform,
      state: "valid",
      hasAccessToken: true,
      hasRefreshToken: true,
      expiresAt,
      renewed: true,
      ok: true,
      message: "Token renovado com sucesso no login.",
    };
  } catch (e: any) {
    const message = String(e?.message || "falha na renovação");
    await db
      .update(connectedAccounts)
      .set({ syncStatus: "error", lastError: message.slice(0, 900) })
      .where(eq(connectedAccounts.id, account.id));

    return {
      platform,
      state: "error",
      hasAccessToken: Boolean(account.accessToken),
      hasRefreshToken: true,
      expiresAt: account.expiresAt,
      renewed: false,
      ok: false,
      message: `${message} — reconecte a conta ${platform === "spotify" ? "Spotify" : "YouTube"} para continuar.`,
    };
  }
}

/**
 * Renova os tokens vencidos (ou quase vencidos) de TODAS as contas da sessão.
 * Chamado automaticamente no login e no `/api/auth/me`.
 */
export async function refreshSessionTokens(
  sessionId: string
): Promise<{ spotify: PlatformRefreshReport | null; youtube: PlatformRefreshReport | null }> {
  const rows = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.sessionId, sessionId));

  const spotify = rows.find((r) => r.platform === "spotify") ?? null;
  const youtube = rows.find((r) => r.platform === "youtube") ?? null;

  return {
    spotify: spotify ? await refreshAccountTokens(spotify.id) : null,
    youtube: youtube ? await refreshAccountTokens(youtube.id) : null,
  };
}
