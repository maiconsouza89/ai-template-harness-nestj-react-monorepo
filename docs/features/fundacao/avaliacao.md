# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-29T13-49-35Z
- Branch: feat/fundacao
- Commit: 6b5e485
- Status: reprovado
- Itens: 44 passou, 1 falhou, 0 bloqueado, 0 manual, 0 pulado, de 45
- Critérios: 13 verificado, 1 reprovado, 0 indeterminado, de 14
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Monorepo: workspaces do pnpm 12 orquestrados pelo Turborepo, com apps/api, apps/web e packages/contracts, Node 26 e TypeScript 6 (ADR-0002, ADR-0012, ADR-0013, ADR-0020). | ✓ verificado | CLI-MONOREPO-01 |
| Scripts do contrato da stack: scripts/lint.sh, scripts/format.sh, scripts/test.sh e scripts/build.sh delegando ao Turborepo (ADR-0002). | ✓ verificado | CLI-STACK-01, CLI-STACK-02, CLI-STACK-03, CLI-STACK-04, CLI-STACK-05 |
| Ambiente local: Docker Compose com api, web, postgres, valkey e mailpit, com o código montado e hot reload (ADR-0006, ADR-0014, ADR-0016). | ✓ verificado | CLI-AMBIENTE-01, CLI-AMBIENTE-02, CLI-AMBIENTE-03, UI-RECARGA-01 |
| Configuração e segredos: .env.example versionado e validação das variáveis na subida da API, que falha se faltar alguma (HLD, Gestão de segredos). | ✓ verificado | CLI-CONFIG-01, CLI-CONFIG-02 |
| Banco: PostgreSQL 18 com Prisma 7 e a migração inicial com as tabelas do Better Auth e os campos do plugin admin (ADR-0007, ADR-0008, ADR-0010). | ✓ verificado | CLI-BANCO-01, CLI-BANCO-02 |
| Preparo do banco: alvo make db-setup que aplica as migrações e cria o primeiro admin a partir do .env, de forma idempotente (PRD, Decisão primeiro admin criado na instalação). | ✓ verificado | CLI-ADMIN-01, CLI-ADMIN-02, CLI-ADMIN-03 |
| Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010). | ✓ verificado | API-BORDA-01, API-BORDA-02, API-BORDA-03, API-BORDA-04, API-ADMIN-01, API-CORS-01, API-CORS-02 |
| Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade). | ✓ verificado | API-SAUDE-01, API-SAUDE-02, API-SAUDE-03 |
| Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018). | ✓ verificado | CLI-LOGS-01, CLI-LOGS-02, CLI-LOGS-03 |
| Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019). | ✓ verificado | CLI-OTEL-01, CLI-OTEL-02 |
| Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020). | ✓ verificado | API-DOCS-01, API-DOCS-02, API-DOCS-03 |
| SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012). | ✗ reprovado | CLI-MONOREPO-02, UI-INICIO-01 (falhou: o console do Chromium registra erro com o 401 de GET /api/v1/session no anônimo), UI-INICIO-02, UI-INICIO-03, UI-INICIO-04 |
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | ✓ verificado | CLI-IMAGEM-01, CLI-IMAGEM-02, CLI-IMAGEM-03 |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | ✓ verificado | CLI-CI-01, CLI-CI-02 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (termina com "ok: todas as verificações passaram"; lint e test replicados do cache do Turborepo)
- ✓ build: `make build`, código 0 (4 tarefas, `apps/api/dist/main.js` e `apps/web/dist/index.html` gerados)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com postgres up e valkey up
- ✓ SPA Web: http://localhost:5173, GET / respondeu 200
- ✓ PostgreSQL: serviço postgres do Compose, `pg_isready` aceitando conexões, versão 18.6
- ✓ Redis (serviço Valkey): serviço valkey do Compose, `valkey-cli ping` respondeu PONG, versão 9.1.3
- ✓ Mailpit: http://localhost:8025, GET /readyz respondeu 200

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (seed `apps/api/prisma/seed.ts`) no banco efêmero; conferido por consulta: e-mail admin@example.com, role admin, emailVerified t, banned f, uma linha em account com providerId credential e senha com hash (não igual ao texto)
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial`; conferido: uma linha em session com userId da conta e expiresAt no futuro; o cookie `better-auth.session_token` guardado na pasta temporária

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD com 12 caracteres, letras e números; NODE_ENV=development e OTEL_EXPORTER_OTLP_ENDPOINT ausente, conferidos dentro do container da api (o contrato pede development e endpoint ausente). DATABASE_URL apontada para o banco efêmero `eval_fundacao_2026_10_29t13_49_35z` no mesmo PostgreSQL do Compose (ver Avisos)
- ✓ Docker 28.5.1 com Compose v2.40.0, shellcheck 0.9.0, actionlint 1.7.12, gitleaks 8.30.1 e Python 3.13.14 instalados

### Dependências externas
- ✓ Coletor OTLP: simulado por um receptor HTTP em Node (`http.createServer`) em 0.0.0.0:4318 que aceita qualquer requisição e grava método, caminho, horário e tamanho; alcançado do host (POST /probe-host 200) e de dentro do container da api por http://host.docker.internal:4318 (POST /probe-container 200)

## Itens

### API HTTP

#### API-SAUDE-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo informa status ok | interpretado como: campo `status` igual a `ok` | observado `"status":"ok"` | passou
- `*` o corpo informa postgres up e valkey up | interpretado como: `checks.postgres` e `checks.valkey` iguais a `up` | observado `{"postgres":"up","valkey":"up"}` | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/health (sem cookie)
HTTP/1.1 200 OK
{"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

#### API-SAUDE-02 *
- Veredito: passou
- ✓ a resposta é 503 | esperado 503, observado 503
- `*` o corpo informa valkey down | interpretado como: `checks.valkey` igual a `down` | observado `down` | passou
- `*` o corpo informa postgres up | interpretado como: `checks.postgres` igual a `up` | observado `up` | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey  -> valkey exited
GET http://localhost:3000/api/health
HTTP/1.1 503 Service Unavailable
{"status":"error","checks":{"postgres":"up","valkey":"down"}}
docker compose up -d --wait valkey -> GET /api/health 200 de novo
```

</details>

#### API-SAUDE-03 *
- Veredito: passou
- ✓ a resposta é 503 | esperado 503, observado 503
- `*` o corpo informa postgres down | interpretado como: `checks.postgres` igual a `down` | observado `down` | passou

<details>
<summary>Evidência</summary>

```
docker compose stop postgres -> postgres exited
GET http://localhost:3000/api/health
HTTP/1.1 503 Service Unavailable
{"status":"error","checks":{"postgres":"down","valkey":"up"}}
docker compose up -d --wait postgres -> GET /api/health 200 na primeira tentativa
```

</details>

#### API-BORDA-01
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo é um objeto com ok igual a true | esperado `{"ok":true}`, observado `{"ok":true}`

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/auth/ok (sem cookie)
HTTP/1.1 200 OK
{"ok":true}
```

</details>

#### API-BORDA-02 *
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- `*` o corpo não traz id, papel nem e-mail de conta nenhuma | interpretado como: o corpo não contém o id de `admin-inicial`, a palavra admin nem um e-mail | observado `{"message":"Unauthorized","statusCode":401}` | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/v1/session (sem cookie)
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/v1/session
Cookie: better-auth.session_token=<valor inventado, sem assinatura válida>
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o userId da conta `admin-inicial` | esperado `4UbBpN3AxDM7DTjSCD59qfLA55alAd3h` (id da conta no banco), observado `4UbBpN3AxDM7DTjSCD59qfLA55alAd3h`
- ✓ o corpo traz role igual a admin | esperado `admin`, observado `admin`

<details>
<summary>Evidência</summary>

```
select id from "user" where email='admin@example.com' -> 4UbBpN3AxDM7DTjSCD59qfLA55alAd3h
GET http://localhost:3000/api/v1/session
Cookie: better-auth.session_token=<mascarado>
HTTP/1.1 200 OK
{"userId":"4UbBpN3AxDM7DTjSCD59qfLA55alAd3h","role":"admin"}
```

</details>

#### API-ADMIN-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta define o cookie de sessão com o atributo HttpOnly | interpretado como: cabeçalho `set-cookie` com `better-auth.session_token` e o atributo `HttpOnly` | observado `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax` | passou
- ✓ o corpo não contém a senha | esperado 0 ocorrências de ADMIN_PASSWORD no corpo, observado 0

<details>
<summary>Evidência</summary>

```
POST http://localhost:3000/api/auth/sign-in/email
Origin: http://localhost:5173
{"email":"admin@example.com","password":"<ADMIN_PASSWORD>"}
HTTP/1.1 200 OK
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
{"redirect":false,"token":"<mascarado>","user":{"name":"admin","email":"admin@example.com","emailVerified":true,...,"role":"admin","banned":false,"id":"4UbBpN3AxDM7DTjSCD59qfLA55alAd3h"}}
grep -c <ADMIN_PASSWORD> corpo -> 0
```

</details>

#### API-CORS-01
- Veredito: passou
- ✓ o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN | esperado `http://localhost:5173`, observado `http://localhost:5173`
- ✓ o cabeçalho Access-Control-Allow-Credentials é true | esperado `true`, observado `true`

<details>
<summary>Evidência</summary>

```
OPTIONS http://localhost:3000/api/v1/session
Origin: http://localhost:5173
Access-Control-Request-Method: GET
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

</details>

#### API-CORS-02
- Veredito: passou
- ✓ a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem | esperado nenhum `Access-Control-Allow-Origin` com `http://outra-origem.example`, observado 0 cabeçalhos `Access-Control-Allow-Origin`

<details>
<summary>Evidência</summary>

```
OPTIONS http://localhost:3000/api/v1/session
Origin: http://outra-origem.example
Access-Control-Request-Method: GET
HTTP/1.1 204 No Content
Vary: Origin, Access-Control-Request-Headers
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
(linhas access-control-allow-origin: 0)
```

</details>

#### API-DOCS-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é uma página HTML | interpretado como: `Content-Type: text/html` e corpo começando por `<!DOCTYPE html>` | observado `text/html; charset=utf-8` e `<!DOCTYPE html>` na segunda linha | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/docs (NODE_ENV=development no container)
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
(primeira linha: comentário HTML do Swagger UI, "HTML for static distribution bundle build")
<!DOCTYPE html>
<html lang="en">
```

</details>

#### API-DOCS-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o campo openapi do corpo começa com 3. | esperado prefixo `3.`, observado `3.0.0`
- ✓ os caminhos do documento incluem /api/v1/session | esperado presente, observado presente
- ✓ os caminhos do documento incluem /api/health | esperado presente, observado presente

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/docs-json
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
openapi: 3.0.0
paths: ['/api/health', '/api/v1/session']
```

</details>

#### API-DOCS-03
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404

<details>
<summary>Evidência</summary>

```
API em execução: container da imagem de produção (CLI-IMAGEM-02) com NODE_ENV=production, porta 3100 do host
docker exec ... sh -c 'echo NODE_ENV=$NODE_ENV' -> NODE_ENV=production
GET http://localhost:3100/api/docs-json
HTTP/1.1 404 Not Found
{"message":"Cannot GET /api/docs-json","error":"Not Found","statusCode":404}
GET http://localhost:3100/api/docs -> HTTP/1.1 404 Not Found
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- ✓ o packageManager da raiz fixa o pnpm na major 12 | esperado `pnpm@12.x`, observado `pnpm@12.16.1`
- ✓ o engines.node da raiz exige a major 26 | esperado `>=26`, observado `>=26.0.0`
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: `pnpm -r ls --depth -1` lista a raiz mais exatamente esses três | observado `app`, `@app/api` (apps/api), `@app/web` (apps/web), `@app/contracts` (packages/contracts) | passou
- ✓ o TypeScript instalado está na major 6 | esperado 6.x, observado 6.0.3
- ✓ o Turborepo instalado está na major 2 | esperado 2.x, observado 2.11.10

<details>
<summary>Evidência</summary>

```
pnpm install --frozen-lockfile -> "Lockfile is up to date", código 0
package.json: packageManager pnpm@12.16.1, engines.node >=26.0.0
pnpm -r ls --depth -1 --json -> app@0.0.0 ., @app/api@0.0.1 apps/api, @app/web@0.0.1 apps/web, @app/contracts@0.0.1 packages/contracts
node -p require('typescript/package.json').version -> 6.0.3
node -p require('turbo/package.json').version -> 2.11.10
```

</details>

#### CLI-MONOREPO-02
- Veredito: passou
- ✓ @app/api declara @app/contracts pelo protocolo workspace: | esperado `workspace:*`, observado `workspace:*`
- ✓ @app/web declara @app/contracts pelo protocolo workspace: | esperado `workspace:*`, observado `workspace:*`

<details>
<summary>Evidência</summary>

```
apps/api/package.json dependencies["@app/contracts"] -> workspace:*
apps/web/package.json dependencies["@app/contracts"] -> workspace:*
```

</details>

#### CLI-STACK-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída não contém o aviso de alvo não implementado | esperado 0 ocorrências de "não implementado", observado 0
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: uma linha `@app/<pacote>:lint: $ oxlint ...` para cada um dos três pacotes | observado as três, com "cache miss, executing" | passou

<details>
<summary>Evidência</summary>

```
rm -rf .turbo/cache (cache local do Turborepo, para o lint rodar de verdade; a primeira execução tinha vindo do cache)
make lint -> código 0
@app/web:lint: cache miss, executing e895a81dec0bd598
@app/contracts:lint: cache miss, executing c661d4992ac33b82
@app/api:lint: cache miss, executing bee2db342f10aad7
@app/web:lint: $ oxlint src/ && prettier --check .
@app/api:lint: $ oxlint src/ test/ && prettier --check .
@app/contracts:lint: $ oxlint src/ && prettier --check .
 Tasks:    3 successful, 3 total
```

</details>

#### CLI-STACK-02
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ nenhum arquivo versionado fica alterado | esperado `git diff` vazio, observado `git diff --quiet` com sucesso e `git status --short` igual antes e depois

<details>
<summary>Evidência</summary>

```
make format -> código 0; Tasks: 3 successful, 3 total; Cached: 0 cached
git status --short antes:  ?? docs/features/fundacao/orquestracao.md
git status --short depois: ?? docs/features/fundacao/orquestracao.md
git diff --quiet -> nenhum arquivo versionado alterado
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: `Test Files N passed` sob `@app/api:test`, `@app/web:test` e `@app/contracts:test` | observado 6, 1 e 2 arquivos passando | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: a migração do script aponta o banco `app_test` e os `*.int-spec.ts` de @app/api passam | observado `Datasource "db": PostgreSQL database "app_test"` e 3 int-spec passando | passou

<details>
<summary>Evidência</summary>

```
make test (sem cache do Turborepo) -> código 0
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
Applying migration `20261029000000_init` ... All migrations have been successfully applied.
@app/contracts:test: Test Files 2 passed (2)
@app/web:test:       Test Files 1 passed (1)
@app/api:test:       Test Files 6 passed (6)
@app/api:test: ✓ test/integration/sign-up.int-spec.ts (2 tests)
@app/api:test: ✓ test/integration/app.int-spec.ts (8 tests)
@app/api:test: ✓ test/integration/seed.int-spec.ts (3 tests)
@app/api:test:       Test Files 3 passed (3)
 Tasks: 5 successful, 5 total; Cached: 0 cached
```

</details>

#### CLI-STACK-04
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existe o arquivo main.js na pasta dist de apps/api | esperado existe, observado `apps/api/dist/main.js` 961 bytes
- ✓ existe o arquivo index.html na pasta dist de apps/web | esperado existe, observado `apps/web/dist/index.html` 453 bytes

<details>
<summary>Evidência</summary>

```
rm -rf apps/api/dist apps/web/dist packages/contracts/dist -> ls: cannot access 'apps/api/dist' / 'apps/web/dist'
make build -> código 0
@app/api:build: cache miss, executing baf67cfddac17d93
@app/web:build: cache miss, executing 9600eb9752927405
 Tasks: 4 successful, 4 total
-rw-r--r-- 961 apps/api/dist/main.js
-rw-r--r-- 453 apps/web/dist/index.html
```

</details>

#### CLI-STACK-05 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída informa que todas as tarefas vieram do cache local | interpretado como: `Cached: N cached, N total` com N igual ao total e `FULL TURBO` | observado `Cached: 4 cached, 4 total` e `>>> FULL TURBO` | passou

<details>
<summary>Evidência</summary>

```
make build (logo depois do anterior, sem alteração) -> código 0
@app/api:generate: cache hit, replaying logs e4f938210fc0b23f
@app/contracts:build: cache hit, replaying logs 6dfe6e412f747de0
@app/web:build: cache hit, replaying logs 9600eb9752927405
@app/api:build: cache hit, replaying logs baf67cfddac17d93
 Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
  Time:    17ms >>> FULL TURBO
```

</details>

#### CLI-AMBIENTE-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis | interpretado como: `docker compose ps` com os cinco em `Up (healthy)` | observado os cinco `Up ... (healthy)` | passou
- `*` o postgres informa versão na major 18 | interpretado como: `show server_version` começa com `18.` | observado `18.6` | passou
- `*` o valkey informa versão na major 9 | interpretado como: `valkey_version` em `INFO server` começa com `9.` | observado `9.1.3` | passou

<details>
<summary>Evidência</summary>

```
docker compose down -> código 0; docker compose ps -aq | wc -l -> 0
docker compose up -d --wait -> código 0 em 28s
api: Up 21 seconds (healthy)
mailpit: Up 27 seconds (healthy)
postgres: Up 27 seconds (healthy)
valkey: Up 27 seconds (healthy)
web: Up 27 seconds (healthy)
psql -Atc 'show server_version' -> 18.6 (Debian 18.6-1.pgdg13+2)
valkey-cli info server -> valkey_version:9.1.3
```

</details>

#### CLI-AMBIENTE-02
- Veredito: passou
- ✓ appendonly é yes | esperado `yes`, observado `yes`
- ✓ appendfsync é everysec | esperado `everysec`, observado `everysec`
- ✓ maxmemory-policy é noeviction | esperado `noeviction`, observado `noeviction`

<details>
<summary>Evidência</summary>

```
docker compose exec valkey valkey-cli config get appendonly        -> appendonly / yes
docker compose exec valkey valkey-cli config get appendfsync       -> appendfsync / everysec
docker compose exec valkey valkey-cli config get maxmemory-policy  -> maxmemory-policy / noeviction
```

</details>

#### CLI-AMBIENTE-03 *
- Veredito: passou
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: depois da edição, linhas `File change detected` e `Nest application successfully started` novas no log | observado as duas, 1 s depois da edição | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: o id de `app-dev-api:local` e o id da imagem do container são os mesmos antes e depois, e `docker events` não registra build de imagem | observado ids iguais (sha256:2c7b8984...) e 0 eventos | passou
- ✓ GET /api/health volta a responder 200 depois da nova subida | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
arquivo: apps/api/src/platform/health/health.module.ts (limpo no git); acrescentada uma linha de comentário às 14:02:49 UTC
log da api (linhas novas):
[2:02:49 PM] File change detected. Starting incremental compilation...
[2:02:49 PM] Found 0 errors. Watching for file changes.
{"level":30,...,"context":"NestFactory","msg":"Starting Nest application..."}
{"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
GET /api/health -> 200
imagem app-dev-api:local antes e depois: sha256:2c7b898435ffd433e2fb59ea04cbaa98578d0c5b948d60e4b7e2995419b37a89 (igual)
docker events --since 3m --filter type=image -> 0 eventos do projeto
git checkout -- apps/api/src/platform/health/health.module.ts -> 0 pendências; health 200 depois do revert
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia BETTER_AUTH_SECRET | esperado presente, observado `Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)`
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: nenhum valor das variáveis do `.env` aparece na saída | observado 0 valores presentes | passou

<details>
<summary>Evidência</summary>

```
.env sem a linha BETTER_AUTH_SECRET (grep -c -> 0); postgres, valkey, mailpit e web no ar
subida da api pelo serviço do Compose, em container efêmero do mesmo serviço, com o comando de produção
(o `nest start --watch` do serviço mantém o container vivo depois de a app sair):
docker compose run --rm --no-deps -T api sh -c 'cd apps/api && exec node --import ./dist/instrumentation.js dist/main.js'
saída: Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
código de saída: 1
valores de variáveis do .env presentes na saída: 0
.env restaurado (BETTER_AUTH_SECRET de volta)
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: cada chave obrigatória de `envSchema` (apps/api/src/platform/config/env.ts), de `webEnvSchema` (VITE_API_URL) e do seed (ADMIN_EMAIL, ADMIN_PASSWORD) está no arquivo | observado todas presentes | passou
- ✓ o `.env` é ignorado pelo git | esperado regra em `.gitignore`, observado `.gitignore:2:.env`
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: gitleaks sem achado e os valores sensíveis com texto de exemplo | observado `no leaks found`; BETTER_AUTH_SECRET=exemplo-local-troque-por-um-segredo-com-32-ou-mais-caracteres, ADMIN_PASSWORD=Trocar123, DATABASE_URL com app:app | passou

<details>
<summary>Evidência</summary>

```
.env.example: ADMIN_EMAIL ADMIN_PASSWORD BETTER_AUTH_SECRET BETTER_AUTH_URL COOKIE_DOMAIN DATABASE_URL LOG_LEVEL NODE_ENV OTEL_EXPORTER_OTLP_ENDPOINT REDIS_URL SMTP_FROM SMTP_HOST SMTP_PASSWORD SMTP_PORT SMTP_USER VITE_API_URL WATCH_POLLING WEB_ORIGIN
envSchema obrigatórias: NODE_ENV DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL WEB_ORIGIN SMTP_HOST SMTP_PORT SMTP_FROM (LOG_LEVEL com default)
webEnvSchema: VITE_API_URL; seed: ADMIN_EMAIL, ADMIN_PASSWORD
git check-ignore -v .env -> .gitignore:2:.env; .env.example versionado (git ls-files)
gitleaks detect --no-git --source .env.example -> no leaks found
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` existem as tabelas user, session, account e verification | interpretado como: as quatro em `pg_tables` do schema public | observado `_prisma_migrations account session user verification` | passou
- `*` a tabela user tem as colunas role, banned, banReason e banExpires | interpretado como: as quatro em `information_schema.columns` | observado `id name email emailVerified image createdAt updatedAt role banned banReason banExpires` | passou
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: uma linha em `_prisma_migrations` com `finished_at` preenchido | observado `20261029000000_init`, aplicada t, sem rollback | passou

<details>
<summary>Evidência</summary>

```
DROP DATABASE ... WITH (FORCE); CREATE DATABASE -> tabelas no banco: 0
make db-setup -> código 0
Applying migration `20261029000000_init` ... All migrations have been successfully applied.
seed: primeiro admin criado
pg_tables (public): _prisma_migrations account session user verification
colunas de user: id name email emailVerified image createdAt updatedAt role banned banReason banExpires
_prisma_migrations: 20261029000000_init | aplicada t | rolled_back_at vazio
```

</details>

#### CLI-BANCO-02
- Veredito: passou
- ✓ prisma está na major 7 | esperado 7.x, observado 7.10.1
- ✓ @prisma/client está na major 7 | esperado 7.x, observado 7.10.1
- ✓ @prisma/adapter-pg está instalado na major 7 | esperado 7.x, observado 7.10.1

<details>
<summary>Evidência</summary>

```
apps/api: node -p require('prisma/package.json').version -> 7.10.1
apps/api: node -p require('@prisma/client/package.json').version -> 7.10.1
apps/api: pnpm ls @prisma/adapter-pg --depth 0 -> @prisma/adapter-pg@7.10.1 (node_modules/@prisma/adapter-pg/package.json "version": "7.10.1")
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- ✓ existe exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- `*` essa conta tem papel admin e e-mail verificado | interpretado como: `role = 'admin'` e `emailVerified = true` | observado `admin`, `t` | passou
- `*` essa conta não está banida | interpretado como: `banned = false`, `banReason` e `banExpires` nulos | observado `f`, nulo, nulo | passou
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password <> ADMIN_PASSWORD` na credencial | observado `f` para a igualdade, hash de 161 caracteres | passou

<details>
<summary>Evidência</summary>

```
(mesma execução de make db-setup de CLI-BANCO-01, sobre o banco vazio)
select count(*) from "user" where email='admin@example.com' -> 1
select email, role, "emailVerified", banned, "banReason", "banExpires" from "user" -> admin@example.com|admin|t|f||
select password = '<ADMIN_PASSWORD>', left(password, 8), length(password) from account where "providerId"='credential' -> f|3d3e0687|161
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- `*` nenhuma migração nova é aplicada | interpretado como: saída `No pending migrations to apply` e contagem de `_prisma_migrations` igual a 1 | observado as duas coisas | passou

<details>
<summary>Evidência</summary>

```
make db-setup (com admin-inicial já existente) -> código 0
1 migration found in prisma/migrations
No pending migrations to apply.
seed: primeiro admin já existia; papel admin e e-mail verificado garantidos
select count(*) from "user" where email='admin@example.com' -> 1
select count(*) from _prisma_migrations -> 1
```

</details>

#### CLI-ADMIN-03
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- ✓ a saída nomeia ADMIN_EMAIL | esperado presente, observado `seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL`
- ✓ nenhuma conta existe no banco | esperado 0 linhas em user, observado 0

<details>
<summary>Evidência</summary>

```
DROP DATABASE ... WITH (FORCE); CREATE DATABASE; .env com ADMIN_EMAIL=
make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL
Error: Command failed with exit code 1: node prisma/seed.ts
select count(*) from "user" -> 0 (as migrações foram aplicadas antes do seed: 5 tabelas)
.env restaurado; make db-setup de novo -> "seed: primeiro admin criado"; nova sessao-admin criada por sign-in (200)
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- `*` a linha é um objeto JSON completo | interpretado como: `json.loads` da linha inteira sem erro | observado objeto com chaves hostname, level, msg, pid, req, res, responseTime, time | passou
- `*` a linha traz um requestId, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` presentes | observado `req.id` igual ao `x-request-id` da resposta, `res.statusCode` 200, `responseTime` 2 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | esperado ausente, observado ausente (`req.headers.cookie` igual a `[redigido]`)
- ✓ a linha não contém o valor do cabeçalho authorization | esperado ausente, observado ausente (`req.headers.authorization` igual a `[redigido]`)

<details>
<summary>Evidência</summary>

```
GET /api/health com Cookie: better-auth.session_token=COOKIE-SEGREDO-LOGS01-xyz e Authorization: Bearer AUTH-SEGREDO-LOGS01-xyz
x-request-id da resposta: 735d07ec-d7a0-450b-a438-808af8ae3d77
docker compose logs api | grep 735d07ec... -> 1 linha
chaves: ['hostname', 'level', 'msg', 'pid', 'req', 'res', 'responseTime', 'time']
req.id: 735d07ec-d7a0-450b-a438-808af8ae3d77 | res.statusCode: 200 | responseTime: 2
req.headers.cookie: [redigido] | authorization: [redigido]
contém COOKIE-SEGREDO-LOGS01: False | contém AUTH-SEGREDO-LOGS01: False
```

</details>

#### CLI-LOGS-02
- Veredito: passou
- ✓ os dois requestId são diferentes | esperado diferentes, observado `b620749a-6338-4c01-a2fc-beb2c167fc0a` e `79a19160-c122-4575-a281-8441f77e77ea`
- ✓ nenhum dos dois é um número inteiro | esperado nenhum inteiro, observado dois UUID

<details>
<summary>Evidência</summary>

```
duas requisições GET /api/health em sequência; x-request-id das respostas usados para achar as linhas
requestIds: ['b620749a-6338-4c01-a2fc-beb2c167fc0a', '79a19160-c122-4575-a281-8441f77e77ea']
diferentes: True; algum inteiro: False
```

</details>

#### CLI-LOGS-03
- Veredito: passou
- ✓ o e-mail da conta não aparece em nenhuma linha | esperado 0 linhas, observado 0 em 137
- ✓ a senha da conta não aparece em nenhuma linha | esperado 0 linhas, observado 0 em 137

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email com e-mail e senha de admin-inicial (200) antes da leitura
docker compose logs --no-log-prefix api -> 137 linhas desde a subida
grep -c 'admin@example.com' -> 0
grep -c '<ADMIN_PASSWORD>' -> 0
(nenhuma linha de acesso para /api/auth/*: só /api/health e /api/v1/session aparecem; ver Avisos)
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: nenhuma linha JSON com `level >= 40` e nenhuma linha mencionando otel, opentelemetry, otlp ou export além do comando de subida | observado 0 linhas warn/error e 0 menções | passou

<details>
<summary>Evidência</summary>

```
container da api: OTEL_EXPORTER_OTLP_ENDPOINT=ausente
10 x GET /api/health -> 200 200 200 200 200 200 200 200 200 200
docker compose logs api -> 147 linhas (36 de /api/health)
linhas JSON com level >= 40: 0
linhas com otel|opentelemetry|otlp|export: 1 ("$ nest start --watch --exec ./bin/node-with-otel.sh --no-shell", comando de subida)
(as linhas [WARN] Request took ... são do pnpm install da subida do container, não telemetria)
```

</details>

#### CLI-OTEL-02 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | interpretado como: linha nova no registro do receptor com caminho `/v1/traces` dentro de 30 s da requisição | observado POST /v1/traces (14484 bytes, application/x-protobuf) 5 s depois | passou
- ✓ a api continua respondendo 200 em GET /api/health | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
.env + OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318; docker compose up -d --wait api -> código 0
no container: OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318
GET /api/health -> 200
registro do receptor (linhas novas):
{"at":"2026-10-29T14:01:45.248Z","method":"POST","path":"/v1/logs","bytes":2417,"contentType":"application/x-protobuf"}
{"at":"2026-10-29T14:01:47.147Z","method":"POST","path":"/v1/logs","bytes":2115,"contentType":"application/x-protobuf"}
{"at":"2026-10-29T14:01:51.011Z","method":"POST","path":"/v1/traces","bytes":14484,"contentType":"application/x-protobuf"}
GET /api/health de novo -> 200
log da api: 4 avisos do SDK ("Export succeeded but could not deserialize response": o receptor responde {} em JSON a um envio protobuf)
.env restaurado; docker compose up -d --wait api -> OTEL ausente de novo; health 200
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a imagem final roda Node na major 26 | interpretado como: `node --version` na imagem começa com v26 | observado v26.13.0 | passou
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `*.ts` que não seja `*.d.ts` fora de node_modules e sem a pasta `apps/api/src` | observado 0 arquivos e `src` ausente (os 37 `.ts` restantes são declarações `.d.ts` em dist) | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhum diretório `@nestjs/cli` nem binário `nest` em `.bin` | observado 0 e 0 | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-29t13-49-35z . -> api build exit=0
docker run --rm --entrypoint node <imagem> --version -> v26.13.0
find /app -name "*.ts" -not -name "*.d.ts" -not -path "*/node_modules/*" | wc -l -> 0
test -d /app/apps/api/src -> nao
find /app -path "*/@nestjs/cli" | wc -l -> 0; find /app -name nest -path "*/.bin/*" | wc -l -> 0
ls /app/apps/api -> dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: passou
- `*` o container segue em execução | interpretado como: `docker inspect` com `State.Status` running e health healthy depois da subida | observado running, healthy | passou
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha JSON com `Nest application successfully started`, 0 linhas não JSON e 0 linhas com `level >= 40` | observado a linha, 0 e 0 | passou
- ✓ GET /api/health nesse container responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
docker run -d --network ai-template-harness-nestj-react-monorepo_default --env-file .env -e NODE_ENV=production -e PORT=3000 -p 3100:3000 eval-fundacao-api:...
health depois de 2s: 200 -> {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
log: {"level":30,...,"context":"NestFactory","msg":"Starting Nest application..."}
     {"level":30,...,"context":"AuthModule","msg":"AuthModule initialized BetterAuth on '/api/auth'"}
     {"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
linhas não-JSON: 0; linhas level>=40: 0
estado: running (health healthy)
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` falha e nenhum arquivo chamado `node` no sistema de arquivos | observado ausente e 0 arquivos | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: 200 text/html com corpo idêntico ao de `/`, contendo `<div id="root">` e o script de `/assets/` | observado 200, 453 bytes, idêntico (`cmp`), com `<div id="root"></div>` e `src="/assets/index-ltpmDyLm.js"` | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-29t13-49-35z . -> web build exit=0
imagem: 26186661 bytes
command -v node -> ausente; find / -xdev -type f -name node | wc -l -> 0
docker run -d -p 3180:80 <imagem>
GET / -> 200 text/html 453B
GET /uma-rota-qualquer -> 200 text/html 453B; cmp -> corpo idêntico ao de /
<!doctype html><html lang="pt-BR">...<div id="root"></div>...src="/assets/index-ltpmDyLm.js"
```

</details>

#### CLI-CI-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída termina com a linha de que todas as verificações passaram | interpretado como: última linha igual a `ok: todas as verificações passaram` | observado essa linha como última | passou
- ✓ a saída não contém o aviso de alvo não implementado | esperado 0 ocorrências, observado 0

<details>
<summary>Evidência</summary>

```
CI=true make check -> código 0
...
ok: validadores das skills: 34 casos
ok: 10 skills em .claude/skills no formato da doc oficial
ok: hooks do Claude Code: 6 casos
ok: todas as verificações passaram   (última linha)
grep -c 'não implementado' -> 0
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | interpretado como: `actions/setup-node` com `node-version: 26` numa linha anterior ao passo `run: make check` | observado linha 31 (setup-node, node-version 26 na 33) antes da 59 | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version` fixa (lê o `packageManager` do package.json) antes do passo `run: make check` | observado linha 28 antes da 59, sem `version` | passou
- ✓ toda action do arquivo está fixada por SHA completo com comentário da versão | esperado 0 `uses:` fora do padrão `@<40 hex> # vX`, observado 0 (e `make check-actions` ok)

<details>
<summary>Evidência</summary>

```
.github/workflows/ci.yml
21: uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
28: uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
31: uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
33:   node-version: 26
59: run: make check
uses sem SHA de 40 hex + comentário: nenhuma
scripts/checks/check-actions.sh -> ok: workflows válidos (actionlint); ok: actions fixadas por SHA
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: falhou
- Dono: contrato
- `*` a página mostra, em português do Brasil, que não há sessão aberta | interpretado como: texto visível em pt-BR dizendo que não há sessão | observado parágrafo "Nenhuma sessão aberta." | passou
- ✓ o elemento html tem lang igual a pt-BR | esperado `pt-BR`, observado `pt-BR`
- ✗ o console não registra erro | esperado 0 mensagens de nível error, observado 1: `Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session`
  - causa: o loader da rota raiz lê a sessão em GET /api/v1/session, que responde 401 ao anônimo (API-BORDA-02 e spec, linhas 74 e 229, que descarta ler por /api/auth/get-session); o Chromium registra todo fetch com 4xx como erro de console e o código da SPA não suprime isso. O bullet contradiz o desenho do spec e a ferramenta: ou o contrato muda o bullet, ou o spec muda a leitura da sessão no anônimo
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis no centro, screenshot sem corte | observado 0 imagens, main/h1/p dentro da janela e `elementFromPoint` no próprio elemento, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
playwright-cli open --browser chromium http://localhost:5173/ (headless); cookie-list -> No cookies found
snapshot:
- main: heading "App" [level=1]; paragraph: Nenhuma sessão aberta.
eval document.documentElement.lang -> "pt-BR"
console error:
[ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session:0
requests: 22. [GET] http://localhost:3000/api/v1/session => [401] Unauthorized
visual: imgs [] ; MAIN/H1/P inViewport true, hitSelfOrChild true
screenshot: /tmp/evaluator-fundacao-2026-10-29T13-49-35Z/ui-inicio-01.png (removido na derrubada)
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- `*` a página mostra que há sessão aberta com o papel admin | interpretado como: texto visível dizendo que há sessão e o papel `admin` | observado "Sessão aberta com o papel admin." | passou
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: nenhuma mensagem de console com CORS e a requisição à API com resposta recebida | observado 0 erros no console e GET /api/v1/session => 200 | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/strong dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
cookie-set better-auth.session_token <mascarado> --domain=localhost --path=/ --httpOnly --sameSite=Lax
goto http://localhost:5173/
snapshot:
- main: heading "App"; paragraph: text "Sessão aberta com o papel", strong "admin", text "."
console error -> Total messages: 3 (Errors: 0, Warnings: 0)
requests: 22. [GET] http://localhost:3000/api/v1/session => [200] OK
screenshot: /tmp/evaluator-fundacao-2026-10-29T13-49-35Z/ui-inicio-02.png (removido na derrubada)
```

</details>

#### UI-INICIO-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível em pt-BR dizendo que a página não existe | observado heading "Página não encontrada" e "O endereço que você abriu não existe neste aplicativo." | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/a dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
goto http://localhost:5173/nao-existe
snapshot:
- alert: heading "Página não encontrada" [level=1]; paragraph: O endereço que você abriu não existe neste aplicativo.; link "Voltar ao início" (/)
console error -> Errors: 0
screenshot: /tmp/evaluator-fundacao-2026-10-29T13-49-35Z/ui-inicio-03.png (removido na derrubada)
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que o servidor não respondeu | interpretado como: texto visível em pt-BR dizendo que o servidor não respondeu | observado heading "O servidor não respondeu" e "Não foi possível falar com a API. Tente de novo em alguns instantes." | passou
- `*` a página não fica em branco | interpretado como: `#root` com filhos e `body.innerText` não vazio | observado 1 filho e texto com título, detalhe e link | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/a dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api -> api exited; cookie-clear
goto http://localhost:5173/
snapshot:
- alert: heading "O servidor não respondeu" [level=1]; paragraph: Não foi possível falar com a API. Tente de novo em alguns instantes.; link "Voltar ao início" (/)
console: [ERROR] Failed to load resource: net::ERR_CONNECTION_REFUSED @ http://localhost:3000/api/v1/session (sem bullet sobre console neste item)
bodyText: "O servidor não respondeu\n\nNão foi possível falar com a API. Tente de novo em alguns instantes.\n\nVoltar ao início"; rootChildren: 1
screenshot: /tmp/evaluator-fundacao-2026-10-29T13-49-35Z/ui-inicio-04.png (removido na derrubada)
docker compose up -d --wait api -> api Up (healthy)
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: sem nenhum comando de recarga no navegador, o `h1` passa a mostrar o texto novo em até 30 s depois da edição no host | observado "App recarga 2026" na primeira leitura, 0 s depois da edição | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
arquivo: apps/web/src/routes/root/route.tsx (limpo no git); goto http://localhost:5173/; find "App" -> heading "App"
sed <h1>App</h1> -> <h1>App recarga 2026</h1> às 14:05:06 UTC
eval document.querySelector("h1").textContent -> "App recarga 2026" (depois de 0 s, sem reload)
console error: só o 401 de /api/v1/session da carga inicial (UI-INICIO-01)
screenshot: /tmp/evaluator-fundacao-2026-10-29T13-49-35Z/ui-recarga-01.png (removido na derrubada)
git checkout -- apps/web/src/routes/root/route.tsx -> 0 pendências; h1 volta a "App" 3 s depois
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json` (`pnpm install --frozen-lockfile`), Node 26 e pnpm 12 pelos shims do mise |
| Ambiente efêmero e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose up -d --wait`, com `.env` copiado de `.env.example` |
| Banco efêmero e migração | 1 e 5 | contrato (Compose) e `scripts/db-setup.sh`: banco `eval_fundacao_...` criado no postgres do Compose e apontado por `DATABASE_URL` no `.env`; `make db-setup` migra |
| Estado persistido | 3 | spec da fundação, Convenções: `admin-inicial` pelo seed `apps/api/prisma/seed.ts` (via `make db-setup`); `sessao-admin` por POST /api/auth/sign-in/email |
| Limpeza entre itens | 5 | `DROP DATABASE ... WITH (FORCE)` e `CREATE DATABASE` no postgres do Compose; `.env` restaurado de cópia |
| Cliente HTTP | 6 | `curl` do host contra as portas publicadas |
| Logs da api | 5 | `docker compose logs --no-log-prefix api` |
| Navegador | 3 | spec, Verificação por superfície: `@playwright/cli` (ADR-0024), `pnpm dlx @playwright/cli@0.1.22 open --browser chromium`, headless |
| Receptor OTLP | 1 | contrato, Dependências externas: `node` com `http.createServer` em 0.0.0.0:4318, alcançado por `host.docker.internal` (`extra_hosts` do compose.yaml) |
| Imagens de produção | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` com `docker build` a partir da raiz, tag com o marcador da avaliação |
| API em produção (API-DOCS-03) | 6 | container da imagem da API na rede do Compose com `NODE_ENV=production` |
| Subida da api sem variável (CLI-CONFIG-01) | 6 | `docker compose run --rm --no-deps api` com o comando de produção, porque o `nest start --watch` do serviço mantém o container vivo |

## Limpeza e ambiente

- Sobras removidas: Nenhuma.
- Derrubada: completa (receptor OTLP PID 56909 morto; banco `eval_fundacao_2026_10_29t13_49_35z` apagado; imagens `eval-fundacao-api` e `eval-fundacao-web` removidas; `.env` criado pela avaliação removido; serviços api, web e mailpit parados; pasta temporária apagada)

## Avisos

- Avaliado com 1 arquivo fora de commit: `docs/features/fundacao/orquestracao.md` (não rastreado).
- UI-INICIO-01: o diário da orquestração já registrava a divergência entre "o console não registra erro" e o 401 de GET /api/v1/session no anônimo; a pessoa escolheu seguir com o 401. O item sai com dono `contrato` para a `/spec-writer` decidir entre mudar o bullet ou o desenho da leitura da sessão.
- `DATABASE_URL` do `.env` apontou para o banco efêmero com o marcador da skill, no mesmo PostgreSQL do Compose, para os itens com "banco vazio" não tocarem o banco `app` de desenvolvimento; é a única alteração além de ADMIN_EMAIL e ADMIN_PASSWORD, e o Dado comum de "Ambiente local" pede o `.env` sem outra alteração.
- Gate `check`: lint e test vieram do cache local do Turborepo (`FULL TURBO`, replay dos logs). Para CLI-STACK-01, 03 e 04 o cache (`.turbo/cache`) foi apagado e as tarefas rodaram de verdade.
- As requisições a `/api/auth/*` (sign-in, `/api/auth/ok`) não aparecem no log de acesso do pino: só `/api/health` e `/api/v1/session` foram logadas. CLI-LOGS-03 passa por isso, mas o log não cobre a borda de autenticação.
- CLI-OTEL-02: o SDK registrou 4 avisos "Export succeeded but could not deserialize response", causados pelo receptor simulado responder `{}` em JSON a um envio protobuf; a exportação chegou.
- CLI-ADMIN-03: as migrações são aplicadas antes de o seed recusar ADMIN_EMAIL vazio (5 tabelas criadas, 0 contas); o contrato só exige nenhuma conta.
- CLI-IMAGEM-01: a imagem saiu do cache do BuildKit (camadas idênticas a um build anterior desta máquina); o build terminou com código 0 da mesma forma.
- Os serviços postgres e valkey do Compose já estavam no ar antes da avaliação (sem o marcador da skill); CLI-AMBIENTE-01 os derrubou e recriou pelo `docker compose down` e `up`, com os volumes preservados. Ficaram no ar ao fim, como estavam. Os volumes nomeados de node_modules dos serviços api e web, criados na primeira subida, foram mantidos.
- UI-RECARGA-01: o marcador em `window` para distinguir HMR de recarga completa não pôde ser gravado (o `eval` do CLI não aceita atribuição); o bullet pede só que o texto novo apareça sem recarga manual, o que foi observado.
- `validate.py`: aviso de que `spec.md` cita o componente 'API NestJS', que não está na tabela de componentes do HLD.

## Motivo do aborto

Nenhum.
