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
 * Normaliza uma origem para a forma canônica usada nos redirect URIs.
 * Spotify e Google comparam a URI caractere por caractere, então detalhes como
 * "localhost" vs "127.0.0.1", porta padrão explícita ou barra final causam o erro
 * "redirect_uri: Not matching configuration" / "redirect_uri_mismatch".
 */
export function normalizeOrigin(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    let host = url.hostname.toLowerCase().replace(/\.$/, "");
    const port = url.port;

    // Remove a porta padrão do protocolo; provedores não a esperam na URI.
    const isDefaultPort = (url.protocol === "https:" && port === "443") || (url.protocol === "http:" && port === "80");
    const normalizedPort = isDefaultPort ? "" : port;

    // Endereços de escuta do Docker/Node não são acessíveis pelo navegador.
    if (!host || host === "0.0.0.0" || host === "[::]" || host === "::") return null;

    return `${url.protocol}//${host}${normalizedPort ? `:${normalizedPort}` : ""}`;
  } catch {
    return null;
  }
}

export interface OriginResolution {
  origin: string;
  /** Qual fonte definiu a origem — útil para diagnosticar o mismatch. */
  source: "oauth_override" | "public_env" | "request_host" | "app_url" | "default";
  /** Host que o navegador realmente usou nesta requisição, quando disponível. */
  browsedHost: string | null;
}

/**
 * Descobre a origem PÚBLICA da aplicação.
 *
 * Ordem: OAUTH_REDIRECT_ORIGIN → NEXT_PUBLIC_APP_URL → host da requisição →
 * APP_URL (último recurso, sem cabeçalhos) → localhost.
 *
 * O host da requisição tem prioridade sobre APP_URL porque, em loopback, o app
 * iniciado por run-local define APP_URL=http://127.0.0.1:3000 enquanto o usuário
 * pode estar acessando por http://localhost:3000 — e os provedores tratam os dois
 * como redirect URIs DIFERENTES.
 */
export function resolveOrigin(req?: Request): OriginResolution {
  const override = normalizeOrigin(process.env.OAUTH_REDIRECT_ORIGIN || "");
  if (override) return { origin: override, source: "oauth_override", browsedHost: browsedHostOf(req) };

  const publicEnv = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || "");
  if (publicEnv) return { origin: publicEnv, source: "public_env", browsedHost: browsedHostOf(req) };

  if (req) {
    const proto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim() || "http";
    const forwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim();
    const hostHeader = (req.headers.get("host") || "").split(",")[0].trim();
    const candidate = forwardedHost || hostHeader;

    const fromHeaders = candidate ? normalizeOrigin(`${proto}://${candidate}`) : null;
    if (fromHeaders) return { origin: fromHeaders, source: "request_host", browsedHost: candidate };

    const fromUrl = normalizeOrigin(new URL(req.url).origin);
    if (fromUrl) return { origin: fromUrl, source: "request_host", browsedHost: candidate };
  }

  const appUrl = normalizeOrigin(process.env.APP_URL || "");
  if (appUrl) return { origin: appUrl, source: "app_url", browsedHost: browsedHostOf(req) };

  return { origin: "http://localhost:3000", source: "default", browsedHost: browsedHostOf(req) };
}

function browsedHostOf(req?: Request): string | null {
  if (!req) return null;
  const forwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  const hostHeader = (req.headers.get("host") || "").split(",")[0].trim();
  return forwardedHost || hostHeader || null;
}

/**
 * Origem usada nos redirect URIs. Mantida para compatibilidade com as rotas OAuth.
 */
export function getOrigin(req?: Request): string {
  return resolveOrigin(req).origin;
}

/** URIs exatos que precisam estar cadastrados no Spotify / Google Cloud. */
export function getRedirectUris(origin: string) {
  return {
    spotify: `${origin}/api/auth/spotify/callback`,
    youtube: `${origin}/api/auth/youtube/callback`,
  };
}

/**
 * Todas as variantes de loopback que vale cadastrar de uma vez, para o login
 * funcionar por "localhost" E por "127.0.0.1" (os provedores as diferenciam).
 * Para domínios não-loopback, só há a variante própria.
 */
export function getRedirectUriCandidates(origin: string) {
  const urls = new URL(origin);
  const host = urls.hostname.toLowerCase();
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  const portSuffix = urls.port ? `:${urls.port}` : "";
  const loopbackHosts = isLoopback ? ["localhost", "127.0.0.1"] : [host];

  const bases = loopbackHosts.map((candidate) => `${urls.protocol}//${candidate}${portSuffix}`);

  return {
    spotify: bases.map((base) => `${base}/api/auth/spotify/callback`),
    youtube: bases.map((base) => `${base}/api/auth/youtube/callback`),
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
