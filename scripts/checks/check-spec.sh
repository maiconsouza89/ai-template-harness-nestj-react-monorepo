#!/bin/sh
# Valida as pastas de feature em docs/features com o script da skill spec-writer: forma de
# spec.md, plan.md e contract.md, e o contrato cruzado com o PRD (cada critério de aceitação
# do RF coberto pelo texto literal, nada fora do fecho de dependências), o HLD e os ADRs.
# Avisa quando PRD ou HLD subiram de versão depois da spec. Falha em erro; avisos passam.
# Sem docs/features (nenhuma spec ainda): passa. Sem python3: pula com aviso localmente;
# falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
dir=docs/features
if [ ! -d "$dir" ]; then
  echo "ok: nenhuma spec em $dir"
  exit 0
fi
validate=.claude/skills/spec-writer/scripts/validate.py
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-spec: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, validação das specs pulada"
  exit 0
fi
# Sem pipe: com set -e e sem pipefail, um `| tail` esconderia o exit 1 do validador.
python3 "$validate" "$dir"
echo "ok: specs válidas"
