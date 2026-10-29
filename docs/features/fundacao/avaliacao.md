# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-29T19-28-27Z
- Branch: feat/fundacao
- Commit: f1806bb
- Status: limpo
- Itens: 52 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 52
- Critérios: 14 verificado, 0 reprovado, 0 indeterminado, de 14
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Monorepo: workspaces do pnpm 12 orquestrados pelo Turborepo, com apps/api, apps/web e packages/contracts, Node 26 e TypeScript 6 (ADR-0002, ADR-0012, ADR-0013, ADR-0020). | ✓ verificado | CLI-MONOREPO-01 |
| Scripts do contrato da stack: scripts/lint.sh, scripts/format.sh, scripts/test.sh e scripts/build.sh delegando ao Turborepo (ADR-0002). | ✓ verificado | CLI-STACK-01, CLI-STACK-02, CLI-STACK-03, CLI-STACK-04, CLI-STACK-05 |
| Ambiente local: Docker Compose com api, web, postgres, valkey e mailpit, com o código montado e hot reload (ADR-0006, ADR-0014, ADR-0016). | ✓ verificado | CLI-AMBIENTE-01, CLI-AMBIENTE-02, CLI-AMBIENTE-03, UI-RECARGA-01 |
| Configuração e segredos: .env.example versionado e validação das variáveis na subida da API, que falha se faltar alguma (HLD, Gestão de segredos). | ✓ verificado | CLI-CONFIG-01, CLI-CONFIG-02, CLI-CONFIG-03 |
| Banco: PostgreSQL 18 com Prisma 7 e a migração inicial com as tabelas do Better Auth e os campos do plugin admin (ADR-0007, ADR-0008, ADR-0010). | ✓ verificado | CLI-BANCO-01, CLI-BANCO-02 |
| Preparo do banco: alvo make db-setup que aplica as migrações e cria o primeiro admin a partir do .env, de forma idempotente (PRD, Decisão primeiro admin criado na instalação). | ✓ verificado | CLI-ADMIN-01, CLI-ADMIN-02, CLI-ADMIN-03, CLI-ADMIN-04, CLI-ADMIN-05, CLI-ADMIN-06 |
| Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010). | ✓ verificado | API-BORDA-01, API-BORDA-02, API-BORDA-03, API-BORDA-04, API-BORDA-05, API-ADMIN-01, API-CORS-01, API-CORS-02 |
| Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade). | ✓ verificado | API-SAUDE-01, API-SAUDE-02, API-SAUDE-03 |
| Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018). | ✓ verificado | CLI-LOGS-01, CLI-LOGS-02, CLI-LOGS-03, CLI-LOGS-04 |
| Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019). | ✓ verificado | CLI-OTEL-01, CLI-OTEL-02, CLI-OTEL-03 |
| Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020). | ✓ verificado | API-DOCS-01, API-DOCS-02, API-DOCS-03 |
| SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012). | ✓ verificado | CLI-MONOREPO-02, UI-INICIO-01, UI-INICIO-02, UI-INICIO-03, UI-INICIO-04 |
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | ✓ verificado | CLI-IMAGEM-01, CLI-IMAGEM-02, CLI-IMAGEM-03 |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | ✓ verificado | CLI-CI-01, CLI-CI-02 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (16 verificações `ok`; lint e test do Turborepo com 3 e 5 tarefas do cache local; última linha `ok: todas as verificações passaram`)
- ✓ build: `make build`, código 0 (4 tarefas, `FULL TURBO`; `apps/api/dist/main.js` e `apps/web/dist/index.html` presentes)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`; `docker compose up -d --wait` saiu com código 0 em 36 s, os cinco serviços saudáveis
- ✓ SPA Web: http://localhost:5173, GET / respondeu 200
- ✓ PostgreSQL: serviço postgres do Compose, `show server_version` 18.6
- ✓ Redis (serviço Valkey): serviço valkey saudável, valkey_version 9.1.3
- ✓ Mailpit: http://localhost:8025, GET /readyz respondeu 200

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (código 0, migração `20261029000000_init`, saída `seed: primeiro admin criado`) no banco efêmero `eval_fundacao_2026_10_29t19_28_27z`; conferido: 1 linha em user com admin@example.com, role admin, emailVerified t, banned f, banReason e banExpires nulos; 1 credencial `credential` com hash de 161 caracteres que não contém o texto de ADMIN_PASSWORD. Recriado da mesma forma depois dos itens de banco
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial` (200, `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`); conferido: GET /api/v1/session com o cookie respondeu 200 com o userId da conta e role admin. Recriada por novo sign-in depois dos itens de banco e conferida de novo antes de UI-INICIO-02
- ✓ `conta-comum-com-email-do-admin`: mecanismo conferido no pré-voo no banco irmão `eval_fundacao_2026_10_29t19_28_27z_pre` (migrado por `prisma migrate deploy` no container da api): hash por `hashPassword` de `better-auth/crypto` no container da api e INSERT em user e account, espelhando a factory `contaComumComEmailDoAdmin` de `apps/api/test/factories/user.factory.ts`; conferido: 1 conta, role nula, emailVerified f, banned f, credencial que `verifyPassword` aceita com a senha comum e recusa com ADMIN_PASSWORD. Recriado no banco efêmero migrado antes de CLI-ADMIN-04
- ✓ `admin-banido`: mesmo mecanismo, espelhando a factory `adminBanido`; conferido: 1 conta, role admin, emailVerified t, banned t, banExpires nulo, credencial que `verifyPassword` aceita com ADMIN_PASSWORD. Recriado no banco efêmero migrado antes de CLI-ADMIN-05

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD de 14 caracteres com letras e números; NODE_ENV=development e nenhuma variável OTEL_ no container da api. DATABASE_URL apontada para o banco efêmero (ver Avisos). Cópia base na pasta temporária, restaurada depois de cada item que alterou o arquivo (CLI-CONFIG-01, CLI-ADMIN-03, CLI-ADMIN-06, CLI-OTEL-02, CLI-OTEL-03)
- ✓ OTEL_EXPORTER_OTLP_PROTOCOL: ausente no container da api; definido como http/json só em CLI-OTEL-03, conferido no container
- ✓ Docker 28.5.1 com Compose v2.40.0, shellcheck 0.9.0, actionlint 1.7.12, gitleaks 8.30.1 e Python 3.13.14; Node 26.13.0 e pnpm 12.16.1 pelos shims do mise

### Dependências externas
- ✓ Coletor OTLP: simulado por um receptor HTTP em Node (`http.createServer`) em 0.0.0.0:4318 que responde 200 `{}` e grava método, caminho, horário, content-type, tamanho e corpo em JSON por linha; alcançado do host (POST /probe-host 200) e do container da api por http://host.docker.internal:4318 (POST /probe-container 200)

## Itens

### API HTTP

#### API-SAUDE-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo informa status ok | interpretado como: campo `status` igual a `ok` | observado `ok` | passou
- `*` o corpo informa postgres up e valkey up | interpretado como: `checks.postgres` e `checks.valkey` iguais a `up` | observado os dois `up` | passou

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
docker compose stop valkey -> Stopped
GET /api/health -> HTTP/1.1 503 Service Unavailable
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
docker compose stop postgres -> Stopped
GET /api/health -> HTTP/1.1 503 Service Unavailable
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
- `*` o corpo não traz id, papel nem e-mail de conta nenhuma | interpretado como: o corpo não contém o id de `admin-inicial`, a palavra admin nem um `@` | observado 0 ocorrências | passou

<details>
<summary>Evidência</summary>

```
GET http://localhost:3000/api/v1/session (sem cookie)
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
grep -E 'CITHX|admin|@' no corpo -> 0
```

</details>

#### API-BORDA-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
GET /api/v1/session com cookie better-auth.session_token=inventado.valorqualquer123
HTTP/1.1 401 Unauthorized
{"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo traz o userId da conta `admin-inicial` | interpretado como: `userId` igual ao id da linha de `admin-inicial` em user | observado `CITHXQwtRF49RIjfMlT335sj032ghpY6`, igual | passou
- ✓ o corpo traz role igual a admin | esperado `admin`, observado `admin`

<details>
<summary>Evidência</summary>

```
GET /api/v1/session com o cookie de sessao-admin
HTTP/1.1 200 OK
{"userId":"CITHXQwtRF49RIjfMlT335sj032ghpY6","role":"admin"}
id de admin-inicial no sign-in: CITHXQwtRF49RIjfMlT335sj032ghpY6
```

</details>

#### API-BORDA-05 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código EMAIL_PASSWORD_SIGN_UP_DISABLED | interpretado como: `code` igual a `EMAIL_PASSWORD_SIGN_UP_DISABLED` | observado igual | passou
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: `count(*)` em user com email novo@example.com igual a 0 antes e depois | observado 0 e 0 | passou

<details>
<summary>Evidência</summary>

```
select count(*) from "user" where email='novo@example.com' -> 0
POST /api/auth/sign-up/email {"email":"novo@example.com","name":"Novo","password":"<senha válida>"}
HTTP/1.1 400 Bad Request
{"message":"Email and password sign up is not enabled","code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}
select count(*) ... -> 0
```

</details>

#### API-ADMIN-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta define o cookie de sessão com o atributo HttpOnly | interpretado como: `set-cookie` de `better-auth.session_token` com `HttpOnly` | observado presente | passou
- `*` o corpo não contém a senha | interpretado como: texto de ADMIN_PASSWORD ausente da resposta inteira | observado 0 ocorrências | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email {"email":"admin@example.com","password":"<ADMIN_PASSWORD>"}
HTTP/1.1 200 OK
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
grep -c <ADMIN_PASSWORD> na resposta -> 0
```

</details>

#### API-CORS-01 *
- Veredito: passou
- `*` o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN | interpretado como: igual a http://localhost:5173 | observado igual | passou
- `*` o cabeçalho Access-Control-Allow-Credentials é true | interpretado como: valor `true` | observado `true` | passou

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://localhost:5173, Access-Control-Request-Method: GET
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

</details>

#### API-CORS-02 *
- Veredito: passou
- `*` a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem | interpretado como: nenhum Access-Control-Allow-Origin igual a http://outra-origem.example | observado cabeçalho ausente | passou

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://outra-origem.example
HTTP/1.1 204 No Content
Vary: Origin, Access-Control-Request-Headers
Access-Control-Allow-Credentials: true
(sem Access-Control-Allow-Origin)
```

</details>

#### API-DOCS-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é uma página HTML | interpretado como: `content-type` text/html e corpo com `<!DOCTYPE html>` | observado os dois | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs (NODE_ENV=development)
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
<!DOCTYPE html> <html lang="en"> ... <title>Swagger UI</title>
```

</details>

#### API-DOCS-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o campo openapi do corpo começa com 3. | interpretado como: prefixo `3.` | observado `3.0.0` | passou
- `*` os caminhos do documento incluem /api/v1/session | interpretado como: chave em `paths` | observado presente | passou
- `*` os caminhos do documento incluem /api/health | interpretado como: chave em `paths` | observado presente | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs-json -> 200
openapi: 3.0.0; paths: ['/api/health', '/api/v1/session']
```

</details>

#### API-DOCS-03
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404

<details>
<summary>Evidência</summary>

```
container da imagem de produção (CLI-IMAGEM-02) com --env-file .env e NODE_ENV=production, porta 3100
GET http://localhost:3100/api/docs-json -> 404 (GET /api/docs também 404)
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- ✓ o packageManager da raiz fixa o pnpm na major 12 | esperado 12.x, observado `pnpm@12.16.1`
- ✓ o engines.node da raiz exige a major 26 | esperado 26, observado `>=26.0.0`
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: os pacotes do workspace, fora a raiz privada `app`, são exatamente esses três | observado `@app/api`, `@app/web`, `@app/contracts` (apps/api, apps/web, packages/contracts) | passou
- ✓ o TypeScript instalado está na major 6 | esperado 6.x, observado 6.0.3
- ✓ o Turborepo instalado está na major 2 | esperado 2.x, observado 2.11.10

<details>
<summary>Evidência</summary>

```
package.json: packageManager pnpm@12.16.1; engines {"node":">=26.0.0","pnpm":">=12.0.0"}
pnpm -r ls --depth -1: app (raiz), @app/api apps/api, @app/web apps/web, @app/contracts packages/contracts
pnpm exec tsc --version -> Version 6.0.3; pnpm exec turbo --version -> 2.11.10
```

</details>

#### CLI-MONOREPO-02
- Veredito: passou
- ✓ @app/api declara @app/contracts pelo protocolo workspace: | esperado `workspace:`, observado `workspace:*`
- ✓ @app/web declara @app/contracts pelo protocolo workspace: | esperado `workspace:`, observado `workspace:*`

<details>
<summary>Evidência</summary>

```
apps/api/package.json dependencies["@app/contracts"] = workspace:*
apps/web/package.json dependencies["@app/contracts"] = workspace:*
```

</details>

#### CLI-STACK-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída não contém o aviso de alvo não implementado | esperado 0 ocorrências, observado 0
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: tarefas `@app/<pacote>:lint` na saída | observado as três, 0 do cache | passou

<details>
<summary>Evidência</summary>

```
TURBO_FORCE=true make lint -> código 0
@app/api:lint, @app/web:lint, @app/contracts:lint: Found 0 warnings and 0 errors.
Tasks: 3 successful, 3 total; Cached: 0 cached, 3 total
```

</details>

#### CLI-STACK-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` nenhum arquivo versionado fica alterado | interpretado como: `git status --porcelain` igual antes e depois | observado igual | passou

<details>
<summary>Evidência</summary>

```
make format -> código 0; Cached: 0 cached, 3 total
diff do git status --porcelain antes e depois -> vazio
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: resultado do Vitest de cada pacote | observado contracts 6, web 5 e api 25 testes passando | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: execução da configuração de integração com o datasource app_test | observado 19 testes de integração e `PostgreSQL database "app_test"` | passou

<details>
<summary>Evidência</summary>

```
TURBO_FORCE=true make test -> código 0; Tasks 5 successful, 0 cached
@app/contracts:test: Test Files 2 passed; Tests 6 passed
@app/web:test: Test Files 1 passed; Tests 5 passed
@app/api:test: $ vitest run && vitest run --config ./vitest.integration.config.ts
@app/api:test: Test Files 6 passed; Tests 25 passed
@app/api:test: Test Files 3 passed; Tests 19 passed
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
✓ Seed do primeiro admin (integração, banco app_test) (9)
```

</details>

#### CLI-STACK-04
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existe o arquivo main.js na pasta dist de apps/api | observado 945 bytes
- ✓ existe o arquivo index.html na pasta dist de apps/web | observado 453 bytes

<details>
<summary>Evidência</summary>

```
rm -rf apps/api/dist apps/web/dist packages/contracts/dist
TURBO_FORCE=true make build -> código 0; Tasks 4 successful, Cached 0
apps/api/dist/main.js 945 bytes; apps/web/dist/index.html 453 bytes
```

</details>

#### CLI-STACK-05 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída informa que todas as tarefas vieram do cache local | interpretado como: `Cached: N cached, N total` com N igual ao total | observado `4 cached, 4 total` e `FULL TURBO` | passou

<details>
<summary>Evidência</summary>

```
make build (logo depois de CLI-STACK-04) -> código 0
Tasks: 4 successful, 4 total; Cached: 4 cached, 4 total; >>> FULL TURBO
```

</details>

#### CLI-AMBIENTE-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis | interpretado como: `docker compose ps` com os cinco em running e healthy | observado os cinco | passou
- `*` o postgres informa versão na major 18 | interpretado como: `show server_version` 18.x | observado 18.6 | passou
- `*` o valkey informa versão na major 9 | interpretado como: `valkey_version` 9.x em `INFO server` | observado 9.1.3 | passou

<details>
<summary>Evidência</summary>

```
docker compose down; docker compose ps -q -> 0 containers
docker compose up -d --wait -> código 0 (45 s)
api running healthy; mailpit running healthy; postgres running healthy; valkey running healthy; web running healthy
show server_version -> 18.6 (Debian 18.6-1.pgdg13+2); valkey_version:9.1.3
```

</details>

#### CLI-AMBIENTE-02
- Veredito: passou
- ✓ appendonly é yes | esperado yes, observado yes
- ✓ appendfsync é everysec | esperado everysec, observado everysec
- ✓ maxmemory-policy é noeviction | esperado noeviction, observado noeviction

<details>
<summary>Evidência</summary>

```
valkey-cli config get appendonly -> appendonly yes
valkey-cli config get appendfsync -> appendfsync everysec
valkey-cli config get maxmemory-policy -> maxmemory-policy noeviction
```

</details>

#### CLI-AMBIENTE-03 *
- Veredito: passou
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: linha de recompilação do watch seguida de `Starting Nest application...` | observado `File change detected. Starting incremental compilation...`, `Found 0 errors` e a nova subida (pid 337) | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: id da imagem `app-dev-api:local` e id do container iguais antes e depois | observado iguais | passou
- `*` GET /api/health volta a responder 200 depois da nova subida | interpretado como: 200 depois da recompilação | observado 200 | passou

<details>
<summary>Evidência</summary>

```
echo "// avaliacao-recarga" >> apps/api/src/platform/health/health.controller.ts
[7:35:24 PM] File change detected. Starting incremental compilation...
[7:35:25 PM] Found 0 errors. Watching for file changes.
{"level":30,...,"pid":337,...,"context":"NestFactory","msg":"Starting Nest application..."}
imagem igual (2c7b898435ff...), container igual
arquivo restaurado da cópia; GET /api/health -> 200
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia BETTER_AUTH_SECRET | observado `BETTER_AUTH_SECRET (ausente)`
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: nenhum valor do `.env` (DATABASE_URL, REDIS_URL, segredo, ADMIN_EMAIL, ADMIN_PASSWORD, WEB_ORIGIN, SMTP_HOST, SMTP_FROM) na saída | observado 0 ocorrências de cada | passou

<details>
<summary>Evidência</summary>

```
.env sem BETTER_AUTH_SECRET
docker compose run --rm --no-deps -T -w /app/apps/api api node --import ./dist/instrumentation.js dist/main.js -> código 1
Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: toda chave do esquema de `apps/api/src/platform/config/env.ts` sem default ou opcional e o VITE_API_URL da SPA aparecem no arquivo | observado NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, SMTP_HOST, SMTP_PORT, SMTP_FROM e VITE_API_URL presentes; PORT tem default 3000 | passou
- `*` o `.env` é ignorado pelo git | interpretado como: `git check-ignore` casa | observado `.gitignore:2:.env` | passou
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: valores apontam para serviços do Compose e localhost, segredo marcado como exemplo | observado `exemplo-local-troque-por-...`, `Trocar123`, hosts postgres, valkey, mailpit e localhost | passou

<details>
<summary>Evidência</summary>

```
git check-ignore -v .env -> .gitignore:2:.env
git ls-files -> .env.example
chaves do .env.example: NODE_ENV DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL WEB_ORIGIN COOKIE_DOMAIN SMTP_HOST SMTP_PORT SMTP_FROM SMTP_USER SMTP_PASSWORD ADMIN_EMAIL ADMIN_PASSWORD OTEL_EXPORTER_OTLP_ENDPOINT LOG_LEVEL VITE_API_URL WATCH_POLLING
env.ts: PORT com .default(3000); COOKIE_DOMAIN, SMTP_USER, SMTP_PASSWORD, OTEL_EXPORTER_OTLP_ENDPOINT opcionais
```

</details>

#### CLI-CONFIG-03
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia PORT | observado `PORT (inválida: Too big: expected number to be <=65535)`

<details>
<summary>Evidência</summary>

```
docker compose run --rm --no-deps -T -e PORT=70000 -w /app/apps/api api node --import ./dist/instrumentation.js dist/main.js -> código 1
Configuração inválida; corrija no .env: PORT (inválida: Too big: expected number to be <=65535)
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` existem as tabelas user, session, account e verification | interpretado como: as quatro em `pg_tables` do schema public | observado as quatro e `_prisma_migrations` | passou
- `*` a tabela user tem as colunas role, banned, banReason e banExpires | interpretado como: as quatro em `information_schema.columns` | observado as quatro | passou
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: linha concluída em `_prisma_migrations` | observado `20261029000000_init`, finished_at preenchido | passou

<details>
<summary>Evidência</summary>

```
banco efêmero recriado vazio (0 tabelas em public)
make db-setup -> código 0
tabelas: _prisma_migrations account session user verification
colunas de user: banned banExpires role banReason
_prisma_migrations: 20261029000000_init|t
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
apps/api: require.resolve prisma/package.json -> 7.10.1; @prisma/client -> 7.10.1
apps/api/node_modules/@prisma/adapter-pg/package.json "version": "7.10.1"
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- ✓ existe exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- `*` essa conta tem papel admin e e-mail verificado | interpretado como: role admin e emailVerified t | observado os dois | passou
- `*` essa conta não está banida | interpretado como: banned f | observado f | passou
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password` diferente e sem conter o texto | observado diferente, posição 0 | passou

<details>
<summary>Evidência</summary>

```
make db-setup (banco vazio) -> código 0; seed: primeiro admin criado
select count(*), max(role), bool_and(emailVerified), bool_or(banned) ... -> 1|admin|t|f
password <> ADMIN_PASSWORD -> t; position(ADMIN_PASSWORD in password) -> 0
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- `*` a credencial de senha dessa conta não muda | interpretado como: `account.password` byte a byte igual antes e depois | observado igual | passou
- `*` nenhuma migração nova é aplicada | interpretado como: `No pending migrations to apply.` e contagem de `_prisma_migrations` igual | observado 1 antes e depois | passou

<details>
<summary>Evidência</summary>

```
make db-setup (segunda vez) -> código 0
No pending migrations to apply.
seed: primeiro admin já existia com papel admin, e-mail verificado e sem banimento; nada alterado
count user admin@example.com -> 1; cmp do hash -> igual; _prisma_migrations 1 -> 1
```

</details>

#### CLI-ADMIN-03 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- ✓ a saída nomeia ADMIN_EMAIL | observado `corrija no .env: ADMIN_EMAIL`
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em user igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco recriado vazio; .env com ADMIN_EMAIL=
make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL
select count(*) from "user" -> 0
```

</details>

#### CLI-ADMIN-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin | interpretado como: mensagem do seed com esse sentido | observado `seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado` | passou
- `*` essa conta continua sem papel admin e com o e-mail não verificado | interpretado como: role nula e emailVerified f | observado os dois | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: hash igual antes e depois | observado igual | passou
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
banco recriado e migrado; conta-comum-com-email-do-admin inserida
make db-setup -> código 2
seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado
select count(*), role, emailVerified -> 1|<nulo>|f; cmp do hash -> igual
```

</details>

#### CLI-ADMIN-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que a conta admin com o e-mail de ADMIN_EMAIL está banida | interpretado como: mensagem do seed com esse sentido | observado `seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado` | passou
- ✓ a saída não contém o texto de ADMIN_EMAIL | esperado 0 ocorrências de admin@example.com, observado 0
- `*` essa conta continua banida e com papel admin | interpretado como: banned t e role admin | observado os dois, banExpires nulo | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: hash igual antes e depois | observado igual | passou

<details>
<summary>Evidência</summary>

```
banco recriado e migrado; admin-banido inserido
make db-setup -> código 2
seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado
grep -c admin@example.com na saída -> 0
select count(*), role, banned, banExpires -> 1|admin|t|; cmp do hash -> igual
```

</details>

#### CLI-ADMIN-06 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- ✓ a saída nomeia ADMIN_PASSWORD | observado `corrija no .env: ADMIN_PASSWORD`
- ✓ a saída não contém o texto de ADMIN_PASSWORD | esperado 0 ocorrências, observado 0
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em user igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco recriado vazio; .env com ADMIN_PASSWORD de 13 letras sem número
make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_PASSWORD
grep -c <senha> na saída -> 0; select count(*) from "user" -> 0
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- `*` a linha é um objeto JSON completo | interpretado como: a linha com o `x-request-id` da resposta passa em `json.loads` | observado objeto válido | passou
- `*` a linha traz um identificador único da requisição, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` | observado `891a0096-...`, 200 e 2 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | esperado 0 ocorrências, observado 0 (`"cookie":"[redigido]"`)
- ✓ a linha não contém o valor do cabeçalho authorization | esperado 0 ocorrências, observado 0 (`"authorization":"[redigido]"`)

<details>
<summary>Evidência</summary>

```
GET /api/health com cookie: sess=valor-cookie-avaliacao-123 e authorization: Bearer valor-auth-avaliacao-456
x-request-id: 891a0096-c0d3-4b65-8ac2-e0139b130943
linha: {"req":{"id":"891a0096-...","method":"GET","url":"/api/health","headers":{...,"cookie":"[redigido]","authorization":"[redigido]"}},"res":{"statusCode":200,...},"responseTime":2,...}
```

</details>

#### CLI-LOGS-02 *
- Veredito: passou
- `*` os dois identificadores de requisição são diferentes | interpretado como: `req.id` das duas linhas, localizadas pelo `x-request-id` | observado `365c7600-...` e `5ae62954-...` | passou
- `*` nenhum dos dois é um número inteiro | interpretado como: UUID, não inteiro | observado os dois UUID | passou

<details>
<summary>Evidência</summary>

```
x-request-id: 365c7600-452a-489a-b922-73e14455bc0c (1 linha no log)
x-request-id: 5ae62954-0eb2-41fe-9eac-c3f15cddb1cd (1 linha no log)
```

</details>

#### CLI-LOGS-03 *
- Veredito: passou
- `*` o e-mail da conta não aparece em nenhuma linha | interpretado como: 0 ocorrências de admin@example.com no log do container desde a subida | observado 0 em 272 linhas | passou
- `*` a senha da conta não aparece em nenhuma linha | interpretado como: 0 ocorrências do texto de ADMIN_PASSWORD | observado 0 | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email com as credenciais de admin-inicial -> 200
docker compose logs --no-log-prefix api (container subido em CLI-AMBIENTE-01) -> 272 linhas
grep -c admin@example.com -> 0; grep -c <ADMIN_PASSWORD> -> 0
```

</details>

#### CLI-LOGS-04 *
- Veredito: passou
- `*` a linha registra o caminho /api/health | interpretado como: `req.url` igual a `/api/health` | observado `/api/health` | passou
- ✓ o texto segredo-da-query não aparece na linha | esperado 0 ocorrências, observado 0

<details>
<summary>Evidência</summary>

```
GET /api/health?token=segredo-da-query; linha localizada pelo x-request-id
req.url -> /api/health; grep -c segredo-da-query -> 0
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: nenhuma linha JSON de nível 40 ou mais e nenhuma linha com otlp, export ou opentelemetry além do comando de subida | observado 0 avisos ou erros; a única linha que casa é `$ nest start --watch --exec ./bin/node-with-otel.sh --no-shell` | passou

<details>
<summary>Evidência</summary>

```
sem variáveis OTEL_ no container; 10x GET /api/health -> 200 em todas
log da api: linhas de nível >= 40 -> 0
grep -iE 'otlp|export|opentelemetry|otel' -> 1 ($ nest start --watch --exec ./bin/node-with-otel.sh --no-shell)
```

</details>

#### CLI-OTEL-02
- Veredito: passou
- ✓ em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | esperado POST /v1/traces em até 30 s, observado em 6 s
- ✓ a api continua respondendo 200 em GET /api/health | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
.env + OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318; docker compose up -d --wait api -> Healthy
GET /api/health -> 200
receptor: POST /v1/logs application/x-protobuf 2115 bytes; POST /v1/traces application/x-protobuf 14484 bytes (6 s)
GET /api/health -> 200
```

</details>

#### CLI-OTEL-03 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição | interpretado como: POST /v1/traces em até 30 s com span de servidor `GET /api/health` que traz `url.query` | observado em 2 s, span `GET /api/health` com `url.query` `[redigido]` | passou
- ✓ o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos | esperado 0, observado 0 em 65 spans (0 também nos corpos inteiros recebidos)

<details>
<summary>Evidência</summary>

```
.env + OTEL_EXPORTER_OTLP_ENDPOINT e OTEL_EXPORTER_OTLP_PROTOCOL=http/json, conferidos no container
GET /api/health?token=segredo-da-query -> 200
receptor: POST /v1/logs application/json 2854; POST /v1/traces application/json 40204 (2 s)
span: GET /api/health {http.request.method: GET, url.path: /api/health, url.query: [redigido], http.response.status_code: 200}
spans com segredo-da-query -> 0 de 65; grep no arquivo do receptor -> 0
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a imagem final roda Node na major 26 | interpretado como: `node --version` na imagem | observado v26.13.0 | passou
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `.ts` fora de `.d.ts` e de node_modules | observado nenhum; `/app/apps/api` tem só dist, node_modules e package.json | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhuma pasta `@nestjs/cli` na imagem | observado 0 | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-29t19-28-27z . -> código 0 (28 s)
node --version -> v26.13.0
find / -xdev -name "*.ts" ! -name "*.d.ts" ! -path "*/node_modules/*" -> vazio
find / -xdev -type d -path "*@nestjs/cli" -> 0
/app/apps/api: dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: passou
- `*` o container segue em execução | interpretado como: `docker inspect` running | observado running, código 0 | passou
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha JSON com `Nest application successfully started` e nenhuma de nível 50 ou mais | observado a linha e 0 erros | passou
- `*` todas as linhas do log do container são objetos JSON | interpretado como: cada linha não vazia passa em `json.loads` | observado 21 de 21 | passou
- ✓ GET /api/health nesse container responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
docker run -d --name eval-fundacao-api-prod-2026-10-29t19-28-27z --network ai-template-harness-nestj-react-monorepo_default --env-file .env -e NODE_ENV=production -e PORT=3000 -p 3100:3000
GET /api/auth/ok -> 200 {"ok":true}; GET /api/health -> 200 {"status":"ok",...}
docker inspect -> running 0
log: 21 linhas, não JSON 0, erros 0; {"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` vazio e nenhum arquivo chamado node | observado os dois | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: 200 text/html com corpo byte a byte igual ao index.html da imagem | observado igual, `<html lang="pt-BR">` | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-29t19-28-27z . -> código 0 (10 s)
command -v node -> "sem node"; find / -xdev -type f -name node -> 0
docker run -p 8180:80; GET /uma-rota-qualquer -> 200 Content-Type: text/html
cmp com o index.html da imagem -> igual
```

</details>

#### CLI-CI-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída termina com a linha de que todas as verificações passaram | interpretado como: última linha `ok: todas as verificações passaram` | observado igual | passou
- ✓ a saída não contém o aviso de alvo não implementado | esperado 0 ocorrências, observado 0

<details>
<summary>Evidência</summary>

```
CI=true make check -> código 0; 16 linhas "ok:"
última linha: ok: todas as verificações passaram
ocorrências de "não implementado": 0
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | interpretado como: `actions/setup-node` com `node-version: 26` antes do passo `make check` | observado | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version`, que lê o packageManager, antes do passo `make check` | observado | passou
- `*` toda action do arquivo está fixada por SHA completo com comentário da versão | interpretado como: todo `uses:` com `@<40 hex> # v...` | observado 3 de 3 | passou

<details>
<summary>Evidência</summary>

```
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0  (sem version: lê o packageManager)
uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0  node-version: 26
... passo "make check" depois dos três
uses: sem SHA completo com comentário -> 0
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que não há sessão aberta | interpretado como: texto visível em pt-BR dizendo que não há sessão | observado `Nenhuma sessão aberta.` | passou
- ✓ o elemento html tem lang igual a pt-BR | esperado pt-BR, observado pt-BR
- `*` o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session | interpretado como: a única mensagem de nível erro é a do 401 de /api/v1/session | observado 1 erro, `Failed to load resource: ... 401 (Unauthorized) @ http://localhost:3000/api/v1/session` | passou
- ✓ base visual mecânica: 0 imagens, 4 elementos visíveis, nenhum fora da janela ou coberto
- `*` base visual por screenshot: título e texto legíveis, sem corte nem sobreposição | passou

<details>
<summary>Evidência</summary>

```
navegador novo, cookie-list -> No cookies found; goto http://localhost:5173/
texto: "App\n\nNenhuma sessão aberta." | lang=pt-BR
console: Errors 1: [ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session
rede: GET http://localhost:3000/api/v1/session => [401]
screenshot: ui-inicio-01.png
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- `*` a página mostra que há sessão aberta com o papel admin | interpretado como: texto visível com sessão aberta e o papel admin | observado `Sessão aberta com o papel admin.` | passou
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: GET /api/v1/session com 200 e nenhuma mensagem de CORS no console | observado 200 e 0 erros no console | passou
- ✓ base visual mecânica: 0 imagens, 5 elementos visíveis, nenhum fora da janela ou coberto
- `*` base visual por screenshot: título e texto legíveis | passou

<details>
<summary>Evidência</summary>

```
cookie-set better-auth.session_token=<mascarado> (sessao-admin) --domain=localhost --httpOnly --sameSite=Lax
goto http://localhost:5173/
texto: "App\n\nSessão aberta com o papel admin."
rede: GET http://localhost:3000/api/v1/session => [200] OK
console: Errors 0; ocorrências de "cors" nos logs do console -> 0
screenshot: ui-inicio-02.png
```

</details>

#### UI-INICIO-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível em pt-BR de página não encontrada | observado `Página não encontrada` e `O endereço que você abriu não existe neste aplicativo.` | passou
- ✓ base visual mecânica: 0 imagens, 6 elementos visíveis, nenhum fora da janela ou coberto
- `*` base visual por screenshot: título, texto e link legíveis | passou

<details>
<summary>Evidência</summary>

```
cookie-clear; goto http://localhost:5173/nao-existe
texto: "Página não encontrada\n\nO endereço que você abriu não existe neste aplicativo.\n\nVoltar ao início"
screenshot: ui-inicio-03.png
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que o servidor não respondeu | interpretado como: texto visível em pt-BR sobre o servidor sem resposta | observado `O servidor não respondeu` | passou
- `*` a página não fica em branco | interpretado como: texto visível não vazio e elementos renderizados | observado 6 elementos visíveis e texto | passou
- ✓ base visual mecânica: 0 imagens, nenhum elemento fora da janela ou coberto
- `*` base visual por screenshot: título, texto e link legíveis | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api -> Stopped
goto http://localhost:5173/
rede: GET http://localhost:3000/api/v1/session => [FAILED] net::ERR_CONNECTION_REFUSED
texto: "O servidor não respondeu\n\nNão foi possível falar com a API. Tente de novo em alguns instantes.\n\nVoltar ao início"
docker compose up -d --wait api -> Healthy; /api/health 200
screenshot: ui-inicio-04.png
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: o texto novo aparece na página aberta e uma marca gravada em `window` antes da edição continua lá (sem recarga) | observado o texto novo em 2 s e `marker=sem-recarga` | passou
- ✓ base visual mecânica: 0 imagens, 4 elementos visíveis, nenhum fora da janela ou coberto

<details>
<summary>Evidência</summary>

```
raiz aberta; window.__evalMarker='sem-recarga'; texto "App\n\nNenhuma sessão aberta."
sed no host em apps/web/src/routes/root/route.tsx: "Nenhuma sessão aberta (recarga da avaliação)."
em 2s: "App\n\nNenhuma sessão aberta (recarga da avaliação). | marker=sem-recarga"
arquivo restaurado da cópia (git status de apps/web limpo)
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json` (`pnpm install --frozen-lockfile`), Node 26 e pnpm 12 pelos shims do mise |
| Ambiente efêmero e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose up -d --wait`, com `.env` a partir de `.env.example` |
| Banco efêmero e migração | 1 e 5 | contrato (Compose) e `scripts/db-setup.sh`: banco `eval_fundacao_...` no postgres do Compose apontado por `DATABASE_URL`; `make db-setup` migra; `prisma migrate deploy` no container da api quando o item pede banco migrado sem seed |
| Estado persistido | 3 | spec da fundação, Convenções: `admin-inicial` pelo seed `apps/api/prisma/seed.ts` (via `make db-setup`); `sessao-admin` por POST /api/auth/sign-in/email; `conta-comum-com-email-do-admin` e `admin-banido` por SQL com hash de `better-auth/crypto`, espelhando as factories de `apps/api/test/factories/user.factory.ts` |
| Limpeza entre itens | 5 | `DROP DATABASE ... WITH (FORCE)` e `CREATE DATABASE`; `.env` restaurado da cópia base; arquivos editados para hot reload restaurados da cópia |
| Gates | 1 | contrato: `make check` e `make build` na raiz, com o `.env` do ambiente efêmero |
| Lint, format, test e build sem cache | 6 | `TURBO_FORCE=true` do Turborepo, para rodar as tarefas de verdade sem apagar o cache |
| Cliente HTTP | 6 | `curl` do host contra as portas publicadas |
| Logs da api | 5 | `docker compose logs --no-log-prefix api`, linha localizada pelo `x-request-id` da resposta |
| Subida da api que deve falhar | 5 | `docker compose run --rm --no-deps -T -w /app/apps/api api` com o comando de produção `node --import ./dist/instrumentation.js dist/main.js`, porque o `nest start --watch` não termina o processo |
| Navegador | 3 | spec, Verificação por superfície: `@playwright/cli` 0.1.22 (ADR-0024), pelo binário já presente no cache do `pnpm dlx`, com o Chromium 1247 do Playwright (`channel: chromium` em `.playwright/cli.config.json` da pasta temporária) |
| Receptor OTLP | 1 | contrato, Dependências externas: `node` com `http.createServer` em 0.0.0.0:4318, alcançado por `host.docker.internal` (`extra_hosts` do compose.yaml) |
| Imagens de produção | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` construídos da raiz com tag `eval-fundacao-*:<execução>`; a API de produção na rede do Compose com `--env-file .env` e NODE_ENV=production |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_fundacao_*`, pasta `evaluator-fundacao-*`, `processos.lock`, container ou imagem `eval-fundacao-*` encontrado.
- Derrubada: completa (navegador fechado; receptor OTLP PID 43636 morto, porta 4318 livre; containers e imagens `eval-fundacao-api` e `eval-fundacao-web` removidos; bancos `eval_fundacao_2026_10_29t19_28_27z` e `_pre` apagados; api, web e mailpit parados e removidos, postgres e valkey deixados no ar como estavam antes da avaliação; `.env` removido; pasta temporária `/tmp/evaluator-fundacao-2026-10-29T19-28-27Z` apagada)

## Avisos

- Avaliado com 3 caminhos fora de commit além deste arquivo: `docs/features/fundacao/orquestracao.md` e `skills-lock.json` modificados e `.agents/` novo, nenhum deles código avaliado.
- Os três itens reprovados na avaliação anterior (CLI-CONFIG-03, CLI-ADMIN-05, CLI-ADMIN-06) passaram com o commit f1806bb.
- Os gates `make check` e `make build` vieram do cache local do Turborepo; CLI-STACK-01 a CLI-STACK-04 rodaram lint, format, test e build de verdade com `TURBO_FORCE=true`, com o mesmo resultado.
- `DATABASE_URL` do `.env` apontou para o banco efêmero com o marcador da skill, no mesmo PostgreSQL do Compose, para os itens com "banco vazio" não tocarem o banco `app`; é a única alteração além de ADMIN_EMAIL e ADMIN_PASSWORD.
- CLI-STACK-04 apagou `apps/api/dist` no host, que o serviço api em watch usa; a api foi reiniciada com `docker compose restart api` depois do build e voltou a responder 200. Efeito da avaliação, não da implementação.
- Em CLI-LOGS-03 não há linha de acesso para `/api/auth/*` no log: o item passa porque e-mail e senha não aparecem, mas o sign-in fica sem linha de acesso.
- O receptor OTLP responde `{}`, que o SDK não lê como protobuf; não houve bullet sobre isso.
- O `@playwright/cli` procurou primeiro o Chrome em `/opt/google/chrome` e depois o headless shell 1247, ausentes; usou-se o Chromium 1247 já instalado no cache do Playwright com `channel: chromium`.
- `validate.py` do spec-writer e `make check` avisam que `spec.md` cita o componente 'API NestJS', ausente da tabela de componentes do HLD; `make check` avisa também que os diagramas C4 de `template-web.md` vieram da versão 0.2.2 e a fonte está na 0.2.3.

## Motivo do aborto

Nenhum.
