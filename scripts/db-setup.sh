#!/bin/sh
# Preparo do banco (spec da fundação, "Fluxo técnico da subida local"): aplica as migrações do
# Prisma e roda o seed idempotente do primeiro admin, os dois num container do serviço api do
# Compose, que relê o .env da raiz a cada execução (ADMIN_EMAIL e ADMIN_PASSWORD vêm dele).
# Idempotente: rodar de novo não aplica migração nem duplica o admin. Exige Docker com Compose v2
# e o .env copiado de .env.example; o ambiente (docker compose up -d --wait) deve ter subido antes.
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v docker >/dev/null 2>&1 || {
  echo "db-setup: docker não encontrado; instale o Docker com Compose v2" >&2
  exit 1
}
[ -f .env ] || {
  echo "db-setup: .env não encontrado; copie de .env.example (cp .env.example .env)" >&2
  exit 1
}

# Container efêmero do serviço api: mesma imagem, volumes de node_modules e .env que o serviço.
run_api() {
  docker compose run --rm -T --no-deps api "$@"
}

docker compose up -d --wait postgres
# Garante as dependências no volume se o serviço api ainda não subiu nenhuma vez.
run_api pnpm install --frozen-lockfile --prefer-offline --reporter=silent --filter '@app/api...'
run_api pnpm --filter @app/api exec prisma migrate deploy
# O seed importa o cliente gerado; garante-o caso o serviço api ainda não tenha gerado.
run_api pnpm --filter @app/api generate
run_api pnpm --filter @app/api exec prisma db seed
