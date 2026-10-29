#!/bin/sh
# Testa os hooks do Claude Code em .claude/hooks/ com casos aceitos e rejeitados: o SubagentStop
# que roda make lint e make test quando o subagente editou código. Cada caso monta o JSON do
# evento e confere o código de saída (2 bloqueia).
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "erro: python3 ausente; os hooks do Claude Code precisam dele na CI" >&2
    exit 1
  fi
  echo "aviso: python3 ausente; hooks do Claude Code não testados"
  exit 0
fi

run="$PWD/.claude/hooks/run.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
pass=0
fail=0

check() { # check <código esperado> <hook> <descrição>; o JSON do evento vem em $tmp/evento
  if sh "$run" "$2" < "$tmp/evento" > "$tmp/saida" 2>&1; then got=0; else got=$?; fi
  if [ "$got" -eq "$1" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf 'FALHOU (esperado=%s obtido=%s): %s: %s\n' "$1" "$got" "$2" "$3" >&2
    sed 's/^/  /' "$tmp/saida" >&2
  fi
}

echo 'isso não é json' > "$tmp/evento"
check 0 subagent 'entrada que não é JSON passa'

# SubagentStop: repositório descartável com Makefile cujo lint passa ou falha
repo="$tmp/repo"
mkdir -p "$repo/src" "$repo/docs"
git -C "$repo" init -q
# O $$ é escape do make; quem expande a variável é o shell da receita.
# shellcheck disable=SC2016
printf 'lint:\n\t@exit $${LINT_EXIT:-0}\ntest:\n\t@true\n' > "$repo/Makefile"

transcript() { # transcript <ferramenta> <caminho>: transcript do subagente com um tool_use
  python3 -I -c 'import json, sys; print(json.dumps({"type": "assistant", "message": {"content": [{"type": "tool_use", "name": sys.argv[1], "input": {"file_path": sys.argv[2]}}]}}))' "$1" "$2" > "$tmp/agente.jsonl"
}

stop_event() { # stop_event <stop_hook_active true|false>
  python3 -I -c 'import json, sys; print(json.dumps({"hook_event_name": "SubagentStop", "cwd": sys.argv[1], "agent_type": "general-purpose", "agent_transcript_path": sys.argv[2], "stop_hook_active": sys.argv[3] == "true"}))' "$repo" "$tmp/agente.jsonl" "$1" > "$tmp/evento"
}

transcript Edit "$repo/src/app.py"
stop_event false
check 0 subagent 'editou código e o lint passa'

export LINT_EXIT=1
check 2 subagent 'editou código e o lint falha'

stop_event true
check 0 subagent 'lint falha, mas já bloqueou uma vez (stop_hook_active)'

transcript Write "$repo/docs/features/RF-001/avaliacao.md"
stop_event false
check 0 subagent 'só escreveu em docs/'

transcript Read "$repo/src/app.py"
stop_event false
check 0 subagent 'só leu arquivos'
unset LINT_EXIT

total=$((pass + fail))
if [ "$fail" -gt 0 ]; then
  echo "erro: hooks do Claude Code: $fail de $total casos falharam" >&2
  exit 1
fi
echo "ok: hooks do Claude Code: $total casos"
