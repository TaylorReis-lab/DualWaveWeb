#!/usr/bin/env node
/** DualWave — inicialização local e Docker sem editar package.json. */
import { spawn } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const command = args[0] || "dev";
const flags = new Set(args.slice(1));
const supported = new Set([
  "init", "dev", "setup", "build", "start", "test",
  "db:up", "db:down", "db:status", "db:logs", "db:push", "db:migrate", "db:generate",
  "docker:up", "docker:down", "docker:status", "docker:logs", "help", "--help", "-h",
]);
let activeChild = null;
let interrupted = false;

function help() {
  console.log(`
DualWave — subir aplicação e PostgreSQL

  node scripts/run-local.mjs dev       Banco Docker + schema + Next.js dev (padrão)
  node scripts/run-local.mjs setup     Prepara banco e schema, sem iniciar servidor
  node scripts/run-local.mjs init      Cria .env se necessário e instala dependências
  node scripts/run-local.mjs build     Gera o build standalone de produção
  node scripts/run-local.mjs start     Banco + migrations + build + servidor de produção
  node scripts/run-local.mjs test      Executa smoke tests (app dev já deve estar rodando)

  node scripts/run-local.mjs db:up       Inicia apenas PostgreSQL e aguarda health check
  node scripts/run-local.mjs db:down     Para PostgreSQL, sem apagar o volume
  node scripts/run-local.mjs db:status   Estado do banco Docker
  node scripts/run-local.mjs db:logs     Acompanha os logs do banco
  node scripts/run-local.mjs db:push     Aplica schema direto (desenvolvimento)
  node scripts/run-local.mjs db:migrate  Aplica migrations versionadas (banco novo/gerenciado)
  node scripts/run-local.mjs db:generate Gera migrations depois de alterar schema.ts

  node scripts/run-local.mjs docker:up     Aplicação + banco + migrations em containers
  node scripts/run-local.mjs docker:down   Para containers, preservando os dados
  node scripts/run-local.mjs docker:status Mostra os containers do modo completo
  node scripts/run-local.mjs docker:logs   Acompanha os logs do modo completo

Flags para dev/setup/start:
  --existing-db  Usa DATABASE_URL sem iniciar Docker (PostgreSQL já instalado)
  --skip-schema  Não aplica schema/migrations (somente quando já estiver atualizado)

Portas e URLs vêm de .env/.env.local. Detalhes: RUNNING.md.
Sem segredos no repositório: .env existente nunca é substituído pelo modelo.
`);
}

function run(program, params, options = {}) {
  return new Promise((resolve, reject) => {
    if (interrupted) return reject(new Error("Execução interrompida."));
    let output = "";
    const inspectOutput = Boolean(options.inspectOutput);
    const child = spawn(program, params, {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: inspectOutput ? ["inherit", "pipe", "pipe"] : "inherit",
      // npm.cmd exige shell no Windows; os argumentos são comandos internos fixos.
      shell: process.platform === "win32" && program === "npm",
    });
    activeChild = child;
    if (inspectOutput) {
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        process.stdout.write(chunk);
      });
      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
        process.stderr.write(chunk);
      });
    }
    child.once("error", (error) => {
      activeChild = null;
      reject(new Error(`Não foi possível executar ${program}: ${error.message}`));
    });
    child.once("close", (code, signal) => {
      activeChild = null;
      if (interrupted || signal) return reject(new Error("Execução interrompida."));
      if (code !== 0) return reject(new Error(`${program} terminou com código ${code}.`));
      // Algumas versões do drizzle-kit imprimem erros mas retornam código zero.
      if (inspectOutput && /(?:^|\n)\s*(?:error:|Error:|FATAL:|AggregateError)/m.test(output)) {
        return reject(new Error("O Drizzle reportou erro. Confira o log acima; o schema NÃO foi confirmado."));
      }
      resolve();
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    if (activeChild) activeChild.kill(signal);
    else process.exitCode = 130;
  });
}

function createEnvironmentIfMissing() {
  const path = join(root, ".env");
  if (existsSync(path)) return;
  const password = randomBytes(24).toString("hex");
  const invitation = `dev_${randomBytes(24).toString("hex")}`;
  const template = readFileSync(join(root, ".env.example"), "utf8")
    .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${password}`)
    .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=postgresql://postgres:${password}@127.0.0.1:5432/app_db`)
    .replace(/^DEV_SIGNUP_CODE=.*$/m, `DEV_SIGNUP_CODE=${invitation}`);
  writeFileSync(path, template, { flag: "wx", mode: 0o600 });
  console.log("✓ .env criado com senha de banco e convite dev aleatórios. Guarde este arquivo em segurança.");
}

async function ensureDependencies() {
  const installed = existsSync(join(root, "node_modules/next/package.json")) &&
    existsSync(join(root, "node_modules/drizzle-kit/package.json")) &&
    existsSync(join(root, "node_modules/dotenv/package.json"));
  if (installed) return;
  console.log("Instalando dependências...");
  await run("npm", [existsSync(join(root, "package-lock.json")) ? "ci" : "install"]);
}

async function loadEnvironment() {
  const { config } = await import("dotenv");
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  config({
    path: [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"],
    quiet: true,
  });
}

function appPort() {
  const port = Number(process.env.APP_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("APP_PORT precisa ser um número entre 1 e 65535.");
  }
  return port;
}

function databaseSettings() {
  let url;
  try {
    url = new URL(process.env.DATABASE_URL || "");
  } catch {
    throw new Error("DATABASE_URL inválida. Configure a conexão PostgreSQL em .env ou .env.local.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL deve usar postgresql:// ou postgres://.");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "") || "app_db"),
  };
}

async function compose(params, full = false) {
  const settings = databaseSettings();
  if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(settings.host)) {
    throw new Error("O banco gerenciado pelo Docker deve ser local. Para banco externo use --existing-db.");
  }
  if (!settings.password) throw new Error("Defina uma senha em DATABASE_URL antes de iniciar o banco Docker.");
  const project = process.env.COMPOSE_PROJECT_NAME || (full ? "dualwave-app" : "dualwave-dev");
  const encoded = encodeURIComponent;
  const env = {
    POSTGRES_USER: settings.user,
    POSTGRES_PASSWORD: settings.password,
    POSTGRES_DB: settings.database,
    POSTGRES_PORT: String(settings.port),
    DATABASE_URL_DOCKER: `postgresql://${encoded(settings.user)}:${encoded(settings.password)}@db:5432/${encoded(settings.database)}`,
  };
  const files = ["--file", "compose.yaml"];
  if (full) files.push("--file", "compose.app.yaml");
  await run("docker", ["compose", "--project-name", project, "--env-file", ".env", ...files, ...params], { env });
}

async function checkDocker() {
  try {
    await run("docker", ["compose", "version"]);
  } catch {
    throw new Error("Instale/inicie Docker Desktop ou Docker Engine com Compose v2.20+. Para PostgreSQL já instalado use dev --existing-db.");
  }
}

async function drizzle(operation) {
  console.log(`Drizzle Kit: ${operation}`);
  if (operation === "migrate") {
    console.log("Migrations exigem banco novo ou já gerenciado por migrations. Banco criado com push precisa de baseline; veja RUNNING.md.");
  }
  await run(process.execPath, [join(root, "node_modules/drizzle-kit/bin.cjs"), operation], { inspectOutput: true });
}

async function prepareDatabase(production = false) {
  if (!flags.has("--existing-db")) {
    await checkDocker();
    await compose(["up", "--detach", "--wait", "--wait-timeout", "120", "db"]);
  } else {
    const settings = databaseSettings();
    console.log(`Usando PostgreSQL existente em ${settings.host}:${settings.port} (sem Docker).`);
  }
  if (!flags.has("--skip-schema")) await drizzle(production ? "migrate" : "push");
  console.log("✓ Etapa de preparação do banco concluída.");
}

function ensureContainerInvitation() {
  if (process.env.DEV_SIGNUP_CODE?.trim() && process.env.DEV_SIGNUP_CODE !== "dualwave-dev") return;
  const invitation = `dev_${randomBytes(24).toString("hex")}`;
  const envPath = join(root, ".env");
  const text = readFileSync(envPath, "utf8");
  const line = `DEV_SIGNUP_CODE=${invitation}`;
  if (/^DEV_SIGNUP_CODE=.*$/m.test(text)) {
    writeFileSync(envPath, text.replace(/^DEV_SIGNUP_CODE=.*$/m, line), { mode: 0o600 });
  } else {
    appendFileSync(envPath, `\n# Convite privado gerado para execução containerizada\n${line}\n`);
  }
  process.env.DEV_SIGNUP_CODE = invitation;
  console.log("✓ Convite dev privado gerado em .env (sem exibir o valor nos logs).");
}

async function waitForApplication() {
  const url = `http://127.0.0.1:${appPort()}/api/health`;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (interrupted) throw new Error("Execução interrompida.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const body = await response.json();
      if (response.ok && body.ok === true) {
        console.log(`✓ Aplicação e PostgreSQL responderam ao health check: ${url}`);
        return;
      }
    } catch {
      // Ainda iniciando: aguarda abaixo.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Aplicação não ficou saudável. Confira: node scripts/run-local.mjs docker:logs");
}

async function main() {
  if (["help", "--help", "-h"].includes(command) || flags.has("--help")) return help();
  if (!supported.has(command)) throw new Error(`Comando desconhecido: ${command}. Use --help.`);
  for (const flag of flags) {
    if (!["--existing-db", "--skip-schema"].includes(flag)) throw new Error(`Opção desconhecida: ${flag}. Use --help.`);
  }
  if (flags.size && !["dev", "setup", "start"].includes(command)) {
    throw new Error("--existing-db e --skip-schema são opções de dev/setup/start.");
  }
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 9)) throw new Error("Next.js 16 exige Node 20.9+. Recomendado: Node 22 LTS.");

  // Não substitui o .env existente. O build/servidor usa a mesma precedência do Next.js.
  createEnvironmentIfMissing();
  await ensureDependencies();
  if (["build", "start"].includes(command)) process.env.NODE_ENV = "production";
  else if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
  await loadEnvironment();
  // Apenas para exibição no console. NÃO alimenta os redirect URIs do OAuth:
  // a origem real vem do host acessado pelo navegador, pois Spotify e Google
  // tratam "localhost" e "127.0.0.1" como redirect URIs diferentes.
  // Para fixar uma origem, defina NEXT_PUBLIC_APP_URL ou OAUTH_REDIRECT_ORIGIN.
  if (!process.env.APP_URL) process.env.APP_URL = `http://127.0.0.1:${appPort()}`;

  switch (command) {
    case "init":
      console.log("✓ Ambiente e dependências prontos. Próximo passo: node scripts/run-local.mjs dev");
      return;
    case "setup":
      return prepareDatabase();
    case "dev":
      await prepareDatabase();
      console.log(`\nDualWave em ${process.env.APP_URL}\nConsole Dev em ${process.env.APP_URL}/dev\nCtrl+C encerra o app; os dados do banco ficam preservados.\n`);
      return run(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", process.env.APP_BIND_ADDRESS || "127.0.0.1", "--port", String(appPort())]);
    case "build":
      return run("npm", ["run", "build"]);
    case "start":
      // O servidor local de produção não deve expor ferramentas destrutivas.
      process.env.DISABLE_DEV_CONSOLE = "true";
      ensureContainerInvitation();
      await prepareDatabase(true);
      await run("npm", ["run", "build"]);
      if (existsSync(join(root, "public"))) cpSync(join(root, "public"), join(root, ".next/standalone/public"), { recursive: true });
      cpSync(join(root, ".next/static"), join(root, ".next/standalone/.next/static"), { recursive: true });
      console.log(`Servidor de produção em ${process.env.APP_URL}. Em domínio público, use HTTPS.`);
      return run(process.execPath, [join(root, ".next/standalone/server.js")], {
        env: { PORT: String(appPort()), HOSTNAME: process.env.APP_BIND_ADDRESS || "127.0.0.1" },
      });
    case "test":
      return run(process.execPath, [join(root, "scripts/dev-smoke-test.mjs")], {
        env: { DUALWAVE_URL: process.env.DUALWAVE_URL || `http://127.0.0.1:${appPort()}` },
      });
    case "db:push": return drizzle("push");
    case "db:migrate": return drizzle("migrate");
    case "db:generate": return drizzle("generate");
    case "db:up":
      await checkDocker();
      return compose(["up", "--detach", "--wait", "--wait-timeout", "120", "db"]);
    case "db:down":
      await checkDocker();
      return compose(["stop", "db"]);
    case "db:status":
      await checkDocker();
      return compose(["ps", "--all"]);
    case "db:logs":
      await checkDocker();
      return compose(["logs", "--follow", "db"]);
    case "docker:up":
      await checkDocker();
      ensureContainerInvitation();
      await compose(["up", "--detach", "--build"], true);
      await waitForApplication();
      console.log(`DualWave em ${process.env.APP_URL}. Console Dev desativado neste modo.`);
      return;
    case "docker:down":
      await checkDocker();
      ensureContainerInvitation();
      return compose(["down"], true); // Sem --volumes: preserva o PostgreSQL.
    case "docker:status":
      await checkDocker();
      ensureContainerInvitation();
      return compose(["ps", "--all"], true);
    case "docker:logs":
      await checkDocker();
      ensureContainerInvitation();
      return compose(["logs", "--follow"], true);
  }
}

try {
  await main();
} catch (error) {
  if (interrupted) {
    console.log("\nExecução encerrada; os volumes de banco foram preservados.");
    process.exitCode = 130;
  } else {
    console.error(`\n❌ ${error.message}`);
    process.exitCode = 1;
  }
}
