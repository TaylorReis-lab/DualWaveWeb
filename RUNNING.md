# Subir e rodar o DualWave

Este guia cobre a aplicação Next.js, o PostgreSQL e a criação das tabelas, incluindo contas de usuário e tokens OAuth. Todos os comandos são executados na pasta do projeto. Não é necessário alterar `package.json`.

## 1. Pré-requisitos

- **Node.js 22 LTS** recomendado (mínimo aceito pelo Next.js 16: 20.9).
- **npm**, instalado com o Node.js.
- **Docker Desktop** (Windows/macOS) ou **Docker Engine + Compose v2.20+** (Linux), ligados.
- Se você já tem PostgreSQL instalado, pode usar `--existing-db` e dispensar Docker para o desenvolvimento.

Verifique as instalações com `node --version`, `npm --version` e `docker compose version`.

## 2. Desenvolvimento: um comando

```bash
node scripts/run-local.mjs dev
```

O inicializador:

1. Cria `.env` a partir de `.env.example` **apenas se ele não existir**, com senha de PostgreSQL e convite dev aleatórios.
2. Instala as dependências com `npm ci` quando houver lockfile, ou `npm install` quando não houver.
3. Inicia o PostgreSQL de `compose.yaml`, com volume persistente.
4. Espera o health check do banco.
5. Executa Drizzle Kit `push` para preparar o schema atual.
6. Inicia Next.js em modo desenvolvimento com hot reload.

Endereços padrão:

- Aplicação: **http://127.0.0.1:3000**
- Console Dev: **http://127.0.0.1:3000/dev**
- Health check (app + banco): **http://127.0.0.1:3000/api/health**

`Ctrl+C` encerra a aplicação. O banco continua rodando, e os dados ficam no volume. Para parar o banco sem apagar dados:

```bash
node scripts/run-local.mjs db:down
```

Se você adicionou ou atualizou dependências no repositório, rode `npm ci` novamente antes de iniciar; o script não reinstala uma pasta `node_modules` que já está presente.

### Usar um PostgreSQL que já está instalado

Configure `DATABASE_URL` no seu `.env` (crie o banco/usuário antes, usando sua instalação PostgreSQL) e execute:

```bash
node scripts/run-local.mjs dev --existing-db
```

O script não chama Docker nesse modo. Apenas aplica o schema e inicia Next.js.

Para preparar as tabelas sem iniciar um servidor:

```bash
node scripts/run-local.mjs setup --existing-db
```

Se o schema já estiver atualizado e você não quiser alterá-lo:

```bash
node scripts/run-local.mjs dev --existing-db --skip-schema
```

## 3. Testes do desenvolvedor

Com a aplicação **em modo dev** rodando, abra outro terminal:

```bash
node scripts/run-local.mjs test
```

O comando executa `scripts/dev-smoke-test.mjs`. Ele lê seu convite dev de `.env`/`.env.local`, verifica banco, bibliotecas, pesquisa, filtros, playlists, cadastro/login/logout e usa uma sessão temporária. Não executa `wipe-all`.

Também é possível executar diretamente:

```bash
node scripts/dev-smoke-test.mjs
```

Para outro host, configure `DUALWAVE_URL` no ambiente. O inicializador já usa `APP_PORT` quando você mudar a porta.

O modo de implantação Docker desabilita o Console Dev, portanto esse smoke test **não deve** ser rodado contra a implantação pública. Nela, confira `/api/health` e faça os testes de usuário apropriados.

## 4. Tudo no Docker: aplicação + banco + migrations

```bash
node scripts/run-local.mjs docker:up
```

Esse comando usa `compose.yaml` + `compose.app.yaml` e o `Dockerfile`. Ele:

- Compila a aplicação com Node.js 22 e output standalone.
- Inicia o PostgreSQL e espera `service_healthy`.
- Aplica **migrations versionadas** no serviço `migrate` (incluindo `app_users` e `auth_sessions`).
- Só inicia `app` depois que `migrate` terminar com sucesso.
- Injeta credenciais em runtime, sem colocar `.env` ou chaves OAuth na imagem.
- Desabilita o Console Dev na implantação.
- Gera um convite dev privado no `.env` se estiver ausente ou ainda usar o antigo valor público de demonstração.
- Espera `/api/health` responder com sucesso.

Na primeira execução, o build e o download das imagens podem demorar. Se uma migration falhar, a aplicação não começa; confira os logs.

```bash
# Ver status
node scripts/run-local.mjs docker:status

# Acompanhar logs
node scripts/run-local.mjs docker:logs

# Parar/remover containers, PRESERVANDO o volume PostgreSQL
node scripts/run-local.mjs docker:down

# Iniciar novamente ou atualizar após mudar o código
node scripts/run-local.mjs docker:up
```

### Dados dos dois modos

Por padrão, o projeto Docker de desenvolvimento se chama `dualwave-dev` e o modo completo se chama `dualwave-app`. Eles têm **volumes separados**. Mudar de modo não migra automaticamente os dados de um volume para o outro.

Ambos tentam usar a porta PostgreSQL definida em `DATABASE_URL`. Não os rode ao mesmo tempo na mesma porta: pare o banco do primeiro modo ou use uma porta diferente no segundo. Mantenha bancos criados com `push` separados dos bancos controlados por migrations.

`down`/`stop` não apagam os volumes. Não use `down --volumes` nem `docker volume rm` no banco com dados que pretende conservar.

## 5. Configuração do ambiente

A prioridade é: **variáveis do processo → `.env.<modo>.local` → `.env.local` → `.env.<modo>` → `.env`**, com modo `development` ou `production`. Os scripts e o Drizzle usam essa ordem para os arquivos de ambiente. Para Docker sem o inicializador, o Compose lê `.env`; prefira o inicializador se usar `.env.local`.

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | Conexão usada pelo app local e Drizzle; no banco Docker local também define usuário, senha, porta e nome do banco |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Configuração do Compose quando executado manualmente; o inicializador deriva esses valores de `DATABASE_URL` |
| `APP_PORT` | Porta da aplicação no host (padrão 3000) |
| `APP_BIND_ADDRESS` | Endereço de escuta/publicação (padrão 127.0.0.1, somente local) |
| `APP_URL` | Origem/callback público; ajuste junto com a porta ou domínio |
| `DEV_SIGNUP_CODE` | Convite para registro dev, **não** a senha da conta DualWave |
| `DISABLE_DEV_CONSOLE` | Bloqueia `/api/dev/*` quando `true`; os modos de produção do inicializador forçam `true` |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Aplicativo OAuth Spotify |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_API_KEY` | Aplicativo Google/YouTube e chave de pesquisa opcional |
| `DATABASE_URL_DOCKER` | Conexão com hostname interno `db`; calculada pelo inicializador, não substitua `DATABASE_URL` local por ela |
| `COMPOSE_PROJECT_NAME` | Nome opcional do projeto/volumes Docker; não reutilize um volume de `push` em `migrate` sem baseline |

Para mudar a porta do banco, altere `DATABASE_URL` e, se usar Compose manualmente, `POSTGRES_PORT`. Para mudar a porta da aplicação, ajuste `APP_PORT` e `APP_URL`.

O `.env` existente não é substituído pelo modelo. A única rotação automática em um arquivo existente é o convite dev ausente/público ao preparar uma execução de produção. Não publique `.env`/`.env.local`: ambos estão no `.gitignore` e no `.dockerignore`. Se já estiverem no histórico do Git, remova-os do versionamento e revogue as credenciais expostas; ignorar um arquivo não apaga seu histórico.

### OAuth e contas

- Credenciais de Spotify/Google são opcionais **para usar dados de demonstração**; necessárias para conectar contas reais.
- Cadastre o callback **exato** do ambiente no Spotify Developer Dashboard e no Google Cloud.
- Em loopback, prefira `http://127.0.0.1:3000/api/auth/spotify/callback`; no domínio publicado, use HTTPS.
- Cada usuário registra sua própria senha DualWave e conecta suas plataformas pelas telas oficiais. Não configure senhas Spotify/Google no `.env`.
- O valor privado de `DEV_SIGNUP_CODE` está no seu `.env` gerado. Use-o no registro dev; não há conta administrativa com senha universal pré-criada.
- Os usuários, bibliotecas e refresh tokens ficam no PostgreSQL; preservar o volume preserva esses dados. Login e `/api/auth/me` verificam a expiração e tentam renovar os tokens OAuth.

## 6. Schema, migrations e atualização

O schema oficial continua em `src/db/schema.ts`; a configuração é `drizzle.config.ts`.

```bash
# Desenvolvimento (aplicação direta do schema atual)
node scripts/run-local.mjs db:push

# Após alterar schema.ts: gerar e revisar o SQL
node scripts/run-local.mjs db:generate

# Banco novo ou que já tem histórico de migrations
node scripts/run-local.mjs db:migrate
```

Migrations entregues:

- `0000_thick_magus.sql`: bibliotecas, serviços, sessões de música e configurações.
- `0001_account_authentication.sql`: contas DualWave, sessões de login e vínculo da biblioteca ao usuário.

**Não aplique a migration inicial em um banco antigo criado por `drizzle-kit push`.** Nesse banco, as tabelas já existem, mas não há registro em `drizzle.__drizzle_migrations`. Continuar com `push` em desenvolvimento é válido; para adotar migrations preservando dados, faça backup e um baseline revisado. O inicializador não apaga nem marca migrations como aplicadas silenciosamente.

Antes de atualizar uma implantação: faça backup, revise/versione as migrations novas e rode `docker:up` para aplicar o histórico pendente e rebuildar o app.

## 7. Produção com Node.js (sem container da aplicação)

Com um banco **novo ou já gerenciado por migrations**, execute:

```bash
node scripts/run-local.mjs start --existing-db
```

O comando aplica migrations, faz build, copia assets e inicia o servidor standalone. Ele também desabilita o Console Dev e configura convite dev privado. Para um banco local já atualizado usando `push`, se você estiver conscientemente mantendo esse fluxo:

```bash
node scripts/run-local.mjs start --existing-db --skip-schema
```

Use um gerenciador de processos/systemd no servidor para reiniciar o processo após falhas. O comando `start` é bloqueante, não um serviço de background por si só.

## 8. Publicar em um servidor

O modo completo Docker é um ponto de partida para auto-hospedagem:

1. Prepare `.env` privado e backups; não use senhas de exemplo.
2. Defina `APP_URL=https://seu-dominio.com` e cadastre os callbacks HTTPS.
3. Execute `docker:up` e confira os health checks/logs.
4. Coloque um reverse proxy (Nginx/Caddy ou equivalente) com certificado TLS na frente da porta do app.
5. Mantenha o PostgreSQL restrito à máquina/rede privada. Para publicar o app diretamente na rede, configure `APP_BIND_ADDRESS=0.0.0.0` e o firewall; isso **não** substitui TLS.

A sessão de login de produção usa cookie `Secure`, portanto use **HTTPS** em domínios reais. O build de produção não torna o app automaticamente apto a serviço público: antes de expor dados reais, revise autorização/isolamento por usuário, proteção CSRF, rate limiting, política de privacidade, criptografia de tokens OAuth em repouso e backup/restauração. Os tokens atualmente ficam no banco; não são criptografados em repouso pela aplicação.

## 9. Backup e restauração

Exemplo de backup do projeto Docker completo em Bash/PowerShell (crie a pasta de destino e trate o dump como dado sensível):

```bash
docker compose -p dualwave-app -f compose.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > dualwave-backup.sql
```

Ao executar Compose manualmente, configure `DATABASE_URL_DOCKER`, `DEV_SIGNUP_CODE` e os valores PostgreSQL em `.env`; ou use somente `compose.yaml` com o mesmo `-p` para operar o banco, evitando interpretar o arquivo de aplicação.

Para restaurar em um banco vazio, depois de verificar o arquivo e as credenciais:

```bash
docker compose -p dualwave-app -f compose.yaml exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < dualwave-backup.sql
```

Não restaure por cima de dados em uso sem um plano revisado. O SQL de backup contém dados pessoais e tokens: guarde fora do Git. Em Windows, use uma ferramenta/terminal com redirecionamento compatível e verifique a codificação do dump.

## 10. Problemas comuns

| Erro | Como resolver |
|---|---|
| Docker não encontrado ou daemon parado | Instale/inicie Docker Desktop/Engine e Compose v2; se o banco já existe, use `--existing-db` |
| Porta 5432 ocupada | Use seu PostgreSQL instalado com `--existing-db`, pare o serviço concorrente ou ajuste a porta em `DATABASE_URL` |
| Porta 3000 ocupada | Mude `APP_PORT` e `APP_URL`; encerre outro servidor Next.js |
| `DATABASE_URL` inválida | Confira o arquivo efetivo `.env.local`/`.env` e a codificação da senha na URL |
| Autenticação PostgreSQL falhou após mudar a senha | Variáveis de inicialização só valem em volume novo; atualize o usuário com procedimento administrativo ou crie um banco separado sem apagar o antigo |
| `relation already exists` ao migrar | O banco foi criado com `push` e precisa de baseline; não destrua dados para forçar migrations |
| Login OAuth recusa redirect | Cadastre exatamente a URI de origem/porta/domínio mostrada pelo app e confira `APP_URL` |
| Testes respondem 403 no `/api/dev/*` | Você está no modo de produção/Console Dev bloqueado; execute testes no ambiente de desenvolvimento |
| Atualização não aparece | Reexecute `docker:up` para rebuild ou atualize dependências e reinicie o app local |

Ajuda resumida: `node scripts/run-local.mjs --help`.
