#!/bin/sh
# Valida o nome do branch: <tipo>/<descricao-com-hifens>, mesmos tipos do commit.
# main é exceção. Na CI usa GITHUB_HEAD_REF (o checkout do PR fica em HEAD destacado) e pula PRs
# de fork (PR_FROM_FORK=true), cujo nome o contribuidor externo não controla.
set -eu
if [ "${PR_FROM_FORK:-}" = "true" ]; then
  echo "ok: PR de fork, nome do branch não verificado"
  exit 0
fi
branch="${GITHUB_HEAD_REF:-$(git branch --show-current)}"
if [ -z "$branch" ]; then
  echo "aviso: HEAD destacado, nome do branch não verificado"
  exit 0
fi
case "$branch" in
  main) echo "ok: branch main"; exit 0 ;;
  release-please--*) echo "ok: branch do release-please"; exit 0 ;;
esac
types='build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test'
if printf '%s\n' "$branch" | grep -Eq "^($types)/[a-z0-9][a-z0-9.-]*$"; then
  echo "ok: nome do branch '$branch'"
else
  printf '%s\n' "check-branch: nome de branch inválido: $branch" "" \
    "Formato: <tipo>/<descricao-com-hifens>, minúsculas, mesmos tipos do commit:" \
    "  $types" \
    "Exemplos: feat/hook-commit-msg, docs/traduz-adrs, ci/workflows-agnosticos" \
    "Renomeie: git branch -m <tipo>/<descricao>" >&2
  exit 1
fi
