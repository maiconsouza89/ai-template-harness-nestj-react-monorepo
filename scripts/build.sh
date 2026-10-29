#!/bin/sh
# Build da stack: roda a tarefa `build` de cada pacote do workspace pelo Turborepo (ADR-0002),
# na ordem das dependências (Contratos antes da API e da SPA) e com cache local.
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "build: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
exec pnpm exec turbo run build
