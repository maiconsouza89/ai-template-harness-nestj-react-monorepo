# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Template de app web (contas de usuário e tarefas) em monorepo pnpm + Turborepo: API NestJS, SPA
React e pacote de contratos Zod. Este arquivo é um mapa: leia o documento que a tarefa pedir antes
de alterar código. A explicação do produto e das decisões técnicas está em `docs/`.

## Estrutura

- `apps/api`: NestJS 12, Prisma, PostgreSQL, Valkey/BullMQ. Clean Architecture com casos de uso por
  pasta, em `src/modules/<módulo>/{domain,application,infra,presentation}`; infraestrutura
  transversal em `src/platform/`. A regra de dependência é fiscalizada pelo dependency-cruiser.
- `apps/web`: SPA Vite + React 19 + React Router + Tailwind 4. Design em `DESIGN.md`.
- `packages/contracts` (`@app/contracts`): schemas Zod compartilhados entre API e SPA.
- `docs/`: fonte de verdade do produto e da arquitetura (veja abaixo).

## Comandos

O `Makefile` é a porta de entrada; não chame `scripts/` diretamente, salvo para depurar.

```sh
make setup                    # uma vez após o clone: ativa os hooks de .githooks/
cp .env.example .env && docker compose up -d --wait   # sobe api, web, postgres, valkey, mailpit
make db-setup                 # migrações + primeiro admin do .env (exige Docker)
make lint | format | test | build
make check                    # tudo que a CI roda; passa antes de commit e de PR
make check-<nome>             # uma verificação isolada (lista em make help)
```

`make test` sobe postgres, valkey e mailpit, recria o banco `app_test` e roda unidade + integração.
Para rodar um teste só, na API: `pnpm --filter @app/api exec vitest run <arquivo>` (unidade,
`*.spec.ts`) ou `... vitest run --config ./vitest.integration.config.ts <arquivo>` (integração,
`test/integration/**/*.int-spec.ts`, exige o Compose no ar).

## Documentação (`docs/`)

| Preciso de | Leia |
| --- | --- |
| Regras de produto, requisitos `RF-NNN` | `docs/product/prd.md` |
| Andamento por requisito | `docs/product/roadmap.md` (gerado, não edite o status à mão fora das skills) |
| Desenho técnico, componentes, fluxos | `docs/architecture/hld.md` |
| Por que cada tecnologia/arquitetura | `docs/architecture/adr/` (índice em `index.md`) |
| Diagramas C4 | `docs/architecture/diagrams/` |
| Spec, plano, contrato e avaliação de um RF | `docs/features/RF-NNN-nome/` (e `fundacao/`) |
| Ambiente, verificações, fluxo, commits, releases | `CONTRIBUTING.md` |

Fluxo por skill (em `.claude/skills/`): `/prd-writer` → `/hld-writer` → `/adr-writer` →
`/c4-writer` → `/spec-writer` → `/implement-feature` → `/evaluator` ⇄ `/fix-runner`;
`/implement-and-evaluate` roda o laço até o PR. Cada `SKILL.md` descreve as regras da sua área.

## Regras

- Branch `<tipo>/<descricao>` a partir de `main`; commits e título do PR em Conventional Commits,
  tipo e escopo em inglês e descrição em português (formato em `CONTRIBUTING.md`). `main` só
  recebe PR com squash.
- Não faça `git add`, `git commit` nem `git push` sem autorização explícita na conversa; ao
  terminar, deixe os arquivos no working tree e avise. A autorização vale só para aquele pedido.
- `make check` passa antes de cada commit e de abrir o PR. Verificação que falha se corrige, não
  se desativa.
- Decisão de arquitetura ou tecnologia cara de reverter vira ADR; regra de negócio vai para o PRD.
  ADR `accepted` é imutável: um novo o substitui, com `supersedes`/`superseded-by` nos dois lados.
- Documentação em português; código, tipos e escopos de commit em inglês. Scripts em POSIX `sh`.
  Texto em UTF-8 com LF.
- Não edite `CHANGELOG.md` nem `.release-please-manifest.json` (gerados pelo release-please).
- Actions em `.github/workflows/` fixadas por SHA completo com comentário da versão.
- Toda verificação nova é um `scripts/checks/check-*.sh` ligado ao `make check`.
