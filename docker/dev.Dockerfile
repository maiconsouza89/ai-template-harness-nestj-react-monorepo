# syntax=docker/dockerfile:1
# Imagem de desenvolvimento dos serviços api e web do compose.yaml (ADR-0006): Node 26
# (ADR-0013) com o pnpm instalado na versão do packageManager do package.json raiz (ADR-0012;
# nunca por corepack, que não vem no Node 26). O código entra por bind mount em /app e as
# dependências são instaladas na subida de cada serviço em volumes nomeados (o pnpm guarda o
# store dentro do node_modules raiz, no mesmo volume); por isso dependência nova não exige
# reconstruir esta imagem, só reiniciar o serviço. As imagens de produção (apps/*/Dockerfile,
# multi-stage com turbo prune, ADR-0005) são outras e não derivam desta.
FROM node:26-bookworm-slim

ARG PNPM_VERSION=12.16.1
# openssl: a CLI do Prisma (ADR-0008) detecta a versão da libssl por ele para escolher o engine
# de migração; sem o binário, avisa a cada comando e assume a 1.1.x.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g "pnpm@${PNPM_VERSION}" && npm cache clean --force

# Pontos de montagem dos volumes nomeados, criados aqui com o dono certo: um volume novo herda
# o conteúdo e o dono do diretório da imagem, e o serviço roda como o usuário node (uid 1000),
# o mesmo uid do primeiro usuário de um Linux ou WSL2, para o que ele escrever no bind mount
# (o tsbuildinfo do watch) ficar com o dono do host.
RUN mkdir -p /app/node_modules /app/apps/api/node_modules /app/apps/web/node_modules \
      /app/packages/contracts/node_modules /app/packages/contracts/dist \
    && chown -R node:node /app

USER node
WORKDIR /app
