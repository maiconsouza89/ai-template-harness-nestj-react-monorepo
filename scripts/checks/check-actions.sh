#!/bin/sh
# Valida os workflows do GitHub Actions com actionlint e exige actions fixadas por SHA.
# Sem actionlint: pula com aviso localmente; falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
if ! command -v actionlint >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-actions: actionlint não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: actionlint não instalado, verificação pulada (https://github.com/rhysd/actionlint)"
else
  actionlint
  echo "ok: workflows válidos (actionlint)"
fi

# Toda action externa deve estar fixada por SHA completo com a versão em comentário.
unpinned=$(grep -nE '^\s*-?\s*uses:' .github/workflows/*.yml | grep -vE '@[0-9a-f]{40} # v[0-9]' || true)
if [ -n "$unpinned" ]; then
  printf '%s\n' "check-actions: actions sem SHA completo e comentário de versão (uses: owner/repo@<sha> # vX.Y.Z):" "$unpinned" >&2
  exit 1
fi
echo "ok: actions fixadas por SHA"
