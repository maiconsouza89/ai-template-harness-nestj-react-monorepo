#!/bin/sh
# Audita docs/architecture/adr com o script da skill adr-writer e regenera index.md.
# Falha se houver erro de formato ou se o index.md regenerado diferir do versionado.
# Sem docs/architecture/adr (nenhum ADR ainda; a skill cria a pasta no primeiro): passa.
# Sem python3: pula com aviso localmente; falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ ! -d docs/architecture/adr ]; then
  echo "ok: nenhum ADR em docs/architecture/adr"
  exit 0
fi
audit=.claude/skills/adr-writer/scripts/audit.py
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-adr: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, auditoria de ADRs pulada"
  exit 0
fi
python3 "$audit" docs/architecture/adr --index >/dev/null
if ! git diff --quiet -- docs/architecture/adr/index.md; then
  echo "check-adr: docs/architecture/adr/index.md estava desatualizado e foi regenerado;" \
    "inclua-o no commit" >&2
  exit 1
fi
python3 "$audit" docs/architecture/adr | tail -n 1
