# 👨‍💻 DEVELOPER.md — Guia do Desenvolvedor Principal

## 🎯 Visão do Mantenedor

O DualWave já é um MVP funcional e completo, com autenticação (real e sandbox), biblioteca sincronizada, player global, busca multi-plataforma e playlists híbridas. A partir daqui, o céu é o limite.

Use este documento como seu diário técnico pessoal, com tudo o que você precisa lembrar ao voltar ao projeto depois de um tempo.

### Subir app e banco sem configurar scripts npm

O passo a passo está em [`RUNNING.md`](./RUNNING.md). Os arquivos de infraestrutura estão versionados:

- `scripts/run-local.mjs`: ambiente, dependências, banco, schema, servidor e testes.
- `compose.yaml`: PostgreSQL 16 com health check e volume persistente.
- `compose.app.yaml`: migrations e servidor Next.js standalone em containers.
- `Dockerfile`: estágios separados, runtime sem root e sem credenciais embutidas.
- `.env.example`: parâmetros de conexão, portas e OAuth; o inicializador gera senha e convite dev em instalação nova.
- `.gitignore`/`.dockerignore`: exclusão de segredos e artefatos gerados.

```bash
node scripts/run-local.mjs dev                 # Banco + schema + app local
node scripts/run-local.mjs dev --existing-db   # PostgreSQL já instalado
node scripts/run-local.mjs docker:up           # Tudo em containers
node scripts/run-local.mjs test                # Com app dev já rodando
node scripts/run-local.mjs --help              # Todos os comandos
```

O modo dev usa `push`; Docker/produção usam `migrate`. A migration `0001_account_authentication.sql` acrescenta usuários e sessões de login ao schema inicial. Ao adotar migrations em banco existente criado com `push`, faça backup e baseline revisado; o inicializador não apaga dados para contornar conflitos.

---

## 🧠 Mapa Mental da Arquitetura Atual

### Fluxo de Dados

1. **Sessão**: cookie `duo_music_session` é gerado no primeiro acesso (`src/lib/session.ts`).
2. **Conexão de Contas** (3 caminhos):
   - **OAuth real** → `/api/auth/spotify` e `/api/auth/youtube` redirecionam o usuário para a **tela de login oficial**; o callback troca o `code` por tokens e chama `syncSpotifyAccount` / `syncYoutubeAccount` (`src/lib/platformSync.ts`), que puxam os IDs reais e gravam tudo no banco.
   - **Token manual (dev)** → `POST /api/dev/token` recebe um `accessToken` colado e roda a MESMA sincronização real. Perfeito para testar sem configurar redirect URI.
   - **Modo sandbox** → `/api/auth/connect` injeta playlists/faixas de demonstração de `src/lib/mockData.ts` — zero setup.
3. **Credenciais** (`src/lib/credentials.ts`): resolução em cascata `.env` → banco (`app_settings` com `sessionId = '__dev_console__'`). O Console Dev (`/dev`) grava no banco sem reiniciar o servidor.
4. **Redirect URI / origem**: `getOrigin(req)` respeita `NEXT_PUBLIC_APP_URL` e os headers `x-forwarded-proto` / `x-forwarded-host` — essencial em preview atrás de proxy (senão vira `0.0.0.0`).
3. **Player Global**: Provider React em `src/context/PlayerContext.tsx` usa:
   - **YouTube IFrame Player API** (prioridade, toca músicas completas)
   - `<audio>` HTML5 para prévias de 30s do Spotify
   - Estado centralizado (currentTrack, queue, isPlaying, progress, volume, shuffle, repeat, showVideo)
4. **Busca**: endpoint `/api/search` que:
   - Pesquisa no banco de dados local (tracks e playlists da sessão)
   - Também inclui um catálogo mock global (`CATALOG_SEARCH_INDEX` em `mockData.ts`) para resultados ricos mesmo sem todas as músicas
   - Filtra por plataforma (all / spotify / youtube) e categoria (all / tracks / playlists)
5. **Playlists Híbridas**: tabela `playlists` com `platform = 'hybrid'` que podem conter faixas de qualquer origem.

### Convenções Importantes

- **Sessão isolada**: cada visitante tem suas próprias contas/playlists baseadas no cookie — nenhum dado é compartilhado.
- **Platform column**: sempre `"spotify" | "youtube" | "hybrid"`.
- **youtubeVideoId**: campo presente em *todas* as faixas (mesmo Spotify), permitindo que o player global sempre consiga tocar a faixa completa via YouTube.
- **Track IDs**: IDs negativos temporários são usados para faixas do catálogo que ainda não foram salvas no banco.
- **Estilização**: tudo em Tailwind, tema dark (zinc-950 como base), verde `#1DB954` (Spotify), vermelho `#FF0000` (YouTube).

---

## 🧪 Console Dev (`/dev`) — como testar rápido no banco local

### Arquivos envolvidos

| Arquivo | Responsabilidade |
|---|---|
| `src/app/dev/page.tsx` | UI do console (status do banco, credenciais, sync por token, inserts manuais, dump) |
| `src/app/api/dev/db/route.ts` | `GET` inspeção · `POST` ações (`seed-demo`, `insert-track`, `insert-playlist`, `clear-platform`, `wipe-session`, `wipe-all`, `toggle-like`) |
| `src/app/api/dev/credentials/route.ts` | `GET`/`POST`/`DELETE` das credenciais gravadas no banco |
| `src/app/api/dev/token/route.ts` | `POST` sincronização real com token colado manualmente |
| `src/lib/credentials.ts` | Resolução `.env` → banco, origem pública, redirect URIs, `isDevConsoleEnabled()` |
| `src/lib/platformSync.ts` | `syncSpotifyAccount()` e `syncYoutubeAccount()` — a sincronização REAL |
| `src/lib/youtubeMatch.ts` | `searchYoutubeVideoId()` (casa faixa do Spotify → vídeo oficial) + `parseIsoDuration()` |
| `src/db/schema.ts` | Schema completo, tipos de plataforma, FKs, índices e checks PostgreSQL |
| `drizzle.config.ts` | Configuração Drizzle Kit que lê `DATABASE_URL` do `.env` |
| `drizzle/0000_thick_magus.sql` | Migration inicial versionada para bancos novos |
| `scripts/dev-smoke-test.mjs` | Testes HTTP isolados e automatizados para o fluxo fullstack |

### Schema e banco local

O schema oficial está em `src/db/schema.ts`. Ele tem oito tabelas: contas/sessões de login (`app_users`, `auth_sessions`) e a biblioteca/configuração (`user_sessions`, `connected_accounts`, `playlists`, `tracks`, `search_history`, `app_settings`). Inclui FKs, exclusão em cascata da biblioteca, índices de sessão/plataforma/ordem, unicidade de conta por serviço e checks para valores válidos.

```bash
# Aplicação direta do schema (recomendado em desenvolvimento)
npx drizzle-kit push

# Gerar uma migration após mudar o schema
npx drizzle-kit generate

# Aplicar migrations versionadas em banco novo
npx drizzle-kit migrate
```

`drizzle.config.ts` usa `DATABASE_URL` de `.env`. Em produção, prefira migrations versionadas em vez de `push`.

### O que a sincronização real captura

**Spotify** (`syncSpotifyAccount`):
- `/me` → **id da conta**, display_name, email, images, `product`, `country`, `followers` (tudo em `rawProfile` JSONB)
- `/me/tracks` → playlist "Músicas Curtidas (Spotify)" (`kind = liked`)
- `/me/top/tracks` → "Minhas Mais Tocadas" (`kind = top`)
- `/me/player/recently-played` → "Tocadas Recentemente" (`kind = recent`)
- `/me/playlists` (paginado) + `/playlists/{id}/tracks` (paginado) → playlists do usuário
- Cada faixa guarda `externalId` (track id), `spotifyUri`, `previewUrl`, `externalUrl`, `explicit`, `durationSeconds`
- Se `YOUTUBE_API_KEY` existir → `searchYoutubeVideoId()` preenche `youtubeVideoId` (`matchSource = 'auto'`)

**YouTube** (`syncYoutubeAccount`):
- `oauth2/v3/userinfo` → `sub`, nome, e-mail, foto
- `/channels?mine=true` → **channelId**, `relatedPlaylists.likes` (`LL<channelId>`) e `.uploads`
- Playlist "Músicas Curtidas (YouTube Music)" a partir do `likes`
- `/playlists?mine=true` (paginado) + `/playlistItems` (paginado)
- `/videos?part=contentDetails,snippet` em lotes de 50 → **duração real** (ISO-8601 → segundos) e thumbnail

### Receitas de teste

```bash
# gravar credenciais no banco (não precisa reiniciar)
curl -X POST localhost:3000/api/dev/credentials -H 'Content-Type: application/json' \
  -d '{"spotifyClientId":"...","youtubeApiKey":"..."}'

# sincronizar de verdade com um token colado
curl -X POST localhost:3000/api/dev/token -H 'Content-Type: application/json' \
  -d '{"platform":"spotify","accessToken":"BQ..."}'

# ver IDs, contas e faixas que estão no banco
curl localhost:3000/api/dev/db?limit=60

# zerar tudo e recomeçar
curl -X POST localhost:3000/api/dev/db -H 'Content-Type: application/json' -d '{"action":"wipe-all"}'
```

### Contas, sessões e renovação automática de tokens

| Arquivo | Responsabilidade |
|---|---|
| `src/db/schema.ts` (`app_users`, `auth_sessions`, `user_sessions.user_id`) | Contas com hash scrypt, sessões de login (cookie `dw_auth`), vínculo sessão de música ↔ usuário |
| `src/lib/password.ts` | `hashPassword()` / `verifyPassword()` (scrypt nativo, sem deps) |
| `src/lib/session.ts` | `getSessionId()` resolve a sessão **efetiva**: logado → `u_<id>` permanente; anônimo → `usr_...` isolada. Todas as rotas de dados herdam isso sem mudanças |
| `src/lib/auth.ts` | `registerUser()`, `verifyUserCredentials()`, `loginAndPrepare()` (sessão + migração + seed dev + refresh), `migrateAnonymousToUser()` com mesclagem sem duplicar playlists |
| `src/lib/tokenRefresh.ts` | `getSessionTokenHealth()` (leitura, sem rede — usada no status) e `refreshSessionTokens()` (renovação real Spotify/Google — usada no login e no `/me`) |
| `src/app/api/auth/{register,login,logout,me}/route.ts` | Ciclo de vida da conta |
| `src/components/AuthModal.tsx` | UI de entrar/criar conta, com campo opcional de código dev |

Detalhes importantes:

- `DEV_SIGNUP_CODE` define quem vira `dev` no registro. O inicializador gera um convite privado no `.env` em instalações novas e evita o antigo valor público de demonstração nos modos de produção. Conta dev nova e vazia recebe seed demo automaticamente.
- `expires_in` do OAuth é gravado em `connected_accounts.expires_at`; o refresh usa `refresh_token` com as credenciais resolvidas (env → banco).
- Falha no refresh **nunca quebra o login**: marca `syncStatus=error` + `lastError` e orienta a reconectar.
- `POST /api/dev/db` ganhou a ação `delete-user` (`{email}`) para limpar usuários de teste; o smoke test a utiliza.
- Em produção pública, considere criptografar `access_token`/`refresh_token` em repouso (ver seção Segurança).

### Estratégia de reprodução (PlayerContext)

1. `youtubeVideoId` presente → `loadVideoById()` (faixa completa)
2. sem `youtubeVideoId` → `loadPlaylist({ listType: "search", list: "artista título official audio" })` — busca direto no IFrame, **não precisa de API key**
3. player ainda não pronto e há `previewUrl` → `<audio>` com a prévia oficial do Spotify

> ⚠️ O fallback por busca depende de o IFrame aceitar `listType: search`. Se o YouTube remover esse recurso, a saída é tornar `YOUTUBE_API_KEY` obrigatório e usar `searchYoutubeVideoId()` no servidor.

### Segurança do console

- `isDevConsoleEnabled()` → `process.env.DISABLE_DEV_CONSOLE !== "true"`
- **Defina `DISABLE_DEV_CONSOLE=true` em produção pública** (o console expõe tokens mascarados e permite limpar o banco)
- `wipe-all` apaga TODAS as sessões — em dev pede `confirm()` no front

---

## 🚀 Próximos Passos & Roadmap (Seu Backlog)

### 🟢 Curto Prazo (Quick Wins)

- [ ] Adicionar testes unitários (Vitest) para `syncService.ts`
- [ ] **Persistir fila entre sessões** (atualmente some ao dar refresh)
- [ ] Suporte a **drag-and-drop** para reordenar fila do player
- [ ] **Atualização em tempo real do progresso** quando busca está aberta (debouncing já existe)
- [ ] Página de "Artistas" unificada
- [ ] Página de "Álbuns" unificada
- [ ] **Modo Escuro / Claro** (atualmente só dark)
- [ ] Tocar preview do Spotify em paralelo quando o YouTube estiver silenciado ou indisponível
- [ ] Componente de **letra da música** (chamar API de lyrics pública)
- [ ] Adicionar favicon customizado com o logo do DualWave
- [ ] Criar `/public/og.png` para Open Graph

### 🟡 Médio Prazo

- [ ] Suporte real ao **Web Playback SDK do Spotify** para tocar áudio full quando usuário tiver Premium (usando token OAuth)
- [ ] Sistema de **importação em lote** (upload de CSV / JSON / links de playlist)
- [ ] **Match automático** de músicas do Spotify com o YouTube (atualmente os mocks já têm mapeamento; em produção usar a YouTube Search API para achar o vídeo correto automaticamente)
- [ ] **Playback crossfade** entre faixas
- [ ] **Áudio apenas** no YouTube (esconder o player mas tocar o áudio — atualmente o popup de vídeo resolve isso)
- [ ] Funcionalidade de **download / cache local** de faixas (para PWA offline)
- [ ] **Recomendações colaborativas** baseadas em gosto combinado das duas plataformas
- [ ] **Estatísticas** da biblioteca combinada (artistas mais ouvidos, mix de plataformas, tempo total de biblioteca)
- [ ] Modo de **rádio / estações** baseado em faixa/artista
- [ ] **Histórico de reprodução** persistente (tocar novamente)
- [ ] Tocar prévia de 30s para Spotify quando não há videoId

### 🔴 Longo Prazo (Visão do Produto)

- [ ] **Contas de usuário reais** (e-mail/senha ou OAuth) em vez de sessões anônimas por cookie (permitindo acessar de outros dispositivos)
- [ ] **Sincronização bidirecional** (se uma playlist híbrida for criada aqui, fazer push de volta para Spotify e YouTube como playlist nativa)
- [ ] **Biblioteca de podcasts** unificada (Spotify + YouTube)
- [ ] PWA (Progressive Web App) instalável
- [ ] Versão mobile nativa (React Native)
- [ ] **Modo colaborativo em tempo real** (vários usuários montando uma playlist híbrida juntos)
- [ ] Suporte a mais plataformas (Apple Music, Deezer, Tidal, SoundCloud)
- [ ] **Perfil público do usuário** (ex: dualwave.app/@usuario)
- [ ] **Recomendações de IA** combinando gostos das duas plataformas
- [ ] Suporte multi-idioma (i18n — atualmente PT-BR hardcoded)
- [ ] Modo de exportação (exportar biblioteca para CSV, Spotify, YouTube)

---

## 🧪 Testes e Qualidade

### Smoke test fullstack para o desenvolvedor

Com PostgreSQL pronto, schema aplicado e `npm run dev` ativo em outro terminal:

```bash
node scripts/dev-smoke-test.mjs
# Para outro host/porta:
DUALWAVE_URL=http://localhost:3001 node scripts/dev-smoke-test.mjs
```

O arquivo usa uma sessão efêmera, não precisa de OAuth, cobre as APIs de health/status/credenciais/seed/busca/filtros/playlists híbridas/likes/contas (registro dev, login, migração, token health, logout, re-login, senha errada) e apaga o usuário de teste mais os próprios dados ao terminar. Não executa `wipe-all`.

### Validação de entrega

Na validação desta versão foram rodados:
- ✅ `npx drizzle-kit push` (schema atualizado no PostgreSQL local)
- ✅ `npx drizzle-kit generate` (migration inicial versionada em `drizzle/`)
- ✅ `npx next typegen` (rotas tipadas)
- ✅ `npm exec tsc -- --noEmit --pretty false` (TypeScript sem erros)
- ✅ `npm run build` (build de produção Next.js)
- ✅ Health check `/api/health` retorna `{ok: true}`

**Para adicionar testes unitários:**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Sugestão de foco inicial: `src/lib/syncService.ts` já que contém quase toda a lógica de negócio.

---

## 🔧 Pontos de Extensão (Onde colocar suas features)

### Adicionar nova plataforma (ex: Apple Music)

1. Em `src/db/schema.ts`: o enum `"spotify" | "youtube"` está espalhado — considere transformar em tipo reutilizável e adicionar `"apple"`.
2. Em `src/lib/mockData.ts`: crie um array `APPLE_DEMO_PLAYLISTS`.
3. Em `src/lib/syncService.ts`:
   - Estenda `connectDemoPlatform` para tratar `"apple"`.
   - Estenda `disconnectPlatform`.
4. Em `src/app/api/auth/`, crie `/apple/route.ts` e `/apple/callback/route.ts`.
5. Em `src/components/ConnectModal.tsx`: adicione card da nova plataforma.
6. Em `src/components/SearchView.tsx` e `LibraryView.tsx`: adicione badges e filtros.
7. Atualize paleta de cores / ícones para a nova marca.

### Adicionar novo tipo de entidade (ex: Artistas)

1. Crie tabela `artists` no `schema.ts` + migrate com `npx drizzle-kit push`
2. Adicione métodos no `syncService.ts` (list, getById, ...)
3. Crie API route em `/api/artists/`
4. Crie um view component `ArtistsView.tsx`
5. Adicione rota no sidebar e navegação do page.tsx

### Adicionar sincronização real com token Spotify Premium (Web Playback SDK)

O `PlayerContext.tsx` já foi preparado para acomodar um terceiro source de áudio. Basta:
1. Carregar o SDK: `<script src="https://sdk.scdn.co/spotify-player.js">`
2. Adicionar um novo state `playbackSource: "youtube" | "preview" | "spotify_sdk"`
3. Fazer toggle com base em `spotifyUri` e token válido
4. Não quebrar o fluxo atual (YouTube como fallback sempre)

---

## 🔒 Segurança & Produção

### Antes do deploy em produção real:

- [ ] Substituir tokens de sessão anônimos por JWT assinados
- [ ] Criptografar `access_token` e `refresh_token` no banco com chave server-side (`ENCRYPTION_KEY`)
- [ ] Adicionar rate limiting aos endpoints de API (ex: `@upstash/ratelimit`)
- [ ] Adicionar CSRF protection em mutações
- [ ] Rodar migrations formais em vez de `drizzle-kit push` (use `drizzle-kit generate` e aplique migrations versionadas)
- [ ] Configurar CSP (Content Security Policy) para permitir YouTube IFrame
- [ ] Validar `redirect_uri` no OAuth para evitar open redirect
- [ ] Configurar domínios OAuth nos dashboards das plataformas
- [ ] Criptografar cookies (`httpOnly: true`, `secure: true`, `sameSite: 'strict'`)
- [ ] Adicionar logging estruturado (ex: Pino / Winston)
- [ ] Variáveis de ambiente obrigatórias no `.env`:
  ```
  DATABASE_URL=postgresql://...
  SPOTIFY_CLIENT_ID=...
  SPOTIFY_CLIENT_SECRET=...
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  YOUTUBE_API_KEY=...
  ENCRYPTION_KEY=...
  ```

---

## 🐛 Debugging Comum

| Problema | Causa provável | Fix |
|---|---|---|
| Player do YouTube não inicializa | `window.YT` pode ainda não estar carregado quando `initYouTubePlayer` roda | Timeout / retry já existe (800ms), mas se persistir adicione um event listener mais robusto para `onYouTubeIframeAPIReady` |
| Cores / tailwind não aplicam | Tailwind v4 está usando `@import "tailwindcss"` em `globals.css` | Confira que `postcss.config.mjs` tem o plugin correto |
| `DATABASE_URL` errors | Pool do Postgres não consegue conectar | Verifica `.env` e que o postgres está rodando localmente na 5432 |
| Busca não retorna faixas do DB | `searchTracksAndPlaylists` usa `includes` case-insensitive mas espera texto minificado | Verifique caracteres especiais / acentos |
| Cookies de sessão não persistem entre requests | Ao testar com curl, use `-c cookie.txt -b cookie.txt` | Em produção, cookies precisam de `secure` e domínio correto |

---

## 🎨 UI/UX: Pontos a manter

- Sempre que mostrar uma faixa do Spotify, use cor esmeralda/`#1DB954`.
- Sempre que mostrar YouTube Music, use rosa/vermelho `#FF0000`.
- Playlists híbridas usam gradiente verde→vermelho.
- Mantenha o player **sempre fixo no inferior** e a experiência "música nunca para" entre navegações (o Provider não é reiniciado).
- Não quebre a acessibilidade (controles por teclado, aria-labels em botões de player).

---

## 📦 Scripts Úteis

```bash
npm run dev             # Inicia dev server com hot reload
npm run build           # Build de produção
npm start               # Inicia servidor de produção
npm run lint            # ESLint
npm run typecheck       # TypeScript type check
npx drizzle-kit push    # Aplica alterações no schema direto no Postgres
npx drizzle-kit generate # Gera migrations
npx drizzle-kit studio  # Abre UI visual do Drizzle para explorar o banco
```

---

## 🧹 Dívida Técnica (Técnico para refatorar)

- [ ] Extrair tipos compartilhados (`Platform`, `TrackItem`, `PlaylistWithTracks`) para `src/types/index.ts` (atualmente estão duplicados em `schema.ts`, `PlayerContext.tsx`, componentes)
- [ ] Adicionar `zod` para validação de body/query em todas as APIs
- [ ] Criar hooks customizados: `useAccounts`, `usePlaylists`, `usePlayer` hook (o `usePlayer` já existe do contexto)
- [ ] Paginação em `/api/search` e `/api/playlists` (atualmente carrega tudo de uma vez)
- [ ] Tratamento de erro mais robusto no client (atualmente usa `console.error`)
- [ ] Extrair strings PT-BR para arquivo de i18n quando adicionar multi-idioma
- [ ] Componente `TrackRow` reutilizável (atualmente duplicado em `SearchView`, `LibraryView`, `PlaylistModal`)

---

## 🤖 Ideias de Melhorias de Código

- [ ] Adicionar server actions do Next.js em vez de chamadas fetch manuais onde fizer sentido
- [ ] Colocar `src/components/ui/` com componentes primitivos shadcn/ui em vez de tudo custom
- [ ] Adicionar `react-query` / `@tanstack/react-query` para caching de dados de biblioteca
- [ ] Adicionar framer-motion para animações mais ricas
- [ ] Usar `next/image` em vez de `<img>` (requer configurar domínios remotos do unsplash e dos serviços de thumbnails)

---

## 📇 Seus Dados (Desenvolvedor Principal)

Preencha aqui quando quiser:

```
Nome: ______________________________________
GitHub: @__________________________________
Email: _____________________________________
Website: __________________________________
Twitter/X: ________________________________
```

Quando for lançar publicamente, atualize também:
- `package.json` (seu nome como author)
- `CREDITS.md`
- README (badges, links)
- Licença (seu nome no copyright do MIT)

---

## 📓 Anotações Livres

Use o espaço abaixo como quiser:

```
[Dia/Mês] — Nota rápida sobre algo que eu quero fazer:
___________________________________________________________
___________________________________________________________

[Dia/Mês] — Bug que eu preciso lembrar:
___________________________________________________________

[Dia/Mês] — Ideia de feature aleatória que tive no banho:
___________________________________________________________
```

---

**Boas contribuições e boa construção!** 🎵🚀

Lembre-se: o DualWave já está em um estado funcional completo para demo. Tudo que você adicionar a partir daqui será para levar o projeto ao próximo nível como plataforma open source.
