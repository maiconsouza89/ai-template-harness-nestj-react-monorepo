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

4. Substitua este README pelo do seu projeto. A stack já vem decidida nos ADRs de
   `docs/architecture/adr/` e implementada em `scripts/lint.sh`, `format.sh`, `test.sh` e
   `build.sh`; para trocá-la, registre a decisão com a skill `/adr-writer` e reescreva os
   scripts.
5. Leia o [guia de contribuição](CONTRIBUTING.md). Agentes de código começam por
   [`CLAUDE.md`](CLAUDE.md).

## Ambiente local

Docker com Compose v2 é o único pré-requisito para rodar o aplicativo: API, SPA, PostgreSQL 18,
Valkey 9 e Mailpit sobem em containers, com o código montado e hot reload (ADR-0006). Node 26 e
pnpm 12 só são necessários no host para `make lint`, `make test` e `make build`; `make test`
também usa o Docker, para subir o PostgreSQL e o Valkey do Compose e recriar o banco `app_test`
dos testes de integração.

```sh
make setup                   # uma vez após o clone: ativa os hooks
cp .env.example .env         # ajuste ADMIN_EMAIL e ADMIN_PASSWORD se quiser
docker compose up -d --wait  # sobe os cinco serviços e espera os health checks
make db-setup                # aplica as migrações e cria o primeiro admin do .env
```

| Serviço | URL |
| --- | --- |
| SPA | <http://localhost:5173> |
| API | <http://localhost:3000/api> (saúde em [`/api/health`](http://localhost:3000/api/health)) |
| Documento OpenAPI | <http://localhost:3000/api/docs> (só fora de produção) |
| Mailpit | <http://localhost:8025> (SMTP em `localhost:1025`) |

A primeira subida instala as dependências dentro dos containers, o que leva alguns minutos;
elas ficam em volumes nomeados, então dependência nova pede só `docker compose restart api web`.
Editar um arquivo em `apps/api` ou `apps/web` recompila sem reconstruir imagem; se a mudança não
chegar ao container (repositório em `/mnt/c` no WSL2), ponha `WATCH_POLLING=true` no `.env`. A
API valida as variáveis na subida e termina nomeando a que faltar (`docker compose logs api`).
Para zerar o ambiente, inclusive o banco: `docker compose down -v`.

Os e-mails do aplicativo, como a confirmação do cadastro, entram na fila `email.send` do Valkey
e um worker no próprio processo da API os entrega por SMTP. No local o destino é o Mailpit: abra
<http://localhost:8025> para ler a mensagem e o link de confirmação, que aponta para
`/confirmar-email` na SPA e vale 24 horas. Se o SMTP falhar, o worker tenta de novo até 5 vezes,
com espera exponencial a partir de 5 segundos; a tela de link enviado tem o botão "Reenviar o
link" para quando a mensagem não chegar. Os testes de integração usam a mesma caixa, com
endereços únicos que apagam no fim, e o banco 1 do Valkey, para o worker da API do Compose não
pegar os jobs deles. Fora do local, aponte `SMTP_HOST`, `SMTP_PORT` e `SMTP_FROM` para o
servidor real e preencha `SMTP_USER` e `SMTP_PASSWORD`: com credencial, a porta 465 usa TLS
direto e as demais exigem STARTTLS, e o envio é recusado se o servidor não o oferecer, em vez de
mandar a senha em claro. O cadastro tem limite de 5 por minuto por IP; atrás de proxy ou
balanceador, preencha `TRUSTED_PROXIES` (ver `.env.example`).

Os logs da API saem em JSON, uma linha por entrada, com um `req.id` único por requisição
(devolvido no cabeçalho `x-request-id`) e e-mail, nome, senha, cookie e authorization redigidos;
a URL sai sem a query string, onde vão os tokens. As linhas do Better Auth passam pelo mesmo
logger, a partir do nível `warn` e com os erros reduzidos ao nome e ao código, e as do worker de
e-mail citam só os ids do job e da conta. `LOG_LEVEL` no `.env` muda o nível. Traces e métricas do OpenTelemetry só são exportados com
`OTEL_EXPORTER_OTLP_ENDPOINT` definido (do Compose, um coletor no host fica em
`http://host.docker.internal:4318`); sem a variável a instrumentação não faz nada.

## Imagens de produção

Cada app sai como imagem Docker multi-stage (ADR-0005), construída a partir da raiz do monorepo
porque o `turbo prune` precisa do workspace inteiro. A imagem da API leva só o `dist` e as
dependências de produção sobre Node 26, e sobe com `node --import ./dist/instrumentation.js
dist/main.js`; a da SPA serve os estáticos do `vite build` pelo nginx em Alpine, com fallback
para o `index.html`, sem Node.

```sh
docker build -f apps/api/Dockerfile -t app-api .
docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.exemplo.com -t app-web .
```

A API lê a configuração do ambiente na subida (as mesmas variáveis do `.env.example`, com
`NODE_ENV=production`) e termina nomeando a que faltar; as migrações não rodam na imagem, e sim
por `make db-setup`. A SPA fixa `VITE_API_URL` no bundle em tempo de build (ADR-0004), por isso
o argumento; sem ele, aponta para `http://localhost:3000`. Para experimentar no local, com o
`postgres` e o `valkey` do Compose no ar:

```sh
docker run --rm -p 3000:3000 --network "$(basename "$PWD")_default" --env-file .env -e NODE_ENV=production app-api
docker run --rm -p 8080:80 app-web   # http://localhost:8080
```

## O que está incluído

Instruções para agentes (`CLAUDE.md`), `Makefile` com `make check`, hook de commit, CI agnóstica
de stack, release automática e skills para ADR, PRD, HLD, diagramas C4 e specs por requisito. Onde fica cada coisa
está em [`CLAUDE.md`](CLAUDE.md); como trabalhar, em [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licença

[MIT](LICENSE).
