# syntax=docker/dockerfile:1
# Imagem de produção da API (ADR-0005): multi-stage com `turbo prune --docker` (ADR-0002) para
# só os pacotes de que a API depende entrarem no build, Node 26 (ADR-0013) e o pnpm instalado na
# versão do packageManager do package.json raiz (ADR-0012; nunca por corepack, que não vem no
# Node 26). Construa a partir da raiz do monorepo:
#   docker build -f apps/api/Dockerfile -t app-api .
# A imagem final leva só o dist da API e de Contratos e as dependências de produção: sem os .ts
# do código-fonte, sem @nestjs/cli nem o resto das devDependencies. A configuração entra por
# variável de ambiente na subida (a API valida e nomeia a que faltar); as migrações não rodam
# aqui, e sim por `make db-setup`.
ARG NODE_IMAGE=node:26-bookworm-slim
ARG PNPM_VERSION=12.16.1
# Mesma versão do turbo do package.json raiz: o prune roda antes de qualquer `pnpm install`.
ARG TURBO_VERSION=2.11.10

# ---------------------------------------------------------------------------------------------
# base: Node 26 com o pnpm; usado pelos estágios de build, não pela imagem final.
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV TURBO_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
# openssl: a CLI do Prisma (ADR-0008) detecta a versão da libssl por ele no postinstall de
# @prisma/engines e no `prisma generate`; sem o binário, avisa a cada comando (como na imagem de
# desenvolvimento). A imagem final não precisa dele: o cliente gerado roda sem engine nativo.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g "pnpm@${PNPM_VERSION}" && npm cache clean --force
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# pruner: gera em /app/out o monorepo podado para @app/api. `out/json` tem só os package.json e
# o lockfile podado (camada de instalação, refeita só quando um manifesto muda); `out/full` tem o
# código dos pacotes do grafo (ADR-0005).
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN pnpm dlx "turbo@${TURBO_VERSION}" prune @app/api --docker

# ---------------------------------------------------------------------------------------------
# deps: todas as dependências (com as de desenvolvimento) do workspace podado, para compilar.
# O store do pnpm fica num cache mount do BuildKit e sobrevive entre builds.
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ---------------------------------------------------------------------------------------------
# deps-prod: só as dependências de produção, no mesmo layout de pastas, para a imagem final
# copiar os node_modules sem @nestjs/cli, prisma CLI, oxlint, vitest e companhia.
FROM base AS deps-prod
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir /pnpm/store

# ---------------------------------------------------------------------------------------------
# builder: compila Contratos e a API pelo Turborepo (`generate` do Prisma antes do `build`,
# turbo.json). O tsconfig.base.json não entra no prune e é copiado à mão.
FROM deps AS builder
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json .
RUN pnpm exec turbo run build --filter=@app/api

# ---------------------------------------------------------------------------------------------
# runner: imagem final, só com o que roda. Sem pnpm, sem código-fonte, com o usuário node.
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=deps-prod --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps-prod --chown=node:node /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder --chown=node:node /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist

USER node
WORKDIR /app/apps/api
EXPOSE 3000
# O mesmo GET /api/health do Compose; PORT muda a porta da API e do health check juntos.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch(`http://localhost:${process.env.PORT ?? 3000}/api/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# A instrumentação do OpenTelemetry (ADR-0019) entra por --import antes da aplicação; é o mesmo
# comando do script start:prod do apps/api/package.json.
CMD ["node", "--import", "./dist/instrumentation.js", "dist/main.js"]
