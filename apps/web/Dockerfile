# syntax=docker/dockerfile:1
# Imagem de produção da SPA (ADR-0005): multi-stage com `turbo prune --docker` (ADR-0002), Node 26
# (ADR-0013) e o pnpm na versão do packageManager (ADR-0012; nunca por corepack) só nos estágios de
# build. O `vite build` gera arquivos estáticos (ADR-0004), servidos na imagem final pelo nginx
# oficial em Alpine, com fallback para o index.html nas rotas do React Router: imagem pequena, sem
# runtime Node (hipótese da spec da fundação; ADR pendente da /adr-writer). Construa a partir da
# raiz do monorepo, com a URL da API que o navegador vai chamar, fixada no bundle em tempo de
# build (ADR-0004):
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.exemplo.com -t app-web .
ARG NODE_IMAGE=node:26-bookworm-slim
# nginx estável (1.30) em Alpine; o oficial, não o unprivileged, por isso a porta 80.
ARG NGINX_IMAGE=nginx:1.30-alpine
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
RUN npm install -g "pnpm@${PNPM_VERSION}" && npm cache clean --force
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# pruner: gera em /app/out o monorepo podado para @app/web (`out/json` com os manifestos e o
# lockfile podado; `out/full` com o código de @app/web e @app/contracts).
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN pnpm dlx "turbo@${TURBO_VERSION}" prune @app/web --docker

# ---------------------------------------------------------------------------------------------
# builder: instala as dependências numa camada própria (refeita só quando um manifesto muda) e
# compila Contratos e a SPA pelo Turborepo. O tsconfig.base.json não entra no prune.
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json .
# URL da API vista pelo navegador, lida pelo Vite na build (vite.config.ts, envDir na raiz); o
# .env não entra no contexto, então o valor vem só deste argumento.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm exec turbo run build --filter=@app/web

# ---------------------------------------------------------------------------------------------
# runner: nginx servindo o dist da SPA. Sem Node, sem pnpm, sem código-fonte.
FROM ${NGINX_IMAGE} AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
