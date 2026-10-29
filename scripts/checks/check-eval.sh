#!/bin/sh
# Valida os registros de avaliação em docs/features com o script da skill evaluator:
# avaliacao.md (cabeçalho, seções na ordem, status coerente com os critérios) e
# orquestracao.md (título, status e ciclos). Falha quando um RF está 'feito' no roadmap com
# avaliação que não é 'limpo'; avisa quando está 'feito' sem avaliação ou quando os critérios
# avaliados não batem com o manifesto atual do contrato. Falha em erro; avisos passam.
# Sem docs/features: passa. Sem python3: pula com aviso localmente; falha na CI (CI=true).
set -eu
cd "$(git rev-parse --show-toplevel)"
dir=docs/features
if [ ! -d "$dir" ]; then
  echo "ok: nenhuma feature em $dir"
  exit 0
fi
validate=.claude/skills/evaluator/scripts/validate.py
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-eval: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, validação das avaliações pulada"
  exit 0
fi
# Sem pipe: com set -e e sem pipefail, um `| tail` esconderia o exit 1 do validador.
python3 "$validate" "$dir"
echo "ok: avaliações válidas"
