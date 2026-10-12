import { getCredentials } from "./credentials";

/**
 * Converte duração ISO-8601 do YouTube (PT3M25S / PT1H2M3S) para segundos.
 */
export function parseIsoDuration(iso?: string | null): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return 0;
  const hours = Number(m[1] || 0);
  const minutes = Number(m[2] || 0);
  const seconds = Number(m[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Converte segundos para ISO-8601 (usado pela YouTube Data API). */
export function toIsoDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  let out = "PT";
  if (hours) out += `${hours}H`;
  if (minutes) out += `${minutes}M`;
  if (seconds || out === "PT") out += `${seconds}S`;
  return out;
}

/** Cache em memória para não estourar a quota da API durante a sincronização. */
const matchCache = new Map<string, string | null>();
const NEGATIVE: string | null = null;

/**
 * Procura o ID de vídeo oficial no YouTube para uma faixa.
 * Usa a YouTube Data API v3 quando houver chave (env YOUTUBE_API_KEY ou definida no Console Dev).
 * Retorna null quando não há chave disponível — nesse caso o player usa a busca
 * nativa do IFrame (listType=search) como fallback no cliente.
 */
export async function searchYoutubeVideoId(query: string, apiKey?: string | null): Promise<string | null> {
  const q = query.trim().toLowerCase();
  if (!q) return NEGATIVE;
  if (matchCache.has(q)) return matchCache.get(q) ?? NEGATIVE;

  const creds = await getCredentials();
  const key = apiKey || creds.youtubeApiKey;

  if (!key) {
    // Sem chave: não gastamos rede. O player resolve com busca client-side.
    return NEGATIVE;
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoCategoryId", "10"); // Música
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("q", query);
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      matchCache.set(q, NEGATIVE);
      return NEGATIVE;
    }
    const data = await res.json();
    const videoId = data?.items?.[0]?.id?.videoId ?? null;
    matchCache.set(q, videoId);
    return videoId;
  } catch {
    matchCache.set(q, NEGATIVE);
    return NEGATIVE;
  }
}

/** Limpa o cache de matching (útil no Console Dev). */
export function clearMatchCache() {
  matchCache.clear();
}

export function matchCacheSize() {
  return matchCache.size;
}
