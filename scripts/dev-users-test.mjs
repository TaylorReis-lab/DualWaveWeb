#!/usr/bin/env node
/**
 * Testes de integração: devs logados, favicon e créditos do DualWave.
 *
 * Pré-requisitos: schema aplicado, app rodando e Console Dev habilitado.
 * Execute: node scripts/dev-users-test.mjs
 * Outra URL: DUALWAVE_URL=http://localhost:3001 node scripts/dev-users-test.mjs
 * Se personalizou DEV_SIGNUP_CODE, forneça o mesmo código ao script via env.
 *
 * Cria somente contas fictícias. Não modifica o usuário do mantenedor,
 * credenciais OAuth globais ou dados de outras contas; nunca usa wipe-all.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const baseUrl = (process.env.DUALWAVE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const runId = `${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
const signupCode = process.env.DEV_SIGNUP_CODE || "dualwave-dev";
const clients = [];
const createdUsers = [];
let checks = 0;

function makeClient(name) {
  const musicId = `devtest_presence_${runId}_${name}`;
  const client = { initialMusicId: musicId, cookies: { duo_music_session: musicId } };
  clients.push(client);
  return client;
}

function storeCookies(client, response) {
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) client.cookies[pair.slice(0, index)] = pair.slice(index + 1);
  }
}

async function call(client, path, { method = "GET", body, expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Cookie: Object.entries(client.cookies).map(([key, value]) => `${key}=${value}`).join("; "),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  storeCookies(client, response);
  const data = await response.json();
  assert.equal(response.status, expectedStatus, `${method} ${path}: ${data.error || "status inesperado"}`);
  return { data, response };
}

function check(label, condition) {
  assert.ok(condition, label);
  checks++;
  console.log(`  ✓ ${label}`);
}

async function register(client, suffix, isDev) {
  const email = `presence_${runId}_${suffix}@dualwave.test`;
  const { data } = await call(client, "/api/auth/register", {
    method: "POST",
    body: {
      email,
      password: `Test-${runId}-pass`,
      displayName: `Teste de presença ${suffix}`,
      ...(isDev ? { devCode: signupCode } : {}),
    },
  });
  assert.equal(data.success, true, "Falha ao criar conta temporária");
  createdUsers.push(data.user);
  assert.equal(data.user.role, isDev ? "dev" : "user", "O código dev deve ser igual ao configurado no servidor");
  return data.user;
}

async function fetchAsset(path) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `Asset indisponível: ${path}`);
  return response;
}

async function run() {
  console.log(`\nDualWave — sessões dev, ícones e créditos\nURL: ${baseUrl}\n`);
  const guest = makeClient("guest");
  const viewer = makeClient("viewer");
  const target = makeClient("target");
  const secondDevice = makeClient("second");
  const regular = makeClient("regular");

  const { data: deniedGuest } = await call(guest, "/api/dev/users", { expectedStatus: 401 });
  check("visitantes não conseguem listar desenvolvedores", deniedGuest.success === false && deniedGuest.users === undefined);

  const viewerUser = await register(viewer, "viewer", true);
  const targetUser = await register(target, "target", true);
  const regularUser = await register(regular, "regular", false);

  const { data: deniedRegular } = await call(regular, "/api/dev/users", { expectedStatus: 403 });
  check("usuários comuns não conseguem listar sessões dev", deniedRegular.success === false && deniedRegular.users === undefined);

  const { data: firstList, response: firstResponse } = await call(viewer, "/api/dev/users");
  check("conta dev autenticada pode consultar a lista", firstList.success === true && Array.isArray(firstList.users));
  check("o painel identifica o desenvolvedor atual", firstList.users.some((user) => user.id === viewerUser.id && user.isCurrentUser));
  check("o outro desenvolvedor logado aparece na lista", firstList.users.some((user) => user.id === targetUser.id));
  check("contas comuns não aparecem na lista", !firstList.users.some((user) => user.id === regularUser.id));
  check("somente sessões não expiradas aparecem", firstList.users.every((user) => Date.parse(user.expiresAt) > Date.now()));
  check("a atividade recente é registrada", firstList.users.find((user) => user.id === viewerUser.id)?.recentlyActive === true);
  check("respostas são privadas e sem cache", firstResponse.headers.get("cache-control")?.includes("no-store") && firstResponse.headers.get("vary")?.includes("Cookie"));

  const blockedFields = ["password", "passwordHash", "password_hash", "token", "accessToken", "refreshToken", "rawProfile"];
  check("a lista não contém senhas ou tokens", firstList.users.every((user) => blockedFields.every((field) => !(field in user))));

  await call(secondDevice, "/api/auth/login", {
    method: "POST",
    body: { email: targetUser.email, password: `Test-${runId}-pass` },
  });
  const { data: multiple } = await call(viewer, "/api/dev/users");
  const targetRows = multiple.users.filter((user) => user.id === targetUser.id);
  check("múltiplos logins não duplicam o desenvolvedor", targetRows.length === 1);
  check("múltiplos dispositivos são contados como sessões", targetRows[0].activeSessions === 2);
  check("os totais correspondem às sessões retornadas", multiple.totals.sessions === multiple.users.reduce((sum, user) => sum + user.activeSessions, 0));

  await call(target, "/api/auth/logout", { method: "POST" });
  const { data: oneDevice } = await call(viewer, "/api/dev/users");
  check("logout em um dispositivo decrementa as sessões", oneDevice.users.find((user) => user.id === targetUser.id)?.activeSessions === 1);

  await call(secondDevice, "/api/auth/logout", { method: "POST" });
  const { data: afterLogout } = await call(viewer, "/api/dev/users");
  check("desenvolvedor sem sessões é removido da lista", !afterLogout.users.some((user) => user.id === targetUser.id));
  await call(target, "/api/dev/users", { expectedStatus: 401 });
  check("logout remove a permissão de consulta", true);

  const svgResponse = await fetchAsset("/icon.svg");
  const svg = await svgResponse.text();
  check("favicon SVG é servido corretamente", svgResponse.headers.get("content-type")?.includes("image/svg+xml") && svg.includes("DualWave"));

  const ico = Buffer.from(await (await fetchAsset("/favicon.ico")).arrayBuffer());
  check("favicon ICO contém os três tamanhos", ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 3);

  const apple = Buffer.from(await (await fetchAsset("/apple-icon.png")).arrayBuffer());
  check("ícone Apple é um PNG de 180 px", apple.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && apple.readUInt32BE(16) === 180 && apple.readUInt32BE(20) === 180);

  const credits = await (await fetchAsset("/creditos")).text();
  check("créditos públicos apresentam os dados de Taylor Reis", ["Taylor Reis", "TaylorReis-lab", "taylor-reis@outlook.com", "https://taylorreis.netlify.app"].every((value) => credits.includes(value)));
  const appHtml = await (await fetchAsset("/")).text();
  check("autoria e ícones constam no HTML do app", appHtml.includes('name="author" content="Taylor Reis"') && appHtml.includes("/favicon.ico") && appHtml.includes("/icon.svg"));

  console.log(`\n${checks} verificações passaram.`);
}

async function cleanup() {
  const cleaner = makeClient("cleaner");
  for (const user of createdUsers) {
    await call(cleaner, "/api/dev/db", {
      method: "POST",
      body: { action: "delete-user", email: user.email },
    });
  }
  const sessionIds = new Set([
    ...clients.flatMap((client) => [client.initialMusicId, client.cookies.duo_music_session]),
    ...createdUsers.map((user) => `u_${user.id}`),
  ].filter(Boolean));
  for (const id of sessionIds) {
    cleaner.cookies = { duo_music_session: id };
    await call(cleaner, "/api/dev/db", { method: "POST", body: { action: "wipe-session" } });
  }
  console.log("Contas e sessões temporárias removidas.\n");
}

try {
  await run();
} catch (error) {
  console.error(`\nFalha: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error(`Falha na limpeza: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
