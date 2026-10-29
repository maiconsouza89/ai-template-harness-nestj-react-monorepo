#!/bin/sh
# Valida os diagramas C4 em docs/architecture/diagrams com o script da skill c4-writer: esqueleto
# dos .puml, ordem de parâmetros das macros C4, aliases soltos, e o .md de cada conjunto com a
# origem de cada elemento, níveis pulados com motivo e ADRs citados. Avisa quando a fonte (HLD ou
# FDD) subiu de versão depois dos diagramas. Com plantuml no PATH, confere também a sintaxe.
# Sem docs/architecture/diagrams (nenhum diagrama ainda): passa. Sem python3: pula com aviso
# localmente; falha na CI (CI=true). plantuml é opcional em qualquer lugar.
set -eu
cd "$(git rev-parse --show-toplevel)"
dir=docs/architecture/diagrams
if [ ! -d "$dir" ]; then
  echo "ok: nenhum diagrama C4 em $dir"
  exit 0
fi
skill=.claude/skills/c4-writer/scripts
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-c4: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, validação dos diagramas C4 pulada"
  exit 0
fi
python3 "$skill/validate.py" "$dir"
if command -v plantuml >/dev/null 2>&1; then
  sh "$skill/render.sh" --check "$dir"
fi
echo "ok: diagramas C4 válidos"
