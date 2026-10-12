import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Chave especial usada para guardar as credenciais GLOBAIS de desenvolvimento
 * (definidas pelo Console Dev em /dev) na tabela app_settings.
 * Isso permite configurar Spotify/Google sem precisar reiniciar o servidor com .env.
 */
export const DEV_CREDENTIALS_KEY = "__dev_console__";

export interface ResolvedCredentials {
  spotifyClientId: string | null;
  spotifyClientSecret: string | null;
  googleClientId: string | null;
  googleClientSecret: string | null;
  youtubeApiKey: string | null;
  spotifySource: "env" | "db" | null;
  googleSource: "env" | "db" | null;
  spotifyReady: boolean;
  googleReady: boolean;
}

/** O console dev fica ativo por padrão; desative em produção com DISABLE_DEV_CONSOLE=true */
export function isDevConsoleEnabled(): boolean {
  return process.env.DISABLE_DEV_CONSOLE !== "true";
}

export function isDevRuntime(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Descobre a origem PÚBLICA da aplicação (importante atrás de proxy/preview).
 * Ordem: NEXT_PUBLIC_APP_URL → x-forwarded-host/proto → URL da requisição → localhost.
 * O redirect URI do OAuth precisa bater EXATAMENTE com o cadastrado nos painéis.
 */
export function getOrigin(req?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (req) {
    const h = req.headers;
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() || "http";
    const forwardedHost = (h.get("x-forwarded-host") || "").split(",")[0].trim();
    const hostHeader = (h.get("host") || "").split(",")[0].trim();
    const candidate = forwardedHost || hostHeader;

    if (candidate && !candidate.startsWith("0.0.0.0") && !candidate.startsWith("127.0.0.1")) {
      return `${proto}://${candidate}`;
    }

    const urlOrigin = new URL(req.url).origin;
    if (!urlOrigin.includes("0.0.0.0") && !urlOrigin.includes("127.0.0.1")) return urlOrigin;
  }

  return "http://localhost:3000";
}

export function getRedirectUris(origin: string) {
  return {
    spotify: `${origin}/api/auth/spotify/callback`,
    youtube: `${origin}/api/auth/youtube/callback`,
  };
}

export async function getDevCredentialsRow() {
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.sessionId, DEV_CREDENTIALS_KEY))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve as credenciais com prioridade: variáveis de ambiente (.env) → banco local (Console Dev).
 */
export async function getCredentials(): Promise<ResolvedCredentials> {
  const row = await getDevCredentialsRow();

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || row?.spotifyClientId || null;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || row?.spotifyClientSecret || null;
  const googleClientId = process.env.GOOGLE_CLIENT_ID || row?.googleClientId || null;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || row?.googleClientSecret || null;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY || row?.youtubeApiKey || null;

  return {
    spotifyClientId,
    spotifyClientSecret,
    googleClientId,
    googleClientSecret,
    youtubeApiKey,
    spotifySource: process.env.SPOTIFY_CLIENT_ID ? "env" : row?.spotifyClientId ? "db" : null,
    googleSource: process.env.GOOGLE_CLIENT_ID ? "env" : row?.googleClientId ? "db" : null,
    spotifyReady: Boolean(spotifyClientId),
    googleReady: Boolean(googleClientId && googleClientSecret),
  };
}

export function maskSecret(value?: string | null): string | null {
  if (!value) return null;
  if (value.length <= 6) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

export interface CredentialInput {
  spotifyClientId?: string | null;
  spotifyClientSecret?: string | null;
  googleClientId?: string | null;
  googleClientSecret?: string | null;
  youtubeApiKey?: string | null;
}

/** Salva as credenciais no banco local (rota usada pelo Console Dev). */
export async function saveDevCredentials(input: CredentialInput) {
  const existing = await getDevCredentialsRow();

  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const payload = {
    spotifyClientId: clean(input.spotifyClientId),
    spotifyClientSecret: clean(input.spotifyClientSecret),
    googleClientId: clean(input.googleClientId),
    googleClientSecret: clean(input.googleClientSecret),
    youtubeApiKey: clean(input.youtubeApiKey),
  };

  if (existing) {
    const merged = {
      spotifyClientId: payload.spotifyClientId ?? existing.spotifyClientId,
      spotifyClientSecret: payload.spotifyClientSecret ?? existing.spotifyClientSecret,
      googleClientId: payload.googleClientId ?? existing.googleClientId,
      googleClientSecret: payload.googleClientSecret ?? existing.googleClientSecret,
      youtubeApiKey: payload.youtubeApiKey ?? existing.youtubeApiKey,
    };
    await db.update(appSettings).set(merged).where(eq(appSettings.id, existing.id));
    return merged;
  }

  const [created] = await db
    .insert(appSettings)
    .values({
      sessionId: DEV_CREDENTIALS_KEY,
      devMode: true,
      ...payload,
    })
    .returning();
  return created;
}
