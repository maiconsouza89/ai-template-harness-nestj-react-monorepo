# Contribuindo

Como trabalhar neste repositório: ambiente, verificações, fluxo, commits e releases.

## Ambiente

| Ferramenta | Versão | Uso |
| --- | --- | --- |
| Git | ≥ 2.22 | `core.hooksPath`, `git branch --show-current` |
| POSIX `sh` | qualquer | hooks e scripts |
| GNU Make | ≥ 3.81 | `make setup`, `make check` |
| shellcheck | opcional | lint dos scripts em `make check-shell`; sem ele, só a sintaxe é validada |
| actionlint | opcional | valida os workflows em `make check-actions`; sem ele, pula com aviso |
| gitleaks | opcional | procura segredos em `make check-secrets`; sem ele, pula com aviso |
| python3 | opcional | validação de ADRs, PRD, HLD, diagramas C4, specs e avaliações em `make check-adr`, `check-prd`, `check-hld`, `check-c4`, `check-spec`, `check-eval`, `check-validators`, `check-skills` e `check-claude-hooks`, e nos hooks do Claude Code; sem ele, pulam com aviso |
| plantuml | opcional | sintaxe dos diagramas C4 em `make check-c4` e SVG via skill `/c4-writer`; sem ele, só a estrutura é validada (não é exigido na CI) |

As ferramentas opcionais são obrigatórias na CI (`CI=true make check` reproduz isso localmente).
No Windows, use WSL ou Git Bash (ambos trazem `sh`; `make` vem via WSL, Chocolatey ou Scoop).
`.editorconfig` cuida de UTF-8, LF e indentação; no VS Code, aceite a extensão recomendada em
`.vscode/extensions.json`.

Após o clone, uma única vez:

```sh
make setup    # aponta core.hooksPath para .githooks/; o Git não ativa hooks sozinho
make check    # confirma que tudo passa
```

## Verificações

`make check` é a única porta de entrada e deve passar antes de cada commit e de abrir um PR. A
CI (`.github/workflows/ci.yml`) roda o mesmo alvo, então o que passa local passa lá. `make help`
lista cada `check-*` com o que ele valida; o cabeçalho de cada `scripts/checks/check-*.sh`
detalha. Cada alvo também roda sozinho: `make check-hooks`.

O ruleset de `main` exige dois checks verdes antes do merge:

| Check | Workflow | O que faz |
| --- | --- | --- |
| `check` | `ci.yml` | `make check` em Ubuntu com Node 26, o pnpm do `packageManager`, as dependências do workspace, shellcheck, actionlint e gitleaks instalados (histórico completo) |
| `pr-title` | `pr-title.yml` | Título do PR no padrão do hook `commit-msg` |

Para adicionar uma verificação:

1. Crie `scripts/checks/check-<nome>.sh` em POSIX `sh`, com `set -eu`, saída `ok: ...` no sucesso
   e mensagem clara no erro (`exit 1`).
2. Adicione o alvo `check-<nome>` no `Makefile` com comentário `##` e inclua-o nas dependências
   de `check`.
3. Se a verificação aplicar uma regra nova, registre a regra em `CLAUDE.md`.

O hook `commit-msg` é POSIX `sh` em `.githooks/`, e não pre-commit, lefthook ou commitlint, para
não trazer Node nem Python ao template. Ao mudar o hook, acrescente antes o caso em
`scripts/tests/test-commit-msg.sh`: um aceito e um rejeitado para cada regra nova. A mesma regra
vale para os validadores das skills (`validate.py` da `/spec-writer` e da `/evaluator`, e o
`scripts/checks/check-skills.py`): cada
regra nova ganha os dois casos em `scripts/tests/test-skill-validators.sh`, que `make
check-validators` roda sobre os fixtures de `scripts/tests/fixtures/skill-validators/`.

Os hooks do Claude Code ficam em `.claude/hooks/` e são ligados por `.claude/settings.json`
([referência](https://code.claude.com/docs/en/hooks)): exit 2 bloqueia, e o stderr volta ao
Claude como motivo. O SubagentStop roda `make lint` e `make test` quando o
subagente editou código fora de `docs/` e devolve a falha a ele uma vez; na segunda parada
(`stop_hook_active`) deixa encerrar, para falha anterior não virar laço. Edição feita por Bash
(`sed -i`) não aparece no transcript e escapa dele. Cada regra nova ganha um caso aceito e um
rejeitado em `scripts/tests/test-claude-hooks.sh` (`make check-claude-hooks`).

Actions em `.github/workflows/` ficam fixadas por SHA completo com comentário da versão
([por quê](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions));
ao atualizar, troque SHA e comentário juntos.

`make lint`, `make format`, `make test`, `make build` e `make db-setup` existem em qualquer
projeto gerado. Para implementar, crie `scripts/<alvo>.sh` (POSIX sh, pode chamar a ferramenta da
stack) e registre a escolha da stack em um ADR. Enquanto o script não existe, o alvo avisa e passa.
Neste repositório, `make test` sobe `postgres`, `valkey` e `mailpit` do Compose, recria o banco
`app_test`, esvazia o banco lógico do Valkey de teste (o de `REDIS_URL` em `apps/api/.env.test`) e
aplica as migrações antes dos testes de integração, e `make db-setup` aplica as migrações e cria o
primeiro admin do `.env` num container do serviço `api`: os dois exigem Docker com Compose v2.

## Fluxo de trabalho ([GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow))

1. Crie um branch a partir de `main` no formato `<tipo>/<descricao-com-hifens>`, com os mesmos
   tipos do commit: `feat/hook-commit-msg`, `fix/crlf-powershell`, `docs/traduz-guia`.
   `make check-branch` valida o nome.
2. Faça commits convencionais no branch (ver abaixo), com `make check` passando.
3. Abra o pull request com título no formato Conventional Commits e preencha o template (o quê,
   por quê, checklist). Com squash merge, o título do PR vira o cabeçalho do commit em `main`.
4. Aguarde os checks obrigatórios e responda à revisão.
5. Faça merge por squash. O branch é apagado automaticamente.

`main` só recebe mudanças por pull request. Não há branches permanentes de `develop` ou
`release`.

## Mensagens de commit

Formato ([Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/)):

```text
<tipo>[(escopo)][!]: <descrição>

[corpo]

[rodapé(s)]
```

| Tipo | Uso | Efeito na versão |
| --- | --- | --- |
| `feat` | Nova funcionalidade | MINOR |
| `fix` | Correção | PATCH |
| `perf` | Desempenho | PATCH |
| `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert` | Sem efeito, salvo breaking change | nenhum |

Regras:

- Tipos e escopos em inglês; descrição em português, minúsculas, no imperativo, sem ponto
  final, até 72 caracteres.
- Breaking change: `!` antes dos dois-pontos ou rodapé `BREAKING CHANGE: ...`. Efeito MAJOR.
- Corpo: o quê e por quê, separado do cabeçalho por uma linha em branco.
- Rodapés no formato `Token: valor` (`Refs: #12`, `Co-authored-by: ...`).
- Assinatura de commits não é exigida.

Exemplos:

```text
feat(hooks): valida cabeçalho de commit com hook commit-msg
fix(gitattributes): mantém crlf em scripts powershell
chore!: exige commits assinados
```

## Versões e releases

- [SemVer 2.0.0](https://semver.org/lang/pt-BR/) a partir de `0.1.0`; a tag `vX.Y.Z` é a fonte
  da verdade da versão.
- A release é automática com o [release-please](https://github.com/googleapis/release-please):
  a cada merge em `main`, ele abre ou atualiza o PR `chore(release): vX.Y.Z` com a versão e o
  `CHANGELOG.md` calculados dos commits (`feat` → Adicionado, `fix` → Corrigido, `perf` →
  Alterado, `revert` → Revertido) e o mescla sozinho quando os checks passam. É a única opção
  automática que não exige dar bypass do ruleset a um bot. Para segurar uma release, não mescle
  esse PR.
- Os demais tipos não aparecem no changelog e não geram versão: o release-please trata todo tipo
  visível no changelog como lançável, por isso `ci` e `build` ficam ocultos.
- O workflow usa o secret `RELEASE_PLEASE_TOKEN` porque um PR criado com `GITHUB_TOKEN` não
  dispara a CI; sem o secret, o PR de release precisa de merge manual.
- Não edite `CHANGELOG.md` nem `.release-please-manifest.json` à mão.
- Para testar a configuração sem criar nada:
  `npx release-please release-pr --repo-url=<owner>/<repo> --token="$(gh auth token)" --dry-run`.

## Decisões

Decisão de arquitetura ou tecnologia do projeto cara de reverter (stack, ferramenta,
infraestrutura, contrato técnico) vira um ADR em `docs/architecture/adr/`, criado com a skill
`/adr-writer`, que também monta a pasta e suas regras na primeira vez. Regra de negócio não é ADR;
vai para o `docs/product/prd.md`. Depois de criar ou mudar um ADR, rode `make check-adr` e inclua
o `index.md` regenerado no commit.

PRD e HLD seguem a mesma regra: `make check-prd` valida o `docs/product/prd.md` e falha se o
`docs/product/roadmap.md` regenerado diferir do versionado; `make check-hld` valida o
`docs/architecture/hld.md` contra o PRD e os ADRs (RF que não existe, ADR superseded citado,
tecnologia pendente que já tem ADR aceito). Diagramas C4 também: `make check-c4` valida os
`.puml` e o `.md` de origem em `docs/architecture/diagrams/`, gerados pela skill `/c4-writer`, e
avisa quando o HLD subiu de versão depois deles. As specs por RF em `docs/features/`, geradas
pela skill `/spec-writer`, passam por `make check-spec`: o contrato precisa cobrir cada critério de
aceitação do RF pelo texto literal do PRD e não pode exigir RF fora do fecho de dependências. A
avaliação de cada RF, gravada pela skill `/evaluator` em `docs/features/<pasta>/avaliacao.md` (e o
diário `orquestracao.md` da `/implement-and-evaluate`), passa por `make check-eval`: falha quando
o roadmap marca `feito` um RF cuja avaliação não está limpa. Os seis rodam em `make check`.

As próprias skills passam por `make check-skills`, que aplica as regras da
[documentação oficial](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices):
`name` igual à pasta, `description` até 1.024 caracteres e sem tag XML, corpo do `SKILL.md`
abaixo de 500 linhas e `## Sumário` em referência com mais de 100 linhas. Ele também recusa
valor sem aspas no frontmatter com `: ` ou ` #`, que o YAML lê como nova chave ou comentário e
corta sem erro.
