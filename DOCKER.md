# Docker local e dashboard do banco — DualWave

## Onde ficam os containers?

A configuração fica em **`docker-compose.yml`, na raiz do projeto**. Execute os comandos deste guia nessa mesma pasta.

O Compose cria o projeto **`dualwave`** no Docker da máquina em que você executa o comando. No **Docker Desktop → Containers**, procure o grupo `dualwave`:

| Serviço no Compose | Nome do container | Imagem | Acesso na máquina local |
|---|---|---|---|
| `postgres` | **`dualwave-postgres`** | `postgres:17-alpine` | `127.0.0.1:5432` (conexão PostgreSQL, não é uma página web) |
| `pgadmin` | **`dualwave-pgadmin`** | `dpage/pgadmin4:9.14` | **[http://localhost:5050](http://localhost:5050)** — dashboard do banco |

**O site Next.js não faz parte desse Compose.** Ele continua rodando no host com `npm run dev`, normalmente em `http://localhost:3000`. Não há build da imagem do site para subir apenas o banco e o painel.

Os serviços se comunicam pela rede Docker **`dualwave_local`**. Dentro dessa rede, o endereço do banco é **`postgres:5432`**; não use `localhost` no pgAdmin, pois ele apontaria para o próprio container do painel.

## Arquivos

- `docker-compose.yml`: containers, portas, health check, rede e volumes.
- `.env.docker.example`: modelo de credenciais e portas do Docker.
- `.env.docker`: seus valores locais, ignorados pelo Git; crie a partir do exemplo.
- `docker/pgadmin/servers.json`: conexão do PostgreSQL pré-cadastrada no pgAdmin, sem senha.
- `.env`: `DATABASE_URL` usada pelo Next.js e Drizzle (independente de `.env.docker`).

## Subir apenas o banco e o dashboard

Pré-requisitos: Docker Engine/Docker Desktop e **Docker Compose v2**.

```bash
# Na raiz do projeto:
cp .env.docker.example .env.docker
```

Edite `.env.docker` e preencha:

| Variável | Uso |
|---|---|
| `POSTGRES_PASSWORD` | Senha do usuário PostgreSQL `postgres` — escolha uma senha local |
| `POSTGRES_PORT` | Porta do banco no host; padrão `5432` |
| `PGADMIN_DEFAULT_EMAIL` | Login do dashboard; exemplo `dev@example.com` |
| `PGADMIN_DEFAULT_PASSWORD` | Senha do dashboard — escolha uma senha diferente da senha do banco |
| `PGADMIN_PORT` | Porta do dashboard no host; padrão `5050` |

Campos de senha vazios impedem o Compose de iniciar; não há senhas reais embutidas no repositório.

```bash
# Confere a configuração sem imprimir as credenciais:
docker compose --env-file .env.docker config --quiet

# Baixa as imagens e inicia apenas PostgreSQL + pgAdmin (sem build do site):
docker compose --env-file .env.docker up -d --no-build

# Mostra containers e portas:
docker compose --env-file .env.docker ps
```

O pgAdmin inicia depois que o PostgreSQL passa no health check. A primeira inicialização pode levar alguns segundos.

### Conectar o site ao banco Docker

No `.env` do projeto, a `DATABASE_URL` deve usar host `127.0.0.1`, porta `POSTGRES_PORT`, banco `app_db`, usuário `postgres` e **a mesma senha de `POSTGRES_PASSWORD`**.

Formato (substitua `SUA_SENHA` pelo valor escolhido; caracteres especiais devem ser codificados como URL):

```dotenv
DATABASE_URL=postgresql://postgres:SUA_SENHA@127.0.0.1:5432/app_db
```

Se o `.env.local` também definir `DATABASE_URL`, alinhe os dois arquivos: o Next.js pode priorizar `.env.local`, enquanto o Drizzle Kit lê `.env`.

```bash
# Cria/atualiza todas as tabelas do schema atual:
npx drizzle-kit push

# O site segue rodando fora do Docker:
npm run dev
```

O container cria o banco vazio `app_db`. O schema completo vem de `src/db/schema.ts`; as tabelas não aparecem antes de aplicar o schema. Dados do preview ou de outro PostgreSQL **não são importados automaticamente** para esse volume.

## Onde ver a dash do banco?

### pgAdmin — painel completo

1. Abra **[http://localhost:5050](http://localhost:5050)** no navegador da máquina em que os containers estão rodando.
2. Entre com `PGADMIN_DEFAULT_EMAIL` e `PGADMIN_DEFAULT_PASSWORD`, definidos em `.env.docker`.
3. No menu lateral, abra **Servers → DualWave → DualWave — PostgreSQL local**.
4. Quando solicitado, informe **`POSTGRES_PASSWORD`** para conectar ao banco.
5. Abra **Databases → app_db → Schemas → public → Tables**.
6. Clique com o botão direito em uma tabela → **View/Edit Data → All Rows** para ver registros.
7. Use **Tools → Query Tool** para consultar SQL; a aba **Dashboard** do servidor exibe conexões e atividade.

Tabelas esperadas após `drizzle-kit push`: `app_users`, `auth_sessions`, `user_sessions`, `connected_accounts`, `playlists`, `tracks`, `search_history` e `app_settings`.

**Existem três logins diferentes:** o login do DualWave (usuário do site), o login do pgAdmin (dashboard) e a credencial PostgreSQL (conexão ao banco). Eles não se substituem.

A definição de servidor é importada na primeira criação do volume do pgAdmin. Se precisar cadastrar manualmente: **Register → Server**, nome `DualWave — PostgreSQL local`, host `postgres`, porta `5432`, maintenance database `app_db`, usuário `postgres` e a senha do banco. Não é necessário apagar volumes para registrar uma conexão.

### Console Dev do app

O Console Dev continua em **[http://localhost:3000/dev](http://localhost:3000/dev)**. Ele mostra contagens/dados e um atalho para o pgAdmin, mas não substitui o painel completo de administração.

Se trocar `PGADMIN_PORT`, ajuste `NEXT_PUBLIC_DB_DASHBOARD_URL` no `.env` do app e reinicie o `npm run dev` para atualizar o atalho.

### Drizzle Studio — alternativa sem pgAdmin

Com a `DATABASE_URL` configurada:

```bash
npx drizzle-kit studio
```

Abra **[https://local.drizzle.studio](https://local.drizzle.studio)** e mantenha o comando ativo. O servidor local do Studio usa `127.0.0.1:4983` por padrão e se conecta ao banco especificado em `drizzle.config.ts`.

## Onde os dados são armazenados?

São **volumes nomeados do Docker**, não pastas de código:

| Volume | Caminho dentro do container | Conteúdo |
|---|---|---|
| `dualwave_postgres_data` | `/var/lib/postgresql/data` | Banco, usuários do site, senhas com hash, playlists e tokens OAuth |
| `dualwave_pgadmin_data` | `/var/lib/pgadmin` | Conta, sessões e preferências do pgAdmin |

No **Docker Desktop → Volumes**, procure esses nomes. Para consultar o caminho gerenciado pelo Docker:

```bash
docker volume inspect dualwave_postgres_data
docker volume inspect dualwave_pgadmin_data
```

No Docker Desktop, esse armazenamento pode ficar dentro da VM do Docker, não em uma pasta diretamente acessível no host. Não edite os arquivos físicos do PostgreSQL enquanto o banco estiver rodando.

Parar ou recriar containers preserva os volumes. **`docker compose down -v` é destrutivo: apaga os volumes e os dados.** Não use como rotina de reinício.

## Comandos de manutenção (sem build do site)

```bash
# Logs do banco:
docker compose --env-file .env.docker logs -f postgres

# Logs do dashboard:
docker compose --env-file .env.docker logs -f pgadmin

# Reiniciar somente o painel:
docker compose --env-file .env.docker restart pgadmin

# Parar os containers, preservando dados:
docker compose --env-file .env.docker stop

# Remover containers e rede, preservando os volumes:
docker compose --env-file .env.docker down
```

## Problemas comuns e segurança

- **Porta 5432 ocupada:** não sobrescreva o PostgreSQL existente. Escolha `POSTGRES_PORT=5433` em `.env.docker` e use porta `5433` na `DATABASE_URL`. No pgAdmin, a porta interna continua `5432`.
- **Porta 5050 ocupada:** escolha outra `PGADMIN_PORT`; use essa nova porta no navegador e no atalho do Console Dev.
- **Banco não aparece no painel:** verifique se o servidor foi conectado e se `npx drizzle-kit push` terminou sem erros.
- **Senha não muda após editar `.env.docker`:** as variáveis iniciais do PostgreSQL e do pgAdmin criam contas somente ao inicializar volumes vazios. Mude senhas pelo banco/painel para preservar dados; não apague volumes como solução automática.
- **Preview hospedado não abre `localhost:5050`:** esse endereço é da sua máquina, não do servidor do preview. O pgAdmin só existe onde você executou o Docker. Para servidor remoto, prefira túnel SSH/VPN; não publique o painel sem autenticação e TLS.
- **Não subir segredos para o Git:** `.env` e `.env.docker` estão ignorados. Apenas os exemplos podem ser versionados.
- As portas publicadas são vinculadas a **`127.0.0.1`**, sem acesso pela rede externa por padrão. Este Compose é para desenvolvimento local, não uma configuração de produção.

Referências: [pgAdmin em containers](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html), [rede do Docker Compose](https://docs.docker.com/compose/how-tos/networking/) e [Drizzle Studio](https://orm.drizzle.team/docs/drizzle-kit-studio).
