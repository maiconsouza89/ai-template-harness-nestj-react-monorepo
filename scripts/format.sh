#!/bin/sh
# Formatação da stack: roda a tarefa `format` de cada pacote do workspace pelo Turborepo
# (ADR-0002), que aplica o Prettier (ADR-0022) e grava os arquivos.
set -eu
cd "$(git rev-parse --show-toplevel)"
command -v pnpm >/dev/null 2>&1 || {
  echo "format: pnpm não encontrado; instale a versão de packageManager do package.json" >&2
  exit 1
}
exec pnpm exec turbo run format
