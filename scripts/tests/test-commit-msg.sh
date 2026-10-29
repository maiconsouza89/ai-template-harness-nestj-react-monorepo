#!/bin/sh
# Testa .githooks/commit-msg com cabeçalhos válidos e inválidos.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
hook=.githooks/commit-msg
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
pass=0
fail=0

check() { # check <0 aceita|1 rejeita> <mensagem>
  expected=$1
  printf '%b' "$2" > "$tmp"
  if sh "$hook" "$tmp" >/dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" -eq "$expected" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf 'FALHOU (esperado=%s obtido=%s): %s\n' "$expected" "$got" "$2" >&2
  fi
}

# Aceitos
check 0 'feat(hooks): valida cabeçalho de commit com hook commit-msg'
check 0 'fix: corrige fim de linha em scripts powershell'
check 0 'chore!: exige commits assinados'
check 0 'docs: adiciona fundação, ADRs iniciais e arquivos de comunidade'
check 0 'refactor(core/api): simplifica validação'
check 0 'feat: é possível usar acento no início'
check 0 'ci: 2 jobs em paralelo'
check 0 'feat: x'
check 0 'fix: ção'
check 0 'feat: descrição com exatamente setenta e dois caracteres em português ok'
check 0 'Merge branch main into feature'
check 0 'fixup! feat: algo'
check 0 'feat: cabeçalho\n\ncorpo com explicação'

# Rejeitados
check 1 'feat: Descrição com maiúscula'
check 1 'feat: termina com ponto.'
check 1 'feature: tipo desconhecido'
check 1 'feat:sem espaço'
check 1 'feat: '
check 1 'feat:  dois espaços'
check 1 'feat(Escopo): escopo maiúsculo'
check 1 'sem tipo nenhum'
check 1 'feat: cabeçalho\ncorpo sem linha em branco'
check 1 'feat: descrição acentuadíssima que ultrapassa o limite de setenta e dois caracteres'
check 1 'feat: termina com espaço '

echo "ok: hook commit-msg, $pass casos passaram, $fail falharam"
[ "$fail" -eq 0 ]
