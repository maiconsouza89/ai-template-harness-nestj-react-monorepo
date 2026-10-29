#!/bin/sh
# Lint da stack: roda a tarefa `lint` de cada pacote do workspace pelo Turborepo (ADR-0002),
# oxlint sem lint de tipos e Prettier em modo de conferência (ADR-0022).
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "lint: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
exec pnpm exec turbo run lint
