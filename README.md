# 🎵 DualWave — Spotify + YouTube Music Hub

> **O hub de música unificado e open source que junta Spotify e YouTube Music numa única interface.**  
> Conecte as duas contas, tenha todas as playlists e músicas sincronizadas, escute diretamente por um player global, e pesquise nos dois catálogos ao mesmo tempo com filtros por plataforma.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## ✨ Visão Geral

O **DualWave** é uma aplicação web fullstack que unifica a experiência das duas maiores plataformas de streaming de música do mundo: Spotify e YouTube Music.

Em vez de ficar trocando de aba ou app para encontrar uma música que está no YouTube mas não no Spotify — ou vice-versa — o DualWave sincroniza a biblioteca do usuário de ambos os serviços em um banco de dados local, oferece um player global que decide automaticamente a melhor fonte (áudio oficial do Spotify ou vídeo/áudio completo do YouTube), e uma busca inteligente que retorna resultados combinados com filtros.

> 🎯 **Missão**: "Todas as suas músicas. Zero barreiras."

---

## 🚀 Funcionalidades Principais

| 🔐 Autenticação | 📚 Biblioteca Unificada | 🔎 Busca Inteligente | 🎛️ Player Global |
|---|---|---|---|
| Login oficial OAuth 2.0 do Spotify (opcional com credenciais reais) | Playlists do Spotify sincronizadas | Pesquisa em tempo real nos dois catálogos | Player persistente com barra inferior fixa |
| Login oficial OAuth 2.0 do Google / YouTube Music (opcional) | Playlists do YouTube Music sincronizadas | Filtro rápido por plataforma (Spotify / YouTube / Ambos) | Reproduz faixas do YouTube diretamente via IFrame API (música completa, não só prévia de 30s) |
| Modo sandbox instantâneo 1-clique com dados de demonstração ricos (não precisa de credenciais) | Sistema de **Playlists Híbridas** (mistura faixas das duas plataformas em uma playlist só) | Filtro por tipo (Músicas / Playlists) | Suporte a visualização lado-a-lado (colunas Spotify vs YouTube) |
| Logout independente por plataforma | Músicas Curtidas unificadas (favoritos) | Sugestões rápidas de termos populares | Prévias de 30s do Spotify quando não há vídeo do YouTube |
| | | Histórico de buscas salvo por sessão | Controles completos: play/pause, próximo, anterior, aleatório, repetir uma/todas, volume, seek, mutar |

**Funcionalidades adicionais:**
- 📺 **Popout do videoclipe** — assista ao vídeo oficial do YouTube enquanto navega pelo app
- 📋 **Fila de reprodução** persistente com drawer lateral
- ❤️ Curtir/descurtir faixas sincronizado com o banco de dados
- 🔄 **Clonagem / Migração de playlists** — copie uma playlist do Spotify para o YouTube e vice-versa com um clique
- 🎨 **Interface escura moderna** inspirada nos apps oficiais, com cores características de cada plataforma
- 📱 Layout totalmente responsivo (desktop, tablet, mobile com navegação inferior)
- 🔁 Sincronização automática de metadados e mapeamento YouTube ⇄ Spotify

---

## 🧰 Stack Tecnológico

| Camada | Tecnologias |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Lucide Icons |
| **Backend** | Next.js Route Handlers (API REST) · Drizzle ORM |
| **Banco de Dados** | PostgreSQL 15 |
| **Autenticação** | OAuth 2.0 (Spotify Web API + Google APIs / YouTube Data v3) · Cookies de sessão anônimos |
| **Reprodução** | YouTube IFrame Player API (áudio completo) · HTML5 `<audio>` (prévias do Spotify) |
| **Deploy / Ambiente** | Node.js · Runtime gerenciado pela plataforma |

---

## 🏗️ Arquitetura

O projeto está organizado de forma limpa e escalável:

```
dualwave/
├── src/
│   ├── app/
│   │   ├── api/                # API Routes (autenticação, playlists, busca, tracks)
│   │   │   ├── auth/           # OAuth (Spotify/YouTube status, connect, callbacks)
│   │   │   ├── playlists/      # CRUD de playlists + clone entre plataformas
│   │   │   ├── tracks/         # Like / faixas curtidas
│   │   │   ├── search/         # Busca unificada multi-plataforma
│   │   │   └── settings/       # Configurações do usuário
│   │   ├── layout.tsx          # Root layout (fontes, tema escuro)
│   │   ├── page.tsx            # Página principal (hydrata todos os providers)
│   │   └── globals.css         # Tailwind + estilos globais
│   ├── components/             # Componentes reutilizáveis de UI
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── HomeFeed.tsx
│   │   ├── SearchView.tsx
│   │   ├── LibraryView.tsx
│   │   ├── PlayerBar.tsx
│   │   ├── QueueDrawer.tsx
│   │   ├── ConnectModal.tsx
│   │   ├── PlaylistModal.tsx
│   │   ├── CreateHybridModal.tsx
│   │   └── SettingsModal.tsx
│   ├── context/
│   │   └── PlayerContext.tsx   # Provider global do player (estado + YouTube IFrame API)
│   ├── db/
│   │   ├── index.ts            # Cliente Drizzle + Pool PostgreSQL
│   │   └── schema.ts           # Schema do banco (sessions, accounts, playlists, tracks, ...)
│   └── lib/
│       ├── session.ts          # Gerenciamento de cookies de sessão
│       ├── syncService.ts      # Camada de serviço (lógica de negócio, queries, sync)
│       └── mockData.ts         # Dados ricos de demonstração (playlists e faixas padrão)
├── public/                     # Assets estáticos (quando existentes)
├── compose.yaml                # PostgreSQL local, com volume e health check
├── compose.app.yaml            # Aplicação + migrations em containers
├── Dockerfile                  # Build e runtime standalone sem credenciais
├── RUNNING.md                  # Guia para subir, configurar e parar os serviços
├── drizzle.config.ts           # Drizzle Kit usando o ambiente/.env.local/.env
├── drizzle/                    # Migrations versionadas (incluindo contas de login)
├── scripts/
│   ├── run-local.mjs            # Inicialização e operações de banco/app
│   └── dev-smoke-test.mjs       # Testes HTTP isolados para o desenvolvedor
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Esquema do Banco de Dados

- `app_users` — contas DualWave com hash de senha e papel do usuário
- `auth_sessions` — sessões de login com prazo de expiração
- `user_sessions` — bibliotecas por sessão, vinculadas à conta quando logada
- `connected_accounts` — contas Spotify/YouTube vinculadas a uma sessão
- `playlists` — playlists de cada plataforma + playlists **híbridas**
- `tracks` — faixas individuais, sempre associadas a uma plataforma de origem
- `search_history` — histórico de buscas do usuário
- `app_settings` — preferências do usuário e credenciais do Console Dev

O schema está pré-configurado em `src/db/schema.ts`: inclui chaves estrangeiras com exclusão em cascata, índices para as consultas mais frequentes, uma conta por serviço por sessão, IDs externos de playlist únicos por serviço e checks para plataformas, estados de sincronização, categorias e valores não negativos. A configuração `drizzle.config.ts` lê `DATABASE_URL` do `.env`.

Para aplicar/atualizar o schema local: `npx drizzle-kit push`. Para gerar migrations versionadas para revisão: `npx drizzle-kit generate`.

---

## ⚡ Instalação & Execução Local

Pré-requisitos: **Node.js 22 LTS** (mínimo 20.9), npm e Docker Desktop/Engine com **Compose v2.20+**. Depois de clonar ou extrair o projeto, na pasta raiz:

```bash
# Cria .env se necessário, instala dependências, sobe banco, aplica schema e inicia Next.js
node scripts/run-local.mjs dev
```

A aplicação abre em **http://127.0.0.1:3000** e o Console Dev em **http://127.0.0.1:3000/dev**. O `.env` existente é preservado; uma instalação nova recebe senha de banco e convite dev aleatórios. Ctrl+C encerra o app sem apagar os dados do banco.

```bash
# Já tem PostgreSQL instalado? Configure DATABASE_URL e dispense Docker
node scripts/run-local.mjs dev --existing-db

# Aplicação + PostgreSQL + migrations, tudo em containers
node scripts/run-local.mjs docker:up

# Testes em outro terminal, com o app em modo desenvolvimento
node scripts/run-local.mjs test

# Parar o banco local, preservando dados
node scripts/run-local.mjs db:down

# Parar o modo completo Docker, preservando dados
node scripts/run-local.mjs docker:down
```

**Guia completo:** [`RUNNING.md`](./RUNNING.md) — configuração, portas, migrations, build/produção, publicação com HTTPS, backup e resolução de problemas. Ajuda rápida: `node scripts/run-local.mjs --help`.

> 💡 Credenciais OAuth são opcionais para testar com a biblioteca de demonstração; são necessárias para conectar Spotify/Google reais. O Docker completo usa migrations versionadas e desabilita o Console Dev. Desenvolvimento usa `push`; não misture os dois fluxos no mesmo banco sem baseline.

---

## 🔑 Login Real: Spotify e YouTube (OAuth 2.0)

Quando o usuário clica em **"Entrar com Login Spotify Oficial"** ou **"Entrar com Login Google / YT Oficial"**, ele é enviado para a **tela de login oficial da plataforma**. Ao voltar, o servidor puxa e grava no banco local:

| Plataforma | IDs e dados capturados |
|---|---|
| **Spotify** | `me.id` (ID da conta), display_name, e-mail, foto, plano (`free`/`premium`), país, seguidores, IDs de todas as playlists, IDs (`track.id`) + URI + preview de cada faixa, músicas curtidas, top faixas e tocadas recentemente |
| **YouTube** | `sub` do Google + **`channelId`**, nome, e-mail, foto, playlist de curtidas (`LL<channelId>`), uploads, IDs de todas as playlists, `videoId` de cada item e **duração real** via `/videos?part=contentDetails` |

### Spotify Developer Dashboard

1. Acesse [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) e crie um app
2. Cadastre o Redirect URI **exato** mostrado no Console Dev (`/dev`):
   - local: `http://localhost:3000/api/auth/spotify/callback`
   - preview: `https://SEU-DOMINIO/api/auth/spotify/callback`
3. Copie o Client ID (e o Client Secret, se quiser) para o `.env` **ou** grave pelo Console Dev
4. Escopos solicitados: `user-read-private`, `user-read-email`, `playlist-read-private`, `playlist-read-collaborative`, `user-library-read`, `user-read-recently-played`, `user-top-read`, `user-follow-read`

> 💡 **Sem Client Secret o app usa PKCE automaticamente** — ideal para desenvolvimento (cliente público).

### Google Cloud (YouTube Music)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um projeto
2. Habilite a **YouTube Data API v3**
3. Crie uma credencial **OAuth 2.0 (Web Application)**
4. Cadastre o Redirect URI: `.../api/auth/youtube/callback`
5. Copie Client ID + Client Secret para o `.env` **ou** grave pelo Console Dev
6. Escopos: `youtube.readonly`, `userinfo.profile`, `userinfo.email`
7. (Opcional) Crie uma **API Key** e defina `YOUTUBE_API_KEY` — ela é usada para casar automaticamente cada faixa do Spotify com o vídeo oficial correspondente no YouTube

---

## 👤 Contas DualWave (login com e-mail e senha)

Usuários normais podem **criar uma conta** (botão "Entrar / Criar conta" na navbar) e **entrar com e-mail + senha**:

- A senha é armazenada com hash seguro (scrypt) — nunca em texto puro.
- Os logins do **Spotify e do YouTube ficam salvos no servidor vinculados à conta** (tokens, IDs, playlists e faixas), não só no navegador.
- Dados criados como visitante anônimo são **migrados automaticamente** para a conta no primeiro login, sem duplicar playlists.
- **Ao entrar, o servidor verifica automaticamente se os tokens expiraram** e os renova via refresh token — a interface mostra "renovado" e o estado de cada token (válido, expirando, expirado, demo).
- Sair da conta mantém tudo salvo no servidor; entrar de novo restaura tudo.

**Conta de desenvolvedor:** no registro, informe seu convite privado `DEV_SIGNUP_CODE`, disponível no `.env` gerado pelo inicializador, para criar uma conta `dev`. Ela abre com os logins de demonstração já presentes e exibe o selo DEV na navbar. O Console Dev fica disponível no ambiente de desenvolvimento; a implantação o desabilita.

Rotas:

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/auth/register` | `{email, password, displayName?, devCode?}` → cria a conta, loga, migra dados, renova tokens |
| `POST` | `/api/auth/login` | `{email, password}` → entra, migra dados pendentes e renova tokens expirados |
| `POST` | `/api/auth/logout` | Sai da conta (dados permanecem no servidor) |
| `GET` | `/api/auth/me` | Usuário atual + renovação automática dos tokens + saúde dos tokens |
| `GET` | `/api/auth/status` | Contas Spotify/YouTube + usuário + saúde dos tokens (somente leitura) |

---

## 🧪 Console Dev (`/dev`) — gravar dados no banco local

Página e rotas exclusivas para desenvolvimento, pensadas para testar sem depender do fluxo OAuth completo.
Desative em produção com `DISABLE_DEV_CONSOLE=true`.

### Página

Acesse **`/dev`** (ou clique no ícone de terminal na navbar) para:

- Ver o estado do banco local (contagens de sessões, contas, playlists, faixas e buscas)
- Ver a `DATABASE_URL` mascarada e o `NODE_ENV`
- **Gravar credenciais OAuth no banco** (Spotify/Google/YouTube API Key) sem editar `.env` nem reiniciar
- Copiar os Redirect URIs exatos com um clique
- Abrir a tela de login oficial de cada plataforma
- **Sincronizar com um token colado manualmente** (sem passar pelo OAuth)
- Fazer seed de demonstração, inserir faixas/playlists avulsas, curtir, limpar por plataforma, zerar sessão ou zerar o banco inteiro

### Arquivo separado de testes do desenvolvedor

Execute `node scripts/dev-smoke-test.mjs` com `npm run dev` ativo. O script usa uma sessão isolada e verifica health check, acesso ao banco, seed demo, IDs das contas, busca combinada, filtros Spotify/YouTube, detalhe de playlist, criação híbrida, likes, registro/login/logout de conta dev, migração de dados e saúde dos tokens. Ao terminar, remove o usuário de teste e somente a sessão temporária; não usa tokens OAuth nem executa `wipe-all`.

Para testar outro endereço: `DUALWAVE_URL=http://localhost:3001 node scripts/dev-smoke-test.mjs`.

### Rotas HTTP

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/dev/db?limit=60` | Inspeciona o banco local (totais, contas com IDs reais, playlists, faixas, buscas) |
| `POST` | `/api/dev/db` | `{action: "seed-demo" \| "insert-track" \| "insert-playlist" \| "clear-platform" \| "wipe-session" \| "wipe-all" \| "toggle-like"}` |
| `GET` | `/api/dev/credentials` | Mostra credenciais ativas (mascaradas), origem dos valores (`env`/`db`) e Redirect URIs |
| `POST` | `/api/dev/credentials` | **Grava as credenciais no banco local** (`app_settings`) |
| `DELETE` | `/api/dev/credentials` | Remove as credenciais do banco (as do `.env` continuam valendo) |
| `POST` | `/api/dev/token` | `{platform, accessToken, refreshToken?}` → roda a sincronização real e grava IDs/playlists/faixas |

### Exemplos rápidos

```bash
# 1. Gravar credenciais no banco local (sem reiniciar o servidor)
curl -X POST http://localhost:3000/api/dev/credentials \
  -H "Content-Type: application/json" \
  -d '{"spotifyClientId":"...","spotifyClientSecret":"...","googleClientId":"...","googleClientSecret":"...","youtubeApiKey":"..."}'

# 2. Popular o banco com dados de demonstração
curl -X POST http://localhost:3000/api/dev/db \
  -H "Content-Type: application/json" -d '{"action":"seed-demo","platform":"both"}'

# 3. Sincronizar de verdade usando um token colado manualmente
curl -X POST http://localhost:3000/api/dev/token \
  -H "Content-Type: application/json" \
  -d '{"platform":"spotify","accessToken":"BQ..."}'

# 4. Inserir uma faixa avulsa para testar o player
curl -X POST http://localhost:3000/api/dev/db \
  -H "Content-Type: application/json" \
  -d '{"action":"insert-track","platform":"youtube","title":"Teste","artist":"Dev","youtubeVideoId":"dQw4w9WgXcQ"}'

# 5. Inspecionar tudo que está no banco
curl http://localhost:3000/api/dev/db?limit=60
```

### Prioridade das credenciais

```
variáveis de ambiente (.env)  →  valores gravados no banco (Console Dev)
```

Ou seja: se `SPOTIFY_CLIENT_ID` existir no `.env`, ele vence. Caso contrário, o valor gravado pelo Console Dev é usado — permitindo testar o login oficial sem tocar em arquivos.

---

## 📸 Screenshots e Demonstração

*(Em breve — a interface é inspirada no design dos players oficiais, com um gradiente característico de verde-esmeralda (Spotify) para vermelho (YouTube).)*

Principais telas:
- **Tela Inicial**: banner de boas-vindas com status de conexão das duas contas, playlists em destaque e faixas top
- **Busca Unificada**: input global no topo + visualização em lista única ou lado-a-lado comparando Spotify vs YouTube
- **Biblioteca**: abas para Todas / Spotify / YouTube / Híbridas / Curtidas
- **Player Global**: barra inferior fixa com capa, controles, seek, volume, toggle de vídeo, fila
- **Modal de Playlist**: detalhes, clonagem entre plataformas, exclusão

---

## 🤝 Contribuindo

Contribuições são super bem-vindas! Este projeto é **open source** sob licença MIT.

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciono minha feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

Veja também o arquivo [`DEVELOPER.md`](./DEVELOPER.md) para o guia do desenvolvedor principal, roteiro técnico e pontos de extensão.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👥 Créditos

Veja [`CREDITS.md`](./CREDITS.md) para a lista completa de créditos, menções e agradecimentos.

---

## 🙋 FAQ

**P: Preciso ter contas no Spotify e no YouTube Music?**  
R: Não. Você pode conectar uma ou ambas. Também há o modo sandbox 1-clique sem contas reais.

**P: As músicas do Spotify tocam completas?**  
R: Por padrão, o DualWave mapeia automaticamente as faixas do Spotify para os vídeos oficiais correspondentes no YouTube — contornando a limitação de 30s das prévias. Se não houver vídeo disponível, a música toca o preview oficial.

**P: Posso criar playlists com músicas de ambas as plataformas?**  
R: Sim! São as **Playlists Híbridas**, um dos destaques do projeto.

**P: Meus dados são enviados a terceiros?**  
R: Não. Os tokens de acesso são armazenados apenas no banco de dados local da sua instância, vinculados ao cookie de sessão anônimo.
