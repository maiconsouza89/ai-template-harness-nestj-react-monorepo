#!/bin/sh
# Testes da stack: roda a tarefa `test` de cada pacote do workspace pelo Turborepo (ADR-0002),
# com o Vitest como runner único (ADR-0021): unidade em *.spec.ts e integração da API em
# test/integration/**/*.int-spec.ts. A integração roda contra o banco app_test (spec da fundação,
# "Convenções para as features"): este script sobe postgres e valkey do Compose, recria o banco
# e aplica as migrações antes dos testes, por isso exige Docker com Compose v2.
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "test: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "test: docker não encontrado; os testes de integração usam o PostgreSQL e o Valkey do Compose" >&2
  exit 1
}

# A URL do banco de teste mora só em apps/api/.env.test; o nome do banco é o último segmento.
db_url=$(sed -n 's/^DATABASE_URL=//p' apps/api/.env.test)
db_name=${db_url##*/}
[ -n "$db_name" ] || {
  echo "test: DATABASE_URL não encontrada em apps/api/.env.test" >&2
  exit 1
}

docker compose up -d --wait postgres valkey
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U app -d postgres -q \
  -c "DROP DATABASE IF EXISTS \"$db_name\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$db_name\""
DATABASE_URL="$db_url" pnpm --filter @app/api exec prisma migrate deploy
exec pnpm exec turbo run test
