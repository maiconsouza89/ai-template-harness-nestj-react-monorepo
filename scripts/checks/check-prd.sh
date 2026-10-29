#!/bin/sh
# Valida docs/product/prd.md com o script da skill prd-writer e regenera docs/product/roadmap.md.
# Falha se o PRD tiver erro de estrutura ou se o roadmap regenerado diferir do versionado.
# Sem docs/product/prd.md (nenhum PRD ainda; a skill cria no primeiro): passa.
# Sem python3: pula com aviso localmente; falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ ! -f docs/product/prd.md ]; then
  echo "ok: nenhum PRD em docs/product/prd.md"
  exit 0
fi
skill=.claude/skills/prd-writer/scripts
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-prd: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, validação do PRD pulada"
  exit 0
fi
# Sem pipe: com set -e e sem pipefail, um `| tail` esconderia o exit 1 do validador.
python3 "$skill/validate.py" docs/product/prd.md
python3 "$skill/roadmap.py" --prd docs/product/prd.md sync >/dev/null
if ! git diff --quiet -- docs/product/roadmap.md || [ -n "$(git ls-files --others --exclude-standard -- docs/product/roadmap.md)" ]; then
  echo "check-prd: docs/product/roadmap.md estava desatualizado e foi regenerado;" \
    "inclua-o no commit" >&2
  exit 1
fi
echo "ok: PRD válido e roadmap em dia"
