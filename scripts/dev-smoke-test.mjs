#!/usr/bin/env node
/**
 * DualWave — smoke tests locais para desenvolvedores.
 *
 * Pré-requisitos:
 *   1. PostgreSQL ligado e schema aplicado: npx drizzle-kit push
 *   2. App rodando: npm run dev
 *   3. Console dev ativo (não definir DISABLE_DEV_CONSOLE=true)
 *
 * Executar:
 *   node scripts/dev-smoke-test.mjs
 *   DUALWAVE_URL=http://localhost:3000 node scripts/dev-smoke-test.mjs
 *
 * O script usa uma sessão temporária própria e apaga somente essa sessão ao final.
 * Não utiliza tokens OAuth e nunca executa a ação destrutiva "wipe-all".
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const baseUrl = (process.env.DUALWAVE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const sessionId = `devtest_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;
const jar = { duo_music_session: sessionId };
let smokeEmail = "";
const passed = [];

function storeCookies(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];
  for (const line of setCookies) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("cookie", Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "));
  if (options.body !== undefined) headers.set("content-type", "application/json");

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(
      `Não consegui acessar ${baseUrl}. Inicie o app com "npm run dev". Detalhe: ${error.message}`
    );
  }

  storeCookies(response);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = data?.error || response.statusText || text;
    throw new Error(`${options.method || "GET"} ${path} respondeu HTTP ${response.status}: ${detail}`);
  }

  return { response, data };
}

function check(description, condition, detail = "") {
  assert.ok(condition, `${description}${detail ? ` — ${detail}` : ""}`);
  passed.push(description);
  console.log(`  ✓ ${description}`);
}

async function run() {
  console.log("\n🎧 DualWave — testes locais de API e PostgreSQL");
  console.log(`   URL: ${baseUrl}`);
  console.log(`   Sessão isolada: ${sessionId}\n`);

  const { data: health } = await request("/api/health");
  check("health check do Next.js e PostgreSQL", health?.ok === true);

  const { data: credentials } = await request("/api/dev/credentials");
  check("Console Dev e rota de credenciais acessíveis", credentials?.success === true);
  check(
    "Redirect URI do Spotify configurado",
    typeof credentials.redirectUris?.spotify === "string" &&
      credentials.redirectUris.spotify.endsWith("/api/auth/spotify/callback")
  );
  check(
    "Redirect URI do YouTube configurado",
    typeof credentials.redirectUris?.youtube === "string" &&
      credentials.redirectUris.youtube.endsWith("/api/auth/youtube/callback")
  );

  const { data: statusBefore } = await request("/api/auth/status");
  check("a sessão de teste foi criada", Boolean(statusBefore?.sessionId));

  const { data: seed } = await request("/api/dev/db", {
    method: "POST",
    body: { action: "seed-demo", platform: "both" },
  });
  check("seed de demonstração gravou dados das duas plataformas", seed?.success === true);
  check(
    "seed incluiu Spotify e YouTube",
    seed.results?.some((item) => item.platform === "spotify") &&
      seed.results?.some((item) => item.platform === "youtube")
  );

  const { data: statusAfter } = await request("/api/auth/status");
  check("status apresenta as duas contas vinculadas", statusAfter?.bothConnected === true);
  check("Spotify possui um accountId", Boolean(statusAfter.spotify?.accountId));
  check("YouTube possui um accountId", Boolean(statusAfter.youtube?.accountId));

  const { data: dbSnapshot } = await request("/api/dev/db?limit=200");
  check("snapshot do banco retorna playlists e faixas", dbSnapshot?.success === true);
  check("snapshot tem playlists de Spotify e YouTube", ["spotify", "youtube"].every((p) =>
    dbSnapshot.playlists.some((playlist) => playlist.platform === p)
  ));
  check("snapshot tem faixas das duas plataformas", ["spotify", "youtube"].every((p) =>
    dbSnapshot.tracks.some((track) => track.platform === p)
  ));

  const { data: searchAll } = await request("/api/search?q=The%20Weeknd&platform=all&category=tracks");
  check("busca unificada retorna resultados", searchAll?.tracks?.length > 0);
  check("busca unificada separa os resultados por origem", Boolean(searchAll?.byPlatform?.spotify && searchAll?.byPlatform?.youtube));

  const { data: searchSpotify } = await request("/api/search?q=The%20Weeknd&platform=spotify&category=tracks");
  check("filtro Spotify não retorna faixas de outra plataforma", searchSpotify?.tracks?.length > 0 &&
    searchSpotify.tracks.every((track) => track.platform === "spotify"));

  const { data: searchYoutube } = await request("/api/search?q=The%20Weeknd&platform=youtube&category=tracks");
  check("filtro YouTube não retorna faixas de outra plataforma", searchYoutube?.tracks?.length > 0 &&
    searchYoutube.tracks.every((track) => track.platform === "youtube"));

  const playlist = dbSnapshot.playlists.find((item) => item.platform === "spotify");
  assert.ok(playlist, "Deveria haver uma playlist Spotify para testar detalhes");
  const { data: detail } = await request(`/api/playlists/${playlist.id}`);
  check("detalhe da playlist carrega suas faixas", detail?.success === true && detail.tracks.length > 0);

  const spotifyTrack = dbSnapshot.tracks.find((track) => track.platform === "spotify");
  const youtubeTrack = dbSnapshot.tracks.find((track) => track.platform === "youtube");
  assert.ok(spotifyTrack && youtubeTrack, "O seed deve fornecer faixas nas duas plataformas");

  const { data: hybrid } = await request("/api/playlists", {
    method: "POST",
    body: {
      title: "Playlist criada pelo smoke test",
      description: "Esta playlist será removida automaticamente no fim do teste.",
      trackIds: [spotifyTrack.id, youtubeTrack.id],
    },
  });
  check("API cria playlist híbrida", hybrid?.success === true && hybrid.playlist?.platform === "hybrid");

  const { data: hybridDetail } = await request(`/api/playlists/${hybrid.playlist.id}`);
  check("playlist híbrida contém faixas das duas origens", hybridDetail?.tracks?.length === 2 &&
    new Set(hybridDetail.tracks.map((track) => track.platform)).size === 2);

  const { data: like } = await request("/api/tracks/like", {
    method: "POST",
    body: { trackId: spotifyTrack.id },
  });
  check("API atualiza like de uma faixa", like?.success === true && typeof like.isLiked === "boolean");

  // ---------- Contas DualWave (registro, login, tokens, logout) ----------
  smokeEmail = `smoke_${Date.now().toString(36)}@dualwave.test`;

  const { data: registered } = await request("/api/auth/register", {
    method: "POST",
    body: {
      email: smokeEmail,
      password: "smoke-pass-123",
      displayName: "Smoke Test",
      devCode: "dualwave-dev",
    },
  });
  check("registro cria conta e loga automaticamente", registered?.success === true && Boolean(registered.user?.id));
  check("conta de teste criada como dev", registered.user?.role === "dev");
  check(
    "dados anônimos migrados para a conta (playlists preservadas)",
    registered.migration != null && registered.sessionId === `u_${registered.user.id}`
  );

  const { data: me } = await request("/api/auth/me");
  check("sessão retorna o usuário logado", me?.success === true && me.user?.email === smokeEmail);
  check("login verifica a saúde dos tokens das duas plataformas", Boolean(me?.tokenHealth?.spotify && me?.tokenHealth?.youtube));

  const { data: statusUser } = await request("/api/auth/status");
  check("status passa a responder no contexto da conta", statusUser?.success === true && statusUser.user?.email === smokeEmail);
  check("contas vinculadas aparecem na sessão da conta", statusUser?.anyConnected === true);

  const { data: logout } = await request("/api/auth/logout", { method: "POST" });
  check("logout encerra a sessão de login", logout?.success === true);

  const { data: meAfter } = await request("/api/auth/me");
  check("após logout não há usuário logado", meAfter?.success === true && meAfter.user === null);

  const { data: relogin } = await request("/api/auth/login", {
    method: "POST",
    body: { email: smokeEmail, password: "smoke-pass-123" },
  });
  check("login com e-mail e senha restaura a conta", relogin?.success === true && relogin.user?.email === smokeEmail);
  check("re-login retorna a saúde dos tokens (renovação automática)", Boolean(relogin?.tokenHealth));

  const { data: badLoginRes } = await request("/api/auth/login", {
    method: "POST",
    body: { email: smokeEmail, password: "senha-errada-123" },
  }).then(
    (ok) => ({ data: ok.data }),
    () => ({ data: null })
  ).catch(() => ({ data: null }));
  check("login com senha errada é rejeitado", badLoginRes === null || badLoginRes?.success !== true);

  console.log(`\n✅ ${passed.length} verificações passaram.`);
}

let testFailed = false;
try {
  await run();
} catch (error) {
  testFailed = true;
  console.error(`\n❌ Teste falhou: ${error?.stack || error}`);
} finally {
  try {
    if (smokeEmail) {
      await request("/api/dev/db", {
        method: "POST",
        body: { action: "delete-user", email: smokeEmail },
      }).catch(() => null);
      console.log("🧹 Usuário de teste removido do banco local.");
    }
    const { data } = await request("/api/dev/db", {
      method: "POST",
      body: { action: "wipe-session" },
    });
    if (data?.success) {
      console.log("🧹 Sessão de teste isolada removida do banco local.\n");
    } else {
      console.warn("⚠️ Não foi possível limpar a sessão temporária.\n");
      testFailed = true;
    }
  } catch (error) {
    console.warn(`⚠️ Falha ao limpar a sessão temporária: ${error.message}\n`);
    testFailed = true;
  }
}

if (testFailed) process.exitCode = 1;
