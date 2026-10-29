#!/bin/sh
# Audita o formato das skills em .claude/skills/ contra a documentação oficial: frontmatter que o
# YAML lê sem cortar (sem ': ' nem ' #' em valor sem aspas), name igual à pasta e dentro das
# regras, description até 1024 caracteres e sem tag XML, corpo do SKILL.md abaixo de 500 linhas e
# '## Sumário' em referência com mais de 100 linhas. A lógica e as fontes estão em
# check-skills.py. Sem .claude/skills: passa. Sem python3: pula com aviso localmente; falha na CI.
set -eu
cd "$(git rev-parse --show-toplevel)"
if [ ! -d .claude/skills ]; then
  echo "ok: nenhuma skill em .claude/skills"
  exit 0
fi
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "check-skills: python3 não encontrado na CI" >&2
    exit 1
  fi
  echo "aviso: python3 não instalado, auditoria das skills pulada"
  exit 0
fi
python3 -I scripts/checks/check-skills.py
