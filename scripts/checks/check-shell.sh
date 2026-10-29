#!/bin/sh
# Valida a sintaxe de todos os scripts sh e hooks. Usa shellcheck se disponível (obrigatório na CI).
set -eu
cd "$(git rev-parse --show-toplevel)"
files=$(git ls-files 'scripts/*.sh' 'scripts/*/*.sh' '.githooks/*' '.claude/hooks/*.sh')
for f in $files; do
  sh -n "$f" || { echo "check-shell: erro de sintaxe em $f" >&2; exit 1; }
done
if command -v shellcheck >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  shellcheck -s sh $files
  echo "ok: sintaxe e shellcheck em $(echo "$files" | wc -l | tr -d ' ') scripts"
elif [ "${CI:-}" = "true" ]; then
  echo "check-shell: shellcheck não encontrado na CI" >&2
  exit 1
else
  echo "ok: sintaxe de $(echo "$files" | wc -l | tr -d ' ') scripts (shellcheck não instalado, pulado)"
fi
