# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-29T15-29-18Z
- Branch: feat/fundacao
- Commit: 011fc61
- Status: limpo
- Itens: 49 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 49
- Critérios: 14 verificado, 0 reprovado, 0 indeterminado, de 14
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Monorepo: workspaces do pnpm 12 orquestrados pelo Turborepo, com apps/api, apps/web e packages/contracts, Node 26 e TypeScript 6 (ADR-0002, ADR-0012, ADR-0013, ADR-0020). | ✓ verificado | CLI-MONOREPO-01 |
| Scripts do contrato da stack: scripts/lint.sh, scripts/format.sh, scripts/test.sh e scripts/build.sh delegando ao Turborepo (ADR-0002). | ✓ verificado | CLI-STACK-01, CLI-STACK-02, CLI-STACK-03, CLI-STACK-04, CLI-STACK-05 |
| Ambiente local: Docker Compose com api, web, postgres, valkey e mailpit, com o código montado e hot reload (ADR-0006, ADR-0014, ADR-0016). | ✓ verificado | CLI-AMBIENTE-01, CLI-AMBIENTE-02, CLI-AMBIENTE-03, UI-RECARGA-01 |
| Configuração e segredos: .env.example versionado e validação das variáveis na subida da API, que falha se faltar alguma (HLD, Gestão de segredos). | ✓ verificado | CLI-CONFIG-01, CLI-CONFIG-02 |
| Banco: PostgreSQL 18 com Prisma 7 e a migração inicial com as tabelas do Better Auth e os campos do plugin admin (ADR-0007, ADR-0008, ADR-0010). | ✓ verificado | CLI-BANCO-01, CLI-BANCO-02 |
| Preparo do banco: alvo make db-setup que aplica as migrações e cria o primeiro admin a partir do .env, de forma idempotente (PRD, Decisão primeiro admin criado na instalação). | ✓ verificado | CLI-ADMIN-01, CLI-ADMIN-02, CLI-ADMIN-03, CLI-ADMIN-04 |
| Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010). | ✓ verificado | API-BORDA-01, API-BORDA-02, API-BORDA-03, API-BORDA-04, API-BORDA-05, API-ADMIN-01, API-CORS-01, API-CORS-02 |
| Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade). | ✓ verificado | API-SAUDE-01, API-SAUDE-02, API-SAUDE-03 |
| Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018). | ✓ verificado | CLI-LOGS-01, CLI-LOGS-02, CLI-LOGS-03, CLI-LOGS-04 |
| Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019). | ✓ verificado | CLI-OTEL-01, CLI-OTEL-02, CLI-OTEL-03 |
| Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020). | ✓ verificado | API-DOCS-01, API-DOCS-02, API-DOCS-03 |
| SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012). | ✓ verificado | CLI-MONOREPO-02, UI-INICIO-01, UI-INICIO-02, UI-INICIO-03, UI-INICIO-04 |
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | ✓ verificado | CLI-IMAGEM-01, CLI-IMAGEM-02, CLI-IMAGEM-03 |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | ✓ verificado | CLI-CI-01, CLI-CI-02 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (16 verificações `ok`, lint e test do Turborepo com 3 e 5 tarefas vindas do cache local; a última linha é `ok: todas as verificações passaram`)
- ✓ build: `make build`, código 0 (4 tarefas, `FULL TURBO` do cache local; `apps/api/dist/main.js`, `apps/web/dist/index.html` e `packages/contracts/dist/index.js` presentes)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`; `docker compose down` seguido de `docker compose up -d --wait` saiu com código 0 em 33 s com api, web, postgres, valkey e mailpit `Up (healthy)`
- ✓ SPA Web: http://localhost:5173, GET / respondeu 200
- ✓ PostgreSQL: serviço postgres do Compose, `pg_isready -U app -d app` aceitando conexões, `show server_version` 18.6
- ✓ Redis (serviço Valkey): serviço valkey do Compose, `valkey-cli ping` respondeu PONG, valkey_version 9.1.3
- ✓ Mailpit: http://localhost:8025, GET /readyz respondeu 200

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (código 0, migração `20261029000000_init` aplicada, saída `seed: primeiro admin criado`) no banco efêmero `eval_fundacao_2026_10_29t15_29_18z`; conferido por consulta: 1 linha em user com e-mail admin@example.com, role admin, emailVerified t, banned f, banReason e banExpires nulos; 1 linha em account com providerId credential e senha com hash de 161 caracteres, diferente do texto de ADMIN_PASSWORD e sem contê-lo. Recriado pelo mesmo `make db-setup` depois dos itens de banco, que recriam o banco efêmero
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial` (200, `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`); conferido: 1 linha em session com o userId da conta e expiresAt em 2026-11-05, no futuro, e GET /api/v1/session com o cookie respondendo 200; cookie guardado na pasta temporária. Recriada por um novo sign-in depois dos itens de banco e conferida de novo com GET /api/v1/session 200 antes de UI-INICIO-02
- ✓ `conta-comum-com-email-do-admin`: mecanismo conferido no pré-voo num banco irmão com o marcador da skill (`eval_fundacao_2026_10_29t15_29_18z_pre`, migrado por `prisma migrate deploy` no container da api): hash da senha pela função `hashPassword` de `better-auth/crypto` dentro do container da api (em `/app/apps/api`) e INSERT em user e account por SQL no postgres do Compose, como a factory `contaComumComEmailDoAdmin` de `apps/api/test/factories/user.factory.ts` faz; conferido: 1 conta com e-mail admin@example.com, role nula, emailVerified f, banned f, 1 credencial com hash de 161 caracteres que `verifyPassword` aceita com a senha comum e recusa com ADMIN_PASSWORD. Recriado no banco efêmero recém-migrado antes de CLI-ADMIN-04, porque o e-mail é único e colide com `admin-inicial`

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD com 14 caracteres, letras e números; NODE_ENV=development e OTEL_EXPORTER_OTLP_ENDPOINT ausente, conferidos dentro do container da api (o contrato pede development e endpoint ausente). DATABASE_URL apontada para o banco efêmero `eval_fundacao_2026_10_29t15_29_18z` no mesmo PostgreSQL do Compose (ver Avisos). Cópia base guardada na pasta temporária e restaurada depois de cada item que o altera (CLI-CONFIG-01, CLI-ADMIN-03, CLI-OTEL-02, CLI-OTEL-03)
- ✓ OTEL_EXPORTER_OTLP_PROTOCOL: ausente no container da api (o contrato só o pede em CLI-OTEL-03, onde foi definido como http/json pelo `.env` e conferido no container)
- ✓ Docker 28.5.1 com Compose v2.40.0, shellcheck 0.9.0, actionlint 1.7.12, gitleaks 8.30.1 e Python 3.13.14 instalados; Node 26.13.0 e pnpm 12.16.1 pelos shims do mise

### Dependências externas
- ✓ Coletor OTLP: simulado por um receptor HTTP em Node (`http.createServer`) em 0.0.0.0:4318 que aceita qualquer requisição, responde 200 `{}` e grava método, caminho, horário, tamanho, content-type e corpo em JSON por linha; alcançado do host (POST /probe-host 200) e de dentro do container da api por http://host.docker.internal:4318 (POST /probe-container 200), as duas registradas

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
docker compose stop valkey -> valkey Exited (0)
GET http://localhost:3000/api/health
HTTP/1.1 503 Service Unavailable
{"status":"error","checks":{"postgres":"up","valkey":"down"}}
docker compose up -d --wait valkey -> Healthy; GET /api/health -> 200 {"status":"ok",...}
```

</details>

#### API-SAUDE-03 *
- Veredito: passou
- ✓ a resposta é 503 | esperado 503, observado 503
- `*` o corpo informa postgres down | interpretado como: `checks.postgres` igual a `down` | observado `down` | passou

<details>
<summary>Evidência</summary>

```
docker compose stop postgres -> postgres Exited (0)
GET http://localhost:3000/api/health
HTTP/1.1 503 Service Unavailable
{"status":"error","checks":{"postgres":"down","valkey":"up"}}
docker compose up -d --wait postgres -> Healthy; GET /api/health -> 200 {"status":"ok",...}
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
- `*` o corpo não traz id, papel nem e-mail de conta nenhuma | interpretado como: o corpo não contém o id de `admin-inicial`, a palavra admin nem um `@` | observado `{"message":"Unauthorized","statusCode":401}`, 0 ocorrências de cada | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/v1/session (sem cookie)
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
contém o id da conta (4fTtxnJz1EVDq3CaItURwsk7G6dgfwNa): 0; contém "admin": 0; contém "@": 0
```

</details>

#### API-BORDA-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/v1/session
Cookie: better-auth.session_token=valor-inventado-sem-assinatura.abcdef
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o userId da conta `admin-inicial` | esperado `4fTtxnJz1EVDq3CaItURwsk7G6dgfwNa` (id da conta no banco), observado `4fTtxnJz1EVDq3CaItURwsk7G6dgfwNa`
- ✓ o corpo traz role igual a admin | esperado `admin`, observado `admin`

<details>
<summary>Evidência</summary>

```
select id from "user" where email='admin@example.com' -> 4fTtxnJz1EVDq3CaItURwsk7G6dgfwNa
GET http://localhost:3000/api/v1/session
Cookie: better-auth.session_token=<mascarado>
HTTP/1.1 200 OK
{"userId":"4fTtxnJz1EVDq3CaItURwsk7G6dgfwNa","role":"admin"}
```

</details>

#### API-BORDA-05 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código EMAIL_PASSWORD_SIGN_UP_DISABLED | interpretado como: campo `code` igual a `EMAIL_PASSWORD_SIGN_UP_DISABLED` | observado `"code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"` | passou
- ✓ nenhuma conta com esse e-mail passa a existir no banco | esperado 0 linhas em user com email novo@example.com, observado 0 (0 antes e 0 depois)

<details>
<summary>Evidência</summary>

```
select count(*) from "user" where email='novo@example.com' -> 0 (antes)
POST http://localhost:3000/api/auth/sign-up/email  Origin: http://localhost:5173
{"email":"novo@example.com","name":"Novo","password":"SenhaValida123"}
HTTP/1.1 400 Bad Request
{"message":"Email and password sign up is not enabled","code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}
select count(*) from "user" where email='novo@example.com' -> 0 (depois)
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
POST http://localhost:3000/api/auth/sign-in/email  Origin: http://localhost:5173
{"email":"admin@example.com","password":"<ADMIN_PASSWORD>"}
HTTP/1.1 200 OK
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
{"redirect":false,"token":"<mascarado>","user":{"name":"admin","email":"admin@example.com","emailVerified":true,"image":null,"createdAt":"2026-10-29T15:30:57.805Z",...}}
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
Vary: Origin, Access-Control-Request-Headers
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
- `*` o corpo é uma página HTML | interpretado como: `Content-Type: text/html` e `<!DOCTYPE html>` no corpo | observado `text/html; charset=utf-8` e `<!DOCTYPE html>` logo depois do comentário do Swagger UI | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/docs (NODE_ENV=development no container)
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
(primeira linha: comentário HTML do Swagger UI, "HTML for static distribution bundle build")
<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <title>Swagger UI</title> ...
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
GET http://localhost:3100/api/docs -> 404
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- ✓ o packageManager da raiz fixa o pnpm na major 12 | esperado `pnpm@12.x`, observado `pnpm@12.16.1`
- ✓ o engines.node da raiz exige a major 26 | esperado `>=26`, observado `>=26.0.0`
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: `pnpm -r ls --depth -1 --json` lista a raiz mais exatamente esses três | observado `app` (.), `@app/api` (apps/api), `@app/web` (apps/web), `@app/contracts` (packages/contracts) | passou
- ✓ o TypeScript instalado está na major 6 | esperado 6.x, observado 6.0.3
- ✓ o Turborepo instalado está na major 2 | esperado 2.x, observado 2.11.10

<details>
<summary>Evidência</summary>

```
pnpm install --frozen-lockfile -> "Lockfile is up to date", código 0
package.json: packageManager=pnpm@12.16.1 engines.node=>=26.0.0
pnpm -r ls --depth -1 --json -> app ., @app/api /apps/api, @app/web /apps/web, @app/contracts /packages/contracts
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
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: uma linha `@app/<pacote>:lint: $ oxlint ...` para cada um dos três pacotes, sem vir do cache | observado as três, com `cache miss, executing` | passou

<details>
<summary>Evidência</summary>

```
rm -rf .turbo/cache (cache local do Turborepo, para o lint rodar de verdade; os gates tinham vindo do cache)
make lint -> código 0
@app/web:lint: cache miss, executing e895a81dec0bd598
@app/api:lint: cache miss, executing 426df60f61186905
@app/contracts:lint: cache miss, executing c661d4992ac33b82
@app/web:lint: $ oxlint src/ && prettier --check .
@app/contracts:lint: $ oxlint src/ && prettier --check .
@app/api:lint: $ oxlint src/ test/ && prettier --check .
 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
```

</details>

#### CLI-STACK-02
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ nenhum arquivo versionado fica alterado | esperado `git status --short` igual antes e depois e `git diff` vazio fora dos dois arquivos de docs já modificados antes da avaliação, observado status igual, 0 arquivos no diff fora de `docs/features/fundacao` e mtime dos dois arquivos anterior ao `make format`

<details>
<summary>Evidência</summary>

```
make format -> código 0; Tasks: 3 successful, 3 total; Cached: 0 cached
git status --short antes:   M docs/features/fundacao/avaliacao.md  M docs/features/fundacao/orquestracao.md
git status --short depois:  M docs/features/fundacao/avaliacao.md  M docs/features/fundacao/orquestracao.md
git diff --name-only -- . ':!docs/features/fundacao' -> 0 arquivos
mtime de avaliacao.md 12:21:41 e orquestracao.md 12:28:16 (-03:00), iguais antes e depois; make format rodou às 12:34:05
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: `Test Files N passed` sob `@app/api:test`, `@app/web:test` e `@app/contracts:test` | observado 6, 1 e 2 arquivos passando | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: a migração do script aponta o banco `app_test` e os `*.int-spec.ts` de @app/api passam | observado `Datasource "db": PostgreSQL database "app_test"` e 3 int-spec passando (15 testes) | passou

<details>
<summary>Evidência</summary>

```
make test (sem cache do Turborepo) -> código 0
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
Applying migration `20261029000000_init`
@app/contracts:test: Test Files 2 passed (2)
@app/web:test:       Test Files 1 passed (1)
@app/api:test:       Test Files 6 passed (6)
@app/api:test: ✓ test/integration/sign-up.int-spec.ts (2 tests)
@app/api:test: ✓ test/integration/app.int-spec.ts (8 tests)
@app/api:test: ✓ test/integration/seed.int-spec.ts (5 tests)
@app/api:test:       Test Files 3 passed (3)
 Tasks: 5 successful, 5 total; Cached: 0 cached, 5 total
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
@app/api:generate: cache hit, replaying logs (gerado pelo make test anterior)
@app/contracts:build: cache hit, replaying logs (dist restaurado do cache do Turborepo)
@app/api:build: cache miss, executing f123057350e0c007
@app/web:build: cache miss, executing 9600eb9752927405
 Tasks: 4 successful, 4 total; Cached: 2 cached, 4 total
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
@app/contracts:build: cache hit, replaying logs 6dfe6e412f747de0
@app/web:build: cache hit, replaying logs 9600eb9752927405
@app/api:generate: cache hit, replaying logs e4f938210fc0b23f
@app/api:build: cache hit, replaying logs f123057350e0c007
 Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
  Time:    21ms >>> FULL TURBO
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
.env igual à cópia base (só ADMIN_EMAIL, ADMIN_PASSWORD e DATABASE_URL diferem do .env.example; ver Avisos)
docker compose down -> código 0; docker compose ps -aq | wc -l -> 0
docker compose up -d --wait -> código 0 em 33s
api      Up 26 seconds (healthy)
mailpit  Up 31 seconds (healthy)
postgres Up 31 seconds (healthy)
valkey   Up 31 seconds (healthy)
web      Up 31 seconds (healthy)
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
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: depois da edição, linhas `File change detected` e `Nest application successfully started` novas no log | observado as duas, no mesmo segundo da edição | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: o id de `app-dev-api:local` e o id da imagem do container são os mesmos antes e depois, e `docker events` não registra evento de imagem | observado ids iguais (sha256:2c7b8984...) e 0 eventos | passou
- ✓ GET /api/health volta a responder 200 depois da nova subida | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
arquivo: apps/api/src/platform/health/health.module.ts (limpo no git); acrescentada uma linha de comentário às 15:35:39 UTC
log da api (linhas novas, lidas 6 s depois):
[3:35:39 PM] File change detected. Starting incremental compilation...
[3:35:39 PM] Found 0 errors. Watching for file changes.
{"level":30,"pid":292,"context":"NestFactory","msg":"Starting Nest application..."}
{"level":30,"pid":292,"context":"NestApplication","msg":"Nest application successfully started"}
GET /api/health -> 200
imagem app-dev-api:local antes e depois: sha256:2c7b898435ffd433e2fb59ea04cbaa98578d0c5b948d60e4b7e2995419b37a89 (igual; container com a mesma imagem)
docker events --since 2m --filter type=image -> 0 eventos de app-dev-api
git checkout -- apps/api/src/platform/health/health.module.ts -> 0 pendências; health 200 depois do revert
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia BETTER_AUTH_SECRET | esperado presente, observado `Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)`
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: nenhum valor das variáveis preenchidas do `.env` aparece na saída | observado 0 valores presentes | passou

<details>
<summary>Evidência</summary>

```
.env sem a linha BETTER_AUTH_SECRET (grep -c -> 0); postgres, valkey, mailpit e web no ar
subida da api em container efêmero do mesmo serviço do Compose, com o comando de produção
(o `nest start --watch` do serviço mantém o container vivo depois de a app sair):
docker compose run --rm --no-deps -T api sh -c 'cd apps/api && exec node --import ./dist/instrumentation.js dist/main.js'
saída: Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
código de saída: 1
valores de variáveis do .env presentes na saída: 0
.env restaurado da cópia base (cmp igual)
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: cada chave obrigatória de `envSchema` (apps/api/src/platform/config/env.ts), de `webEnvSchema` (VITE_API_URL) e do seed (ADMIN_EMAIL, ADMIN_PASSWORD) está no arquivo sem comentário | observado as 12 presentes | passou
- ✓ o `.env` é ignorado pelo git | esperado regra em `.gitignore`, observado `.gitignore:2:.env`
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: gitleaks sem achado e os valores sensíveis com texto de exemplo | observado `no leaks found`; BETTER_AUTH_SECRET=exemplo-local-troque-por-um-segredo-com-32-ou-mais-caracteres, ADMIN_PASSWORD=Trocar123, DATABASE_URL com app:app | passou

<details>
<summary>Evidência</summary>

```
.env.example (sem comentário): ADMIN_EMAIL ADMIN_PASSWORD BETTER_AUTH_SECRET BETTER_AUTH_URL DATABASE_URL NODE_ENV REDIS_URL SMTP_FROM SMTP_HOST SMTP_PORT VITE_API_URL WEB_ORIGIN
envSchema obrigatórias: NODE_ENV DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL WEB_ORIGIN SMTP_HOST SMTP_PORT SMTP_FROM (LOG_LEVEL com default; COOKIE_DOMAIN, SMTP_USER, SMTP_PASSWORD, OTEL_EXPORTER_OTLP_ENDPOINT opcionais)
SPA (apps/web): VITE_API_URL; seed: ADMIN_EMAIL, ADMIN_PASSWORD -> todas declaradas sem comentário
git check-ignore -v .env -> .gitignore:2:.env; .env.example versionado (git ls-files)
gitleaks detect --no-git --source .env.example -> no leaks found
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` existem as tabelas user, session, account e verification | interpretado como: as quatro em `pg_tables` do schema public | observado `_prisma_migrations account session user verification` | passou
- `*` a tabela user tem as colunas role, banned, banReason e banExpires | interpretado como: as quatro em `information_schema.columns` | observado `id name email emailVerified image createdAt updatedAt role banned banReason banExpires` | passou
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: uma linha em `_prisma_migrations` com `finished_at` preenchido e sem rollback | observado `20261029000000_init`, aplicada true, rolled_back vazio | passou

<details>
<summary>Evidência</summary>

```
DROP DATABASE ... WITH (FORCE); CREATE DATABASE -> tabelas no banco: 0
make db-setup -> código 0
Applying migration `20261029000000_init` ... All migrations have been successfully applied.
seed: primeiro admin criado
pg_tables (public): _prisma_migrations account session user verification
colunas de user: id name email emailVerified image createdAt updatedAt role banned banReason banExpires
_prisma_migrations: 20261029000000_init | aplicada true | rolled_back vazio
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
apps/api: node_modules/@prisma/adapter-pg/package.json "version" -> 7.10.1 (o pacote não exporta package.json pelo require); pnpm ls @prisma/adapter-pg --depth 0 -> @prisma/adapter-pg@7.10.1
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- ✓ existe exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- `*` essa conta tem papel admin e e-mail verificado | interpretado como: `role = 'admin'` e `emailVerified = true` | observado `admin`, `true` | passou
- `*` essa conta não está banida | interpretado como: `banned = false`, `banReason` e `banExpires` nulos | observado `false`, nulo, nulo | passou
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password <> ADMIN_PASSWORD` e sem conter o texto, na credencial | observado igual_ao_texto=false, contem_texto=false, hash de 161 caracteres | passou

<details>
<summary>Evidência</summary>

```
(mesma execução de make db-setup de CLI-BANCO-01, sobre o banco vazio)
select count(*) from "user" where email='admin@example.com' -> 1
user -> admin@example.com|role=admin|verified=true|banned=false|banReason=null|banExpires=null
account (providerId credential) -> igual_ao_texto=false|contem_texto=false|len=161
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- ✓ a credencial de senha dessa conta não muda | esperado hash igual antes e depois, observado igual (`cmp` dos dois valores)
- `*` nenhuma migração nova é aplicada | interpretado como: saída `No pending migrations to apply` e contagem de `_prisma_migrations` igual a 1 | observado as duas coisas | passou

<details>
<summary>Evidência</summary>

```
make db-setup (com admin-inicial já existente) -> código 0
No pending migrations to apply.
seed: primeiro admin já existia com papel admin e e-mail verificado; nada alterado
select count(*) from "user" where email='admin@example.com' -> 1
hash da credencial antes e depois: igual
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
select count(*) from "user" -> 0 (as migrações foram aplicadas antes do seed)
.env restaurado da cópia base
```

</details>

#### CLI-ADMIN-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin | interpretado como: uma linha da saída nomeando ADMIN_EMAIL e a conta sem papel admin | observado `seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado` | passou
- `*` essa conta continua sem papel admin e com o e-mail não verificado | interpretado como: `role` nula e `emailVerified = false` depois do comando | observado role=null e verified=false | passou
- ✓ a credencial de senha dessa conta não muda | esperado hash igual antes e depois, observado igual (`cmp` dos dois valores)
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
DROP DATABASE ... WITH (FORCE); CREATE DATABASE; prisma migrate deploy no container da api -> All migrations have been successfully applied
conta-comum-com-email-do-admin criada por SQL (hash de better-auth/crypto de uma senha diferente de ADMIN_PASSWORD): user comum_eval_user_002
antes:  admin@example.com|role=null|verified=false
make db-setup -> código 2
No pending migrations to apply.
seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado
depois: admin@example.com|role=null|verified=false
hash da credencial antes e depois: igual
select count(*) from "user" where email='admin@example.com' -> 1; select count(*) from account -> 1
ocorrências do e-mail na saída do comando: 0
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- `*` a linha é um objeto JSON completo | interpretado como: `json.loads` da linha inteira sem erro | observado objeto com chaves hostname, level, msg, pid, req, res, responseTime, time | passou
- `*` a linha traz um identificador único da requisição, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` presentes | observado `req.id` igual ao `x-request-id` da resposta, `res.statusCode` 200, `responseTime` 9 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | esperado ausente, observado ausente (`req.headers.cookie` igual a `[redigido]`)
- ✓ a linha não contém o valor do cabeçalho authorization | esperado ausente, observado ausente (`req.headers.authorization` igual a `[redigido]`)

<details>
<summary>Evidência</summary>

```
GET /api/health com Cookie: better-auth.session_token=COOKIE-SEGREDO-LOGS01-xyz e Authorization: Bearer AUTH-SEGREDO-LOGS01-xyz
x-request-id da resposta: 1a2b14f4-76f3-4ef2-bfc4-576a85f62764
docker compose logs --no-log-prefix api | grep 1a2b14f4... -> 1 linha
chaves: ['hostname', 'level', 'msg', 'pid', 'req', 'res', 'responseTime', 'time']
req.id: 1a2b14f4-76f3-4ef2-bfc4-576a85f62764 | res.statusCode: 200 | responseTime: 9
req.headers.cookie: [redigido] | authorization: [redigido]
contém COOKIE-SEGREDO-LOGS01: False | contém AUTH-SEGREDO-LOGS01: False
```

</details>

#### CLI-LOGS-02
- Veredito: passou
- ✓ os dois identificadores de requisição são diferentes | esperado diferentes, observado `befd94dd-a93a-442a-b84d-88c79548420c` e `f18899f1-b2f4-49a7-849b-1ea0e11444a9`
- ✓ nenhum dos dois é um número inteiro | esperado nenhum inteiro, observado dois UUID

<details>
<summary>Evidência</summary>

```
duas requisições GET /api/health em sequência; x-request-id das respostas usados para achar as linhas
requestIds no log: ['befd94dd-a93a-442a-b84d-88c79548420c', 'f18899f1-b2f4-49a7-849b-1ea0e11444a9']
diferentes: True; algum inteiro: False
```

</details>

#### CLI-LOGS-03
- Veredito: passou
- ✓ o e-mail da conta não aparece em nenhuma linha | esperado 0 linhas, observado 0 em 217
- ✓ a senha da conta não aparece em nenhuma linha | esperado 0 linhas, observado 0 em 217

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email com e-mail e senha de admin-inicial (200) antes da leitura
docker compose logs --no-log-prefix api -> 217 linhas desde a subida (CLI-AMBIENTE-01)
grep -c 'admin@example.com' -> 0
grep -c '<ADMIN_PASSWORD>' -> 0
(30 linhas de acesso, nenhuma para /api/auth/*: o middleware do Better Auth responde antes do log de acesso do pino-http; ver Avisos)
```

</details>

#### CLI-LOGS-04
- Veredito: passou
- ✓ a linha registra o caminho /api/health | esperado `req.url` igual a `/api/health`, observado `/api/health` (sem `req.query`)
- ✓ o texto segredo-da-query não aparece na linha | esperado ausente, observado ausente

<details>
<summary>Evidência</summary>

```
GET /api/health?token=segredo-da-query -> 200; x-request-id usado para achar a linha
req.url: /api/health | req.query presente: False
contém segredo-da-query: False
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: nenhuma linha JSON com `level >= 40` e nenhuma linha mencionando otel, opentelemetry, otlp ou export além do comando de subida | observado 0 linhas warn/error e 1 menção, o comando de subida | passou

<details>
<summary>Evidência</summary>

```
container da api: OTEL_EXPORTER_OTLP_ENDPOINT=ausente
10 x GET /api/health -> 200 200 200 200 200 200 200 200 200 200
docker compose logs --no-log-prefix api -> 230 linhas (51 fora do JSON são a saída do nest start e do tsc em watch)
linhas JSON com level >= 40: 0
linhas com otel|opentelemetry|otlp|export: 1 ("$ nest start --watch --exec ./bin/node-with-otel.sh --no-shell", comando de subida)
```

</details>

#### CLI-OTEL-02 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | interpretado como: linha nova no registro do receptor com caminho `/v1/traces` dentro de 30 s da requisição | observado POST /v1/traces (14484 bytes, application/x-protobuf) 6 s depois | passou
- ✓ a api continua respondendo 200 em GET /api/health | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
.env base + OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318; docker compose up -d --wait api -> Healthy
no container: OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318 protocolo=ausente
GET /api/health -> 200 às 15:40:20 UTC
registro do receptor (linhas novas):
{"at":"2026-10-29T15:40:21.562Z","method":"POST","path":"/v1/logs","bytes":2115,"contentType":"application/x-protobuf"}
{"at":"2026-10-29T15:40:25.467Z","method":"POST","path":"/v1/traces","bytes":14484,"contentType":"application/x-protobuf"}
GET /api/health de novo -> 200
log da api: 4 avisos JSON do SDK (level 40: "dropping invalid resource attribute value for key host.id" e 3 "OTLPExportDelegate", resposta do receptor que não desserializa); nenhum aviso fora do JSON
```

</details>

#### CLI-OTEL-03 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição | interpretado como: POST /v1/traces com `application/json` cujo corpo tem um span de servidor `GET /api/health` com `url.path` /api/health, dentro de 30 s | observado 5 s depois, span `GET /api/health` (kind 2) com `url.path` /api/health, `url.query` [redigido] e status 200 | passou
- ✓ o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos | esperado 0 atributos com o texto, observado 0 em 237 atributos de 65 spans (e 0 ocorrências em qualquer corpo recebido)

<details>
<summary>Evidência</summary>

```
.env base + OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318 + OTEL_EXPORTER_OTLP_PROTOCOL=http/json; docker compose up -d --wait api -> Healthy
no container: endpoint=http://host.docker.internal:4318 protocolo=http/json
GET /api/health?token=segredo-da-query -> 200 às 15:40:54 UTC
exportações recebidas: ('/v1/logs', 'application/json'), ('/v1/traces', 'application/json')
spans de traces recebidos: 65 | atributos: 237
span: GET /api/health | kind: 2 | url.path: /api/health | url.query: [redigido] | status 200   (a requisição do item)
span: GET /api/health | kind: 2 | url.path: /api/health | url.query: None | status 200         (healthcheck do Compose)
atributos com segredo-da-query: 0; texto segredo-da-query em algum corpo recebido: False
.env restaurado da cópia base; docker compose up -d --wait api -> endpoint=ausente protocolo=ausente; health 200
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a imagem final roda Node na major 26 | interpretado como: `node --version` na imagem começa com v26 | observado v26.13.0 | passou
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `*.ts` que não seja `*.d.ts` fora de node_modules e sem a pasta `apps/api/src` | observado 0 arquivos e `src` ausente | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhum diretório `@nestjs/cli` nem binário `nest` em `.bin` | observado 0 e 0 | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-29t15-29-18z . -> api build exit=0 (29 passos CACHED ou DONE)
docker run --rm --entrypoint node <imagem> --version -> v26.13.0
find /app -name "*.ts" -not -name "*.d.ts" -not -path "*/node_modules/*" | wc -l -> 0
test -d /app/apps/api/src -> ausente
find /app -path "*/@nestjs/cli" | wc -l -> 0; find /app -name nest -path "*/.bin/*" | wc -l -> 0
ls /app/apps/api -> dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: passou
- `*` o container segue em execução | interpretado como: `docker inspect` com `State.Status` running e health healthy depois das requisições | observado running, healthy | passou
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha JSON com `Nest application successfully started` e 0 linhas com `level >= 40` | observado a linha e 0 | passou
- ✓ todas as linhas do log do container são objetos JSON | esperado 0 linhas fora do JSON, observado 0 em 18 (e 0 em 21 depois das requisições seguintes)
- ✓ GET /api/health nesse container responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
docker run -d --network ai-template-harness-nestj-react-monorepo_default --env-file .env -e NODE_ENV=production -e PORT=3000 -p 3100:3000 eval-fundacao-api:2026-10-29t15-29-18z
healthy após 7 s; NODE_ENV=production no container
GET http://localhost:3100/api/auth/ok -> HTTP/1.1 200 OK {"ok":true}
estado: running health=healthy
log (18 linhas): level>=40: 0 | não JSON: 0
subida: {"level":30,"time":1793288531035,"pid":1,"hostname":"14f8e4f8ae35","context":"NestApplication","msg":"Nest application successfully started"}
GET http://localhost:3100/api/health -> HTTP/1.1 200 OK {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
estado final: running health=healthy; log final 21 linhas, não JSON: 0
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` falha e nenhum arquivo chamado `node` no sistema de arquivos | observado ausente e 0 arquivos | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: 200 text/html com corpo idêntico ao de `/`, contendo `<div id="root">` e o script de `/assets/` | observado 200, 453 bytes, idêntico (`cmp`), com `<html lang="pt-BR">`, `<div id="root"></div>` e `src="/assets/index-ltpmDyLm.js"` | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-29t15-29-18z . -> web build exit=0
imagem: 26186661 bytes
command -v node -> ausente; find / -xdev -type f -name node | wc -l -> 0
docker run -d -p 3180:80 <imagem>
GET / -> 200 text/html 453B
GET /uma-rota-qualquer -> 200 text/html 453B; cmp -> corpo idêntico ao de /
<html lang="pt-BR"> ... <div id="root"></div> ... src="/assets/index-ltpmDyLm.js"
```

</details>

#### CLI-CI-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída termina com a linha de que todas as verificações passaram | interpretado como: última linha não vazia igual a `ok: todas as verificações passaram` | observado essa linha como última | passou
- ✓ a saída não contém o aviso de alvo não implementado | esperado 0 ocorrências, observado 0

<details>
<summary>Evidência</summary>

```
CI=true make check -> código 0
ok: nome do branch 'feat/fundacao' ... ok: nenhum segredo encontrado (gitleaks) ... ok: avaliações válidas
lint: Tasks 3 successful, 3 total (cache); test: Tasks 5 successful, 5 total (cache)
ok: todas as verificações passaram   (última linha)
grep -c 'não implementado' -> 0
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | interpretado como: `actions/setup-node` com `node-version: 26` numa linha anterior ao passo `run: make check` | observado linha 31 (setup-node, node-version 26 na 33) antes da 59 | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version` fixa (lê o `packageManager` do package.json, como o comentário do workflow diz) antes do passo `run: make check` | observado linha 28 antes da 59, sem `version` | passou
- ✓ toda action do arquivo está fixada por SHA completo com comentário da versão | esperado 0 `uses:` fora do padrão `@<40 hex> # vX`, observado 0 (e `check-actions.sh` ok)

<details>
<summary>Evidência</summary>

```
.github/workflows/ci.yml
21: uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
28: uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
31: uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
33:   node-version: 26
59: run: make check
uses fora do padrão SHA de 40 hex + comentário: 0
scripts/checks/check-actions.sh -> ok: workflows válidos (actionlint); ok: actions fixadas por SHA
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que não há sessão aberta | interpretado como: texto visível em pt-BR dizendo que não há sessão | observado parágrafo "Nenhuma sessão aberta." | passou
- ✓ o elemento html tem lang igual a pt-BR | esperado `pt-BR`, observado `pt-BR`
- `*` o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session | interpretado como: as mensagens de nível error são só a `Failed to load resource ... 401` de http://localhost:3000/api/v1/session | observado 1 erro, exatamente essa mensagem | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis no centro, screenshot sem corte | observado 0 imagens, main/h1/p dentro da janela e `elementFromPoint` no próprio elemento, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
playwright-cli open --browser chromium http://localhost:5173/ (headless, 1280x720); cookie-list -> No cookies found
snapshot:
- main: heading "App" [level=1]; paragraph: Nenhuma sessão aberta.
eval document.documentElement.lang -> "pt-BR"
console: Total messages: 4 (Errors: 1, Warnings: 0)
[ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session:0
requests: 22. [GET] http://localhost:3000/api/v1/session => [401] Unauthorized
visual: imgs []; main/h1/p inViewport true, hitSelfOrChild true; rootChildren 1
screenshot: /tmp/evaluator-fundacao-2026-10-29T15-29-18Z/ui-inicio-01.png (removido na derrubada)
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- `*` a página mostra que há sessão aberta com o papel admin | interpretado como: texto visível dizendo que há sessão e o papel `admin` | observado "Sessão aberta com o papel admin." | passou
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: nenhuma mensagem de console com CORS e a requisição à API com resposta recebida | observado 0 erros no console, 0 menções a CORS e GET /api/v1/session => 200 | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/strong dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
cookie-set better-auth.session_token <mascarado> --domain=localhost --path=/ --httpOnly --sameSite=Lax (sessao-admin recriada depois dos itens de banco)
goto http://localhost:5173/
snapshot:
- main: heading "App"; paragraph: text "Sessão aberta com o papel", strong "admin", text "."
console -> Total messages: 3 (Errors: 0, Warnings: 0); menções a CORS: 0
requests: 22. [GET] http://localhost:3000/api/v1/session => [200] OK
screenshot: /tmp/evaluator-fundacao-2026-10-29T15-29-18Z/ui-inicio-02.png (removido na derrubada)
```

</details>

#### UI-INICIO-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível em pt-BR dizendo que a página não existe | observado heading "Página não encontrada" e "O endereço que você abriu não existe neste aplicativo." | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/p/a dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
goto http://localhost:5173/nao-existe
snapshot:
- alert: heading "Página não encontrada" [level=1]; paragraph: O endereço que você abriu não existe neste aplicativo.; link "Voltar ao início" (/)
console -> Errors: 0
screenshot: /tmp/evaluator-fundacao-2026-10-29T15-29-18Z/ui-inicio-03.png (removido na derrubada)
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que o servidor não respondeu | interpretado como: texto visível em pt-BR dizendo que o servidor não respondeu | observado heading "O servidor não respondeu" e "Não foi possível falar com a API. Tente de novo em alguns instantes." | passou
- `*` a página não fica em branco | interpretado como: `#root` com filhos e `body.innerText` não vazio | observado 1 filho e texto com título, detalhe e link | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p/p/a dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api -> api Exited (143); cookie-clear
goto http://localhost:5173/
snapshot:
- alert: heading "O servidor não respondeu" [level=1]; paragraph: Não foi possível falar com a API. Tente de novo em alguns instantes.; link "Voltar ao início" (/)
console: [ERROR] Failed to load resource: net::ERR_CONNECTION_REFUSED @ http://localhost:3000/api/v1/session (sem bullet sobre console neste item)
bodyText: "O servidor não respondeu\n\nNão foi possível falar com a API. Tente de novo em alguns instantes.\n\nVoltar ao início"; rootChildren: 1
screenshot: /tmp/evaluator-fundacao-2026-10-29T15-29-18Z/ui-inicio-04.png (removido na derrubada)
docker compose up -d --wait api -> Healthy; health 200
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: sem nenhum comando de recarga no navegador, o `h1` passa a mostrar o texto novo em até 30 s depois da edição no host | observado "App recarga 2026" 1 s depois da edição, sem reload nem goto | passou
- `*` base visual | interpretado como: imagens carregadas, elementos dentro da janela e clicáveis, screenshot sem corte | observado 0 imagens, main/h1/p dentro da janela e clicáveis, screenshot limpo | passou

<details>
<summary>Evidência</summary>

```
arquivo: apps/web/src/routes/root/route.tsx (limpo no git); goto http://localhost:5173/; h1 antes: "App"
sed <h1>App</h1> -> <h1>App recarga 2026</h1> às 15:44:32 UTC
eval document.querySelector("h1").textContent -> "App recarga 2026" (após 1 s, sem reload nem goto)
console: só o 401 de /api/v1/session da carga inicial (UI-INICIO-01)
screenshot: /tmp/evaluator-fundacao-2026-10-29T15-29-18Z/ui-recarga-01.png (removido na derrubada)
git checkout -- apps/web/src/routes/root/route.tsx -> 0 pendências; h1 volta a "App" 4 s depois
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json` (`pnpm install --frozen-lockfile`), Node 26 e pnpm 12 pelos shims do mise |
| Ambiente efêmero e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose down` seguido de `docker compose up -d --wait`, com `.env` copiado de `.env.example` |
| Banco efêmero e migração | 1 e 5 | contrato (Compose) e `scripts/db-setup.sh`: banco `eval_fundacao_...` criado no postgres do Compose e apontado por `DATABASE_URL` no `.env`; `make db-setup` migra; `prisma migrate deploy` no container da api quando o item pede banco migrado sem seed |
| Estado persistido | 3 | spec da fundação, Convenções: `admin-inicial` pelo seed `apps/api/prisma/seed.ts` (via `make db-setup`); `sessao-admin` por POST /api/auth/sign-in/email; `conta-comum-com-email-do-admin` por SQL no postgres do Compose com hash de `better-auth/crypto`, espelhando a factory de `apps/api/test/factories/user.factory.ts` |
| Limpeza entre itens | 5 | `DROP DATABASE ... WITH (FORCE)` e `CREATE DATABASE` no postgres do Compose; `.env` restaurado da cópia base; `git checkout --` nos arquivos editados para hot reload |
| Gates | 1 | contrato: `make check` e `make build` na raiz, com o `.env` do ambiente efêmero |
| Cliente HTTP | 6 | `curl` do host contra as portas publicadas |
| Logs da api | 5 | `docker compose logs --no-log-prefix api`, linha localizada pelo `x-request-id` da resposta |
| Navegador | 3 | spec, Verificação por superfície: `@playwright/cli` 0.1.22 (ADR-0024), `pnpm dlx @playwright/cli@0.1.22 open --browser chromium` (Chromium do Playwright, sem Chrome do sistema), rodado da pasta temporária para não criar `.playwright-cli/` na raiz |
| Receptor OTLP | 1 | contrato, Dependências externas: `node` com `http.createServer` em 0.0.0.0:4318, alcançado por `host.docker.internal` (`extra_hosts` do compose.yaml); `OTEL_EXPORTER_OTLP_PROTOCOL=http/json` pelo `.env` em CLI-OTEL-03 |
| Imagens de produção | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` construídos da raiz com tag marcada `eval-fundacao-*:<execução>`; a API de produção sobe na rede do Compose com `--env-file .env` e NODE_ENV=production |

## Limpeza e ambiente

- Sobras removidas: Nenhuma (nenhum banco `eval_fundacao_*`, pasta `evaluator-fundacao-*`, `processos.lock`, imagem ou container `eval-fundacao-*` de avaliação anterior).
- Derrubada: completa (receptor OTLP PID 67627 morto, porta 4318 livre; containers de produção `eval-fundacao-api-prod-*` e `eval-fundacao-web-prod-*` removidos; imagens `eval-fundacao-api` e `eval-fundacao-web` removidas; bancos `eval_fundacao_2026_10_29t15_29_18z` e `eval_fundacao_2026_10_29t15_29_18z_pre` apagados; `.env` criado pela avaliação removido; serviços api, web e mailpit parados, postgres e valkey mantidos no ar como estavam antes; navegador fechado (`playwright-cli list` sem sessões); pasta temporária `/tmp/evaluator-fundacao-2026-10-29T15-29-18Z` apagada)

## Avisos

- Avaliado com 2 arquivos fora de commit: `docs/features/fundacao/avaliacao.md` e `docs/features/fundacao/orquestracao.md` (modificados; o primeiro é a avaliação anterior, sobrescrita por esta).
- Os dois itens reprovados na avaliação anterior (CLI-ADMIN-04 e CLI-IMAGEM-02) passam depois do commit 011fc61: o seed recusa a conta comum com código 2 sem alterá-la, e o log do container de produção sai só em JSON.
- Os gates `make check` e `make build` vieram do cache local do Turborepo (lint, test e build com `cache hit`), porque o cache foi preenchido pela avaliação anterior sobre a mesma árvore; os itens CLI-STACK-01 a CLI-STACK-04 limparam o cache e rodaram lint, format, test e build de verdade, com o mesmo resultado.
- `DATABASE_URL` do `.env` apontou para o banco efêmero com o marcador da skill, no mesmo PostgreSQL do Compose, para os itens com "banco vazio" não tocarem o banco `app` de desenvolvimento; é a única alteração além de ADMIN_EMAIL e ADMIN_PASSWORD, e o Dado comum de "Ambiente local" pede o `.env` sem outra alteração.
- Os serviços postgres e valkey do Compose já estavam no ar antes da avaliação (sem o marcador da skill), e api, web e mailpit parados; a subida os derrubou e recriou com `docker compose down` e `up`, com os volumes preservados, e a derrubada devolveu o estado inicial. Os volumes nomeados de node_modules dos serviços api e web foram mantidos.
- CLI-STACK-04 removeu `apps/api/dist` no host, que é o bind mount do serviço api em watch; o processo em execução não caiu e o `make build` o regenerou; a recompilação de CLI-AMBIENTE-03 o reescreveu depois.
- Em CLI-LOGS-03 nenhuma linha de acesso para `/api/auth/*` aparece no log (30 linhas de acesso, só `/api/health` e `/api/v1/session`): o middleware do Better Auth responde antes do log de acesso do pino-http. O item passa porque e-mail e senha não aparecem, mas o sign-in fica sem linha de acesso no log.
- Em CLI-OTEL-02 e CLI-OTEL-03 o SDK gravou 4 avisos JSON (level 40) por subida: `dropping invalid resource attribute value for key "host.id"` e três `OTLPExportDelegate` pela resposta `{}` do receptor, que não desserializa como protobuf; são do simulador, não do endpoint, e os itens não têm bullet sobre isso.
- `make db-setup` gerou `apps/api/src/generated/` pelo bind mount; a pasta é ignorada pelo git.
- `validate.py` do spec-writer: aviso de que `spec.md` cita o componente 'API NestJS', que não está na tabela de componentes do HLD. `make check` também avisa que os diagramas C4 de `template-web.md` foram gerados da versão 0.2.2 e a fonte está na 0.2.3.

## Motivo do aborto

Nenhum.
