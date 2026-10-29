#!/bin/sh
# Testes da stack: roda a tarefa `test` de cada pacote do workspace pelo Turborepo (ADR-0002),
# com o Vitest como runner único (ADR-0021): unidade em *.spec.ts e integração da API em
# test/integration/**/*.int-spec.ts.
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "test: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
exec pnpm exec turbo run test
