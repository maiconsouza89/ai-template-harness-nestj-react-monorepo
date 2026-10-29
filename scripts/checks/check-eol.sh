#!/bin/sh
# Falha se algum arquivo versionado tiver fim de linha CRLF no índice.
set -eu
cd "$(git rev-parse --show-toplevel)"
bad=$(git ls-files --eol | awk '$1 ~ /crlf|mixed/ { print $NF }')
if [ -n "$bad" ]; then
  printf 'check-eol: arquivos com CRLF:\n%s\n' "$bad" >&2
  exit 1
fi
echo "ok: fim de linha LF em todos os arquivos"
