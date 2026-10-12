# 👨‍💻 DEVELOPER.md — Guia do Desenvolvedor Principal




## 🎯 Visão do Mantenedor

O DualWave já é um MVP funcional e completo, com autenticação (real e sandbox), biblioteca sincronizada, player global, busca multi-plataforma e playlists híbridas. A partir daqui, o céu é o limite.

Use este documento como seu diário técnico pessoal, com tudo o que você precisa lembrar ao voltar ao projeto depois de um tempo.

---

## 🧠 Mapa Mental da Arquitetura Atual

### Fluxo de Dados

1. **Sessão**: cookie `duo_music_session` é gerado no primeiro acesso (`src/lib/session.ts`).
2. **Conexão de Contas**:
   - OAuth real → endpoints `/api/auth/spotify` e `/api/auth/youtube` redirecionam, callback troca tokens e chama a API oficial para baixar playlists/músicas.
   - Modo sandbox → `/api/auth/connect` injeta playlists/tracks mockadas realistas definidas em `src/lib/mockData.ts` — zero setup para demonstração.
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

Atualmente, foram rodados:
- ✅ `npx next typegen` (rotas tipadas)
- ✅ `tsc --noEmit` (TypeScript sem erros)
- ✅ `npm run build` (build de produção Next.js)
- ✅ Health check `/api/health` retorna `{ok: true}`
- ✅ Todos os testes manuais de API feitos via cURL (conectar, listar playlists, tocar, buscar, clonar, criar híbridas, curtir)

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
Nome: Taylor Reis
GitHub: @TaylorReis-lab
Email: taylor-reis@outlook.com
Website: https://taylorreis.netlify.app
```

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
