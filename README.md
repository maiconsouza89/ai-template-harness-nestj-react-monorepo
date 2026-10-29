# ai-template-harness

[![CI](https://github.com/maiconsouza89/ai-template-harness/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/maiconsouza89/ai-template-harness/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/maiconsouza89/ai-template-harness)](https://github.com/maiconsouza89/ai-template-harness/releases)
[![License: MIT](https://img.shields.io/github/license/maiconsouza89/ai-template-harness)](LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/pt-br/v1.0.0/)
[![Use this template](https://img.shields.io/badge/Use%20this-template-2ea44f?logo=github)](https://github.com/maiconsouza89/ai-template-harness/generate)

Template de repositório para desenvolvimento assistido por IA, construído em torno de
*harness engineering* ([OpenAI](https://openai.com/index/harness-engineering),
[Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
[Adobe](https://opensource.adobe.com/ai-repo-harness-guide/)): convenções viram arquivos versionados e, sempre que possível,
verificação automática. O que não está no repositório não existe para o agente.

## Como usar

1. No GitHub, clique em **Use this template** e crie o seu repositório.
2. Clone e prepare o ambiente: [`CONTRIBUTING.md`](CONTRIBUTING.md#ambiente) (`make setup`,
   `make check`).

3. Aplique o que "Use this template" não copia e zere o que ele copia demais:

   ```sh
   sh scripts/templates/bootstrap-github.sh   # PRs só por squash, auto-merge, ruleset de main com os checks
   sh scripts/templates/reset-template.sh     # remove o CHANGELOG do template e zera a versão
   ```

   O bootstrap aplica os itens 1, 2 e 4 abaixo via `gh`; o 3 é manual (o script avisa); o 5 só
   vale para o template.

   1. **Pull requests**: só *squash merging*, título e corpo do PR como mensagem, *Allow
      auto-merge*, *Automatically delete head branches*.
   2. **Actions**: *Allow GitHub Actions to create and approve pull requests* (fallback sem token).
   3. **Secret `RELEASE_PLEASE_TOKEN`**: token pessoal fine-grained com *Contents* e *Pull
      requests* em leitura e escrita, para a CI rodar no PR de release.
   4. **Ruleset `main`** (Active): *Restrict deletions*, *Block force pushes*, *Require a pull
      request before merging*, *Require status checks* `check` e `pr-title`.
   5. **Template repository**: marcar em General, só no repositório do template.

4. Substitua este README pelo do seu projeto, implemente `scripts/lint.sh`, `format.sh`,
   `test.sh` e `build.sh` para a sua stack e registre a escolha em um ADR
   com a skill `/adr-writer`.
5. Leia o [guia de contribuição](CONTRIBUTING.md). Agentes de código começam por
   [`CLAUDE.md`](CLAUDE.md).

## O que está incluído

Instruções para agentes (`CLAUDE.md`), `Makefile` com `make check`, hook de commit, CI agnóstica
de stack, release automática e skills para ADR, PRD, HLD, diagramas C4 e specs por requisito. Onde fica cada coisa
está em [`CLAUDE.md`](CLAUDE.md); como trabalhar, em [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licença

[MIT](LICENSE).
