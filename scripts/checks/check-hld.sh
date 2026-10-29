#!/bin/sh
# Valida docs/architecture/hld.md com o script da skill hld-writer, que cruza o HLD com o PRD
# (docs/product/prd.md) e com os ADRs (docs/architecture/adr/): RF fora do PRD, ADR citado que
# não existe ou está superseded, tecnologia 'pendente de ADR' com ADR aceito. Falha em erro;
# avisos passam. Sem docs/architecture/hld.md (nenhum HLD ainda; a skill cria no primeiro): passa.
# Sem python3: pula com aviso localmente; falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ ! -f docs/architecture/hld.md ]; then
  echo "ok: nenhum HLD em docs/architecture/hld.md"
  exit 0
fi
validate=.claude/skills/hld-writer/scripts/validate.py
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-hld: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, validação do HLD pulada"
  exit 0
fi
# Sem pipe: com set -e e sem pipefail, um `| tail` esconderia o exit 1 do validador.
python3 "$validate" docs/architecture/hld.md
echo "ok: HLD válido"
