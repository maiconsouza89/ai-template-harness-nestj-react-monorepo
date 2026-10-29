#!/bin/sh
# Testes da stack: roda a tarefa `test` de cada pacote do workspace pelo Turborepo (ADR-0002),
# com o Vitest como runner único (ADR-0021): unidade em *.spec.ts e integração da API em
# test/integration/**/*.int-spec.ts. A integração roda contra o banco app_test (spec da fundação,
# "Convenções para as features"): este script sobe postgres, valkey e mailpit do Compose, recria
# o banco, esvazia o banco lógico do Valkey de teste e aplica as migrações antes dos testes, por
# isso exige Docker com Compose v2. O Mailpit recebe o SMTP do worker de e-mail (RF-001).
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "test: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "test: docker não encontrado; os testes de integração usam o PostgreSQL, o Valkey e o Mailpit do Compose" >&2
  exit 1
}

# A URL do banco de teste mora só em apps/api/.env.test; o nome do banco é o último segmento.
db_url=$(sed -n 's/^DATABASE_URL=//p' apps/api/.env.test)
db_name=${db_url##*/}
[ -n "$db_name" ] || {
  echo "test: DATABASE_URL não encontrada em apps/api/.env.test" >&2
  exit 1
}

# O banco lógico do Valkey de teste é o último segmento de REDIS_URL (redis://host:porta/N).
redis_url=$(sed -n 's/^REDIS_URL=//p' apps/api/.env.test)
redis_db=${redis_url##*/}
case $redis_db in
  '' | *[!0-9]*)
    echo "test: REDIS_URL em apps/api/.env.test precisa terminar no número do banco lógico (/1)" >&2
    exit 1
    ;;
esac

docker compose up -d --wait postgres valkey mailpit
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U app -d postgres -q \
  -c "DROP DATABASE IF EXISTS \"$db_name\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$db_name\""
# Jobs de execuções anteriores apontariam para usuários do banco que acabou de ser recriado.
docker compose exec -T valkey valkey-cli -n "$redis_db" FLUSHDB >/dev/null
DATABASE_URL="$db_url" pnpm --filter @app/api exec prisma migrate deploy
exec pnpm exec turbo run test
