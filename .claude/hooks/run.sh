#!/bin/sh
# Ponte entre .claude/settings.json e hooks.py: `run.sh subagent` (SubagentStop, roda make lint
# e make test quando o subagente editou código fora de docs/). Sem python3, avisa e deixa passar:
# as regras das skills continuam valendo, e travar todo subagente por falta de python seria pior.
set -u
if ! command -v python3 >/dev/null 2>&1; then
  echo "aviso: python3 ausente; hook '$1' do Claude Code não conferiu nada" >&2
  exit 0
fi
exec python3 -I "$(dirname "$0")/hooks.py" "$@"
