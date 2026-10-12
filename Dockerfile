# syntax=docker/dockerfile:1
# Imagens separadas: dependências, migrations, build e execução standalone.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Serviço de inicialização: aplica migrations versionadas, não usa "push".
FROM deps AS migrator
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema.ts ./src/db/schema.ts
USER node
CMD ["./node_modules/.bin/drizzle-kit", "migrate"]

FROM deps AS builder
COPY . .
# A URL fictícia só satisfaz a configuração durante o build.
# Não conecta ao banco e não inclui credenciais reais na imagem.
RUN mkdir -p public && DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
