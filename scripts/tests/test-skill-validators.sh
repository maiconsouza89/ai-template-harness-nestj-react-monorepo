#!/bin/sh
# Testa os validadores das skills (spec-writer, evaluator e check-skills) com casos aceitos e rejeitados.
# Cada caso monta uma árvore nova: PRD, HLD e ADRs do fixture de evals da spec-writer, mais o
# RF-001 de scripts/tests/fixtures/skill-validators, com uma mutação aplicada.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  if [ "${CI:-}" = "true" ]; then
    echo "erro: python3 ausente; os validadores das skills precisam dele na CI" >&2
    exit 1
  fi
  echo "aviso: python3 ausente; validadores das skills não testados"
  exit 0
fi

spec=.claude/skills/spec-writer/scripts/validate.py
aval=.claude/skills/evaluator/scripts/validate.py
skills=scripts/checks/check-skills.py
docs=.claude/skills/spec-writer/evals/files/viewstore/docs
rf=RF-001-criar-conta-de-exibidor-ou-anunciante
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
pass=0
fail=0

reset() { # recria a árvore do caso; $f é a pasta do RF
  rm -rf "$tmp/raiz"
  mkdir -p "$tmp/raiz/docs/features"
  cp -R "$docs/." "$tmp/raiz/docs/"
  cp -R "scripts/tests/fixtures/skill-validators/$rf" "$tmp/raiz/docs/features/"
  f="$tmp/raiz/docs/features/$rf"
}

edit() { # edit <arquivo da pasta do RF> <expressão sed>
  sed "$2" "$f/$1" > "$tmp/editado" && mv "$tmp/editado" "$f/$1"
}

add_ui() { # add_ui <decisão>: acrescenta a superfície UI ao contrato e a linha dela na tabela da spec
  edit spec.md "/^| API HTTP |/a\\
| UI | navegador abrindo o Painel web | $1 |"
  cat >> "$f/contract.md" <<'UI'

## UI

Modo de verificação: navegador abrindo o Painel web contra a API em execução.

### Cadastro

#### UI-CADASTRO-01
- **Dado:** nenhuma conta com o documento 98765432100.
- **Quando:** a pessoa conclui o formulário de cadastro.
- **Então:**
  - a tela mostra a conta criada
UI
}

fundacao() { # fundacao <decisão da UI>: spec da fundação só com a tabela de verificação
  mkdir -p "$tmp/raiz/docs/features/fundacao"
  printf '%s\n' '# Spec: fundação' '' '## Estratégia de testes' '' 'Verificação por superfície' '' \
    '| Superfície | Mecanismo | Decisão |' '| --- | --- | --- |' "| UI | navegador | $1 |" \
    > "$tmp/raiz/docs/features/fundacao/spec.md"
}

skreset() { # recria uma árvore só com a skill evaluator; $s é a pasta dela
  rm -rf "$tmp/sk"
  mkdir -p "$tmp/sk/.claude/skills"
  cp -R .claude/skills/evaluator "$tmp/sk/.claude/skills/"
  s="$tmp/sk/.claude/skills/evaluator"
}

skedit() { # skedit <arquivo da skill> <expressão sed>
  sed "$2" "$s/$1" > "$tmp/editado" && mv "$tmp/editado" "$s/$1"
}

validate() { # validate <spec|aval|skill>: roda o validador sobre a pasta do RF ou a árvore da skill
  if [ "$1" = spec ]; then
    python3 -I "$spec" "$f" --raiz "$tmp/raiz"
  elif [ "$1" = skill ]; then
    python3 -I "$skills" --raiz "$tmp/sk"
  else
    python3 -I "$aval" "docs/features/$rf" --raiz "$tmp/raiz"
  fi
}

check() { # check <0 aceita|1 rejeita> <spec|aval> <descrição>
  expected=$1
  if validate "$2" > "$tmp/saida" 2>&1; then got=0; else got=1; fi
  if [ "$got" -eq "$expected" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf 'FALHOU (esperado=%s obtido=%s): %s: %s\n' "$expected" "$got" "$2" "$3" >&2
    sed 's/^/  /' "$tmp/saida" >&2
  fi
}

# spec-writer
reset
check 0 spec 'trio base'

reset
edit spec.md 's/^# Spec: RF-001/# Spec: RF-002/'
check 1 spec 'título da spec com outro RF'

reset
edit contract.md '/^Modo de verificação: /d'
check 1 spec 'superfície sem Modo de verificação'

reset
edit spec.md '/^Verificação por superfície$/,/^| API HTTP |/d'
check 1 spec 'Estratégia de testes sem a tabela de verificação'

reset
edit spec.md 's/^| API HTTP | \(.*\) | não precisa |$/| API HTTP | \1 | talvez |/'
check 1 spec 'decisão de verificação desconhecida'

reset
edit contract.md 's/^- \*\*Dado:\*\* nenhuma conta com o documento 98765432100\.$/- **Dado:** um PR que contém o cadastro./'
check 1 spec 'Dado que exige PR'

reset
edit contract.md 's/^- \*\*Quando:\*\* a conta acrescenta o papel anunciante\.$/- **Quando:** o workflow ci.yml roda./'
check 1 spec 'Quando que exige run da CI'

reset
edit contract.md 's/^- \*\*Quando:\*\* a conta acrescenta o papel anunciante\.$/- **Quando:** a conta liga a notificação push./'
check 0 spec 'notificação push não é push do git'

reset
add_ui 'ADR-0004'
edit spec.md '/^| UI |/d'
check 1 spec 'superfície UI sem linha na tabela'

reset
add_ui 'não precisa'
check 1 spec 'UI com não precisa'

reset
add_ui 'ADR-0004'
check 0 spec 'UI decidida por ADR'

reset
add_ui 'pendente de ADR'
check 1 spec 'UI pendente de ADR fora de Pendentes de ADR'

reset
add_ui 'pendente de ADR'
edit spec.md '/^Pendentes de ADR$/,/^---$/s/^- nenhuma$/- Ferramenta de navegador para a superfície UI: Playwright ou Cypress./'
check 0 spec 'UI pendente de ADR e listada'

reset
add_ui 'fundação'
check 1 spec 'UI herdada sem spec da fundação'

reset
add_ui 'fundação'
fundacao 'ADR-0004'
check 0 spec 'UI herdada da fundação com ADR'

reset
add_ui 'fundação'
fundacao 'pendente de ADR'
check 1 spec 'UI herdada da fundação pendente de ADR'

# evaluator
reset
check 0 aval 'avaliação e diário base'

reset
edit orquestracao.md 's/^- Status: esgotado$/- Status: terminado/'
check 1 aval 'status de diário desconhecido'

reset
edit orquestracao.md 's/^- Status: esgotado$/- Status: precisa de decisão/'
check 0 aval 'diário com precisa de decisão'

reset
edit avaliacao.md 's/^- Status: reprovado$/- Status: limpo/'
check 1 aval 'limpo com critério reprovado'

reset
edit avaliacao.md '/^- Dono: código$/d'
check 1 aval 'item falhou sem Dono'

reset
edit avaliacao.md 's/^- Dono: código$/- Dono: alguém/'
check 1 aval 'item com Dono desconhecido'

reset
edit avaliacao.md 's/^- Veredito: passou$/- Veredito: ok/'
check 1 aval 'Veredito desconhecido'

reset
edit avaliacao.md 's/^- Veredito: falhou$/- Veredito: bloqueado: sem ferramenta de navegador no projeto/'
edit avaliacao.md 's/^- Dono: código$/- Dono: decisão/'
check 0 aval 'item bloqueado com Dono decisão'

# check-skills
skreset
check 0 skill 'skill base'

skreset
skedit SKILL.md '3s/$/ Fecha a issue com Closes #N./'
check 1 skill 'description com " #" vira comentário'

skreset
skedit SKILL.md '3s/$/ Nota: corta aqui./'
check 1 skill 'description com ": " vira chave'

skreset
skedit SKILL.md "3s/^description: \(.*\)\$/description: '\1 Nota: entre aspas.'/"
check 0 skill 'description entre aspas simples aceita ": "'

skreset
skedit SKILL.md '3s/^description: \(.*\)$/description: "\1"/'
check 1 skill 'description entre aspas duplas com " interno sem escape'

skreset
skedit SKILL.md '3s/$/ Grava em <pasta>./'
check 1 skill 'description com tag XML'

skreset
skedit SKILL.md "3s/\$/ $(printf '%0200d' 0)/"
check 1 skill 'description acima de 1024 caracteres'

skreset
skedit SKILL.md '2s/^name: evaluator$/name: avaliador/'
check 1 skill 'name diferente da pasta'

skreset
i=0
while [ "$i" -lt 500 ]; do echo "linha $i"; i=$((i + 1)); done >> "$s/SKILL.md"
check 1 skill 'corpo com 500 linhas ou mais'

skreset
skedit references/relatorio.md '/^## Sumário$/d'
check 1 skill 'referência longa sem sumário'

total=$((pass + fail))
if [ "$fail" -gt 0 ]; then
  echo "erro: validadores das skills: $fail de $total casos falharam" >&2
  exit 1
fi
echo "ok: validadores das skills: $total casos"
