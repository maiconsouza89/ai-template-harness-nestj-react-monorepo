# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-30T18-11-26Z
- Branch: refactor/api-clean-arch
- Commit: 0872c9f
- Status: limpo
- Itens: 60 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 60
- Critérios: 15 verificado, 0 reprovado, 0 indeterminado, de 15
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
| Regra de dependência na API: Módulo Contas nas camadas da Clean Architecture e dependency-cruiser no lint de apps/api barrando import entre camadas, entre módulos e ciclos (ADR-0025, ADR-0026). | ✓ verificado | CLI-CAMADAS-01, CLI-CAMADAS-02, CLI-CAMADAS-03, CLI-CAMADAS-04, CLI-CAMADAS-05, CLI-CAMADAS-06, CLI-CAMADAS-07, CLI-CAMADAS-08 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (16 verificações `ok`; lint e test do Turborepo do cache local, 3 e 5 tarefas, `FULL TURBO`; última linha `ok: todas as verificações passaram`)
- ✓ build: `make build`, código 0 (4 tarefas, `FULL TURBO`; `apps/api/dist/main.js` e `apps/web/dist/index.html` presentes)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`; `docker compose up -d --wait` saiu com código 0 em 23 s, os cinco serviços saudáveis
- ✓ SPA Web: http://localhost:5173, GET / respondeu 200
- ✓ PostgreSQL: serviço postgres do Compose saudável, banco efêmero `eval_fundacao_2026_10_30t18_11_26z` criado nele
- ✓ Redis (serviço Valkey): serviço valkey saudável; `checks.valkey` igual a `up` na saúde da API
- ✓ Mailpit: http://localhost:8025, GET /readyz respondeu 200

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (código 0, saída `seed: primeiro admin criado`) no banco efêmero; conferido: user admin@example.com com role admin, emailVerified t, banned f, banExpires nulo e credencial `credential` com hash de 161 caracteres. Recriado do mesmo jeito depois dos itens que esvaziam o banco
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial` (200, `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`); conferido: GET /api/v1/session com o cookie respondeu 200 com o userId da conta e role admin. Refeita antes de UI-INICIO-02, porque o banco foi recriado entre os itens
- ✓ `conta-comum-com-email-do-admin`: criada no banco vazio por `make db-setup` com ADMIN_PASSWORD trocada por outra senha (hash real do Better Auth de uma senha diferente) e depois `role` nulo e `emailVerified` false por SQL; conferido: role nulo, emailVerified f, banned f, md5 do hash `6e05e5d7...`
- ✓ `admin-banido`: criado por `make db-setup` no banco vazio e depois `banned` true, `banExpires` nulo por SQL; conferido: role admin, emailVerified t, banned t, banExpires nulo, credencial igual à de ADMIN_PASSWORD

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD de exemplo (letras e números, 9 caracteres); NODE_ENV=development; OTEL_EXPORTER_OTLP_ENDPOINT ausente. DATABASE_URL apontada para o banco efêmero (ver Avisos)
- ✓ OTEL_EXPORTER_OTLP_PROTOCOL: `http/json` só em CLI-OTEL-03, acrescentado ao `.env` e a api recriada; removido depois
- ✓ Docker 28.5.1 com Compose v2 (6 GB e 4 CPUs na VM), shellcheck, actionlint, gitleaks e python3: `CI=true make check` passou

### Dependências externas
- ✓ Coletor OTLP: receptor HTTP em Python na porta 4318 do host, que aceita qualquer requisição e grava método, caminho, horário, tipo e corpo (com chunked e gzip); a api o alcança por `http://host.docker.internal:4318` (POST de teste do container respondeu 200)

## Itens

### API HTTP

#### API-SAUDE-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo informa status ok | interpretado como: campo `status` igual a `ok` | observado `ok` | passou
- `*` o corpo informa postgres up e valkey up | interpretado como: `checks.postgres` e `checks.valkey` iguais a `up` | observado `up` e `up` | passou

<details>
<summary>Evidência</summary>

```
GET /api/health (sem cookie) -> 200 {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
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
GET /api/health -> 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
docker compose up -d --wait valkey -> Healthy
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
GET /api/health -> 503 {"status":"error","checks":{"postgres":"down","valkey":"up"}}
docker compose up -d --wait postgres -> Healthy; GET /api/health -> 200
```

</details>

#### API-BORDA-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é um objeto com ok igual a true | interpretado como: corpo JSON objeto com `ok` booleano true | observado `{"ok":true}` | passou

<details>
<summary>Evidência</summary>

```
GET /api/auth/ok (sem cookie) -> 200 {"ok":true}
```

</details>

#### API-BORDA-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo não traz id, papel nem e-mail de conta nenhuma | esperado ausência de id, role e email, observado só `message` e `statusCode`

<details>
<summary>Evidência</summary>

```
GET /api/v1/session (sem cookie) -> 401 {"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
GET /api/v1/session, Cookie: better-auth.session_token=inventado123.abcdef -> 401 {"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o userId da conta `admin-inicial` | esperado `314MXU7tfVF59VMvCjm0qURxfOaUVRfJ` (id em `user`), observado o mesmo
- ✓ o corpo traz role igual a admin | esperado `admin`, observado `admin`

<details>
<summary>Evidência</summary>

```
GET /api/v1/session com o cookie de sessao-admin -> 200 {"userId":"314MXU7tfVF59VMvCjm0qURxfOaUVRfJ","role":"admin"}
select id from "user" -> 314MXU7tfVF59VMvCjm0qURxfOaUVRfJ
```

</details>

#### API-BORDA-05
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código EMAIL_PASSWORD_SIGN_UP_DISABLED | esperado `EMAIL_PASSWORD_SIGN_UP_DISABLED`, observado o mesmo em `code`
- ✓ nenhuma conta com esse e-mail passa a existir no banco | esperado 0 linhas em `user` com o e-mail, observado 0

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-up/email {"email":"novo@example.com","name":"Novo","password":"<mascarado>"}
-> 400 {"message":"Email and password sign up is not enabled","code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}
select count(*) from "user" where email='novo@example.com' -> 0
```

</details>

#### API-ADMIN-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta define o cookie de sessão com o atributo HttpOnly | interpretado como: cabeçalho `set-cookie` de `better-auth.session_token` com `HttpOnly` | observado `HttpOnly; SameSite=Lax` | passou
- `*` o corpo não contém a senha | interpretado como: o texto de ADMIN_PASSWORD e um campo `password` ausentes da resposta inteira | observado 0 ocorrências; `user` só com name, email, emailVerified, image, createdAt, updatedAt, role, banned, banReason, banExpires e id | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email (e-mail e senha do .env) -> HTTP/1.1 200 OK
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
grep -c <ADMIN_PASSWORD> resposta -> 0; "password" no JSON -> False
```

</details>

#### API-CORS-01
- Veredito: passou
- ✓ o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN | esperado `http://localhost:5173`, observado o mesmo
- ✓ o cabeçalho Access-Control-Allow-Credentials é true | esperado `true`, observado `true`

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://localhost:5173, Access-Control-Request-Method: GET
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

</details>

#### API-CORS-02
- Veredito: passou
- ✓ a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem | esperado ausente ou diferente de `http://outra-origem.example`, observado ausente

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://outra-origem.example
HTTP/1.1 204 No Content
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
(sem Access-Control-Allow-Origin)
```

</details>

#### API-DOCS-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é uma página HTML | interpretado como: `Content-Type: text/html` e corpo começando com doctype HTML | observado `text/html; charset=utf-8` e `<!DOCTYPE html>` do Swagger UI | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs -> HTTP/1.1 200 OK, Content-Type: text/html; charset=utf-8
<!DOCTYPE html> <html lang="en"> <head> <title>Swagger UI</title>
```

</details>

#### API-DOCS-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o campo openapi do corpo começa com 3. | interpretado como: prefixo `3.` em `openapi` | observado `3.0.0` | passou
- `*` os caminhos do documento incluem /api/v1/session | interpretado como: chave em `paths` | observado presente | passou
- `*` os caminhos do documento incluem /api/health | interpretado como: chave em `paths` | observado presente | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs-json -> 200
openapi 3.0.0; paths ['/api/health', '/api/v1/session']
```

</details>

#### API-DOCS-03 *
- Veredito: passou
- `*` a resposta é 404 | interpretado como: a API com NODE_ENV production é o container da imagem de apps/api (o mesmo de CLI-IMAGEM-02), sem modo watch | observado 404 em /api/docs-json, e 404 também em /api/docs | passou

<details>
<summary>Evidência</summary>

```
docker run -d --name eval-fundacao-api-2026-10-30t18-11-26z --network <rede do Compose> --env-file .env -e NODE_ENV=production -p 3100:3000 eval-fundacao-api:2026-10-30t18-11-26z
docker exec <container> printenv NODE_ENV -> production
GET http://localhost:3100/api/docs-json -> 404
GET http://localhost:3100/api/docs -> 404
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- `*` o packageManager da raiz fixa o pnpm na major 12 | interpretado como: `packageManager` com `pnpm@12.` | observado `pnpm@12.16.1` | passou
- `*` o engines.node da raiz exige a major 26 | interpretado como: faixa que só aceita a 26 em diante | observado `>=26.0.0` | passou
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: os pacotes nos globs de `pnpm-workspace.yaml` (apps/*, packages/*), sem a raiz | observado `apps/api`, `apps/web` e `packages/contracts`, de nomes @app/api, @app/web e @app/contracts; `pnpm -r ls` lista também a raiz `app` | passou
- `*` o TypeScript instalado está na major 6 | interpretado como: versão de `typescript/package.json` e `tsc -v` | observado 6.0.3 | passou
- `*` o Turborepo instalado está na major 2 | interpretado como: versão de `turbo/package.json` e `turbo --version` | observado 2.11.10 | passou

<details>
<summary>Evidência</summary>

```
packageManager pnpm@12.16.1; engines {"node":">=26.0.0","pnpm":">=12.0.0"}
pnpm-workspace.yaml packages: apps/*, packages/*
ls apps/*/package.json packages/*/package.json -> apps/api, apps/web, packages/contracts
pnpm -r ls --depth -1 -> ['@app/api', '@app/contracts', '@app/web', 'app']
tsc -v -> Version 6.0.3; turbo --version -> 2.11.10
```

</details>

#### CLI-MONOREPO-02 *
- Veredito: passou
- `*` @app/api declara @app/contracts pelo protocolo workspace: | interpretado como: dependência com valor começando com `workspace:` | observado `workspace:*` em dependencies | passou
- `*` @app/web declara @app/contracts pelo protocolo workspace: | interpretado como: o mesmo | observado `workspace:*` em dependencies | passou

<details>
<summary>Evidência</summary>

```
@app/api dependencies["@app/contracts"] = workspace:*
@app/web dependencies["@app/contracts"] = workspace:*
```

</details>

#### CLI-STACK-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída não contém o aviso de alvo não implementado | esperado ausente, observado 0 ocorrências de "não implementado"
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: linhas com prefixo `<pacote>:lint` dos três | observado `@app/api:lint`, `@app/contracts:lint` e `@app/web:lint` (3 tarefas, do cache local) | passou

<details>
<summary>Evidência</summary>

```
make lint -> código 0
@app/api:lint: $ oxlint src/ test/ && prettier --check . && depcruise src --config .dependency-cruiser.cjs
@app/api:lint: ✔ no dependency violations found (60 modules, 111 dependencies cruised)
Tasks: 3 successful, 3 total; Cached: 3 cached, 3 total
```

</details>

#### CLI-STACK-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` nenhum arquivo versionado fica alterado | interpretado como: `git status --short` igual antes e depois | observado igual (só os dois documentos desta pasta, já alterados antes) | passou

<details>
<summary>Evidência</summary>

```
make format -> código 0; Tasks: 3 successful, 3 total; Cached: 0 cached
diff git status antes/depois -> sem diferença
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: linhas `Test Files ... passed` com prefixo de cada pacote | observado @app/api 6 arquivos, @app/web 1, @app/contracts 2 | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: a migração do script aponta `app_test` e a saída mostra os `*.int-spec.ts` de @app/api passando | observado `PostgreSQL database "app_test"` e 3 arquivos de integração (sign-up, app, seed) passando | passou

<details>
<summary>Evidência</summary>

```
make test -> código 0 (5 tarefas do cache); repetido com TURBO_FORCE=true -> código 0, Cached: 0 cached, 5 total
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
@app/contracts:test: Test Files 2 passed (2)
@app/web:test: Test Files 1 passed (1)
@app/api:test: Test Files 6 passed (6)
@app/api:test: ✓ test/integration/sign-up.int-spec.ts (2 tests)
@app/api:test: ✓ test/integration/app.int-spec.ts (8 tests)
@app/api:test: ✓ test/integration/seed.int-spec.ts (9 tests)
@app/api:test: Test Files 3 passed (3)
```

</details>

#### CLI-STACK-04
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existe o arquivo main.js na pasta dist de apps/api | esperado existente e não vazio, observado 945 bytes
- ✓ existe o arquivo index.html na pasta dist de apps/web | esperado existente e não vazio, observado 453 bytes

<details>
<summary>Evidência</summary>

```
apps/api/dist e apps/web/dist movidas para a pasta da avaliação; ls -> No such file or directory
make build -> código 0; Tasks: 4 successful, 4 total (restauradas do cache local)
apps/api/dist/main.js 945 bytes; apps/web/dist/index.html 453 bytes
```

</details>

#### CLI-STACK-05 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída informa que todas as tarefas vieram do cache local | interpretado como: `Cached: N cached, N total` com N igual ao total e `FULL TURBO` | observado `Cached: 4 cached, 4 total` e `FULL TURBO` | passou

<details>
<summary>Evidência</summary>

```
make build (logo depois do anterior) -> código 0
Tasks: 4 successful, 4 total
Cached: 4 cached, 4 total
Time: 21ms >>> FULL TURBO
```

</details>

#### CLI-AMBIENTE-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis | interpretado como: `docker compose ps` com State running e Health healthy nos cinco | observado os cinco `running healthy` | passou
- `*` o postgres informa versão na major 18 | interpretado como: `show server_version` | observado 18.6 | passou
- `*` o valkey informa versão na major 9 | interpretado como: `valkey_version` de `INFO server` | observado 9.1.3 | passou

<details>
<summary>Evidência</summary>

```
docker compose down -> rede removida; docker compose ps -q -> 0 containers
docker compose up -d --wait -> código 0 em 21,8 s
api running healthy / mailpit running healthy / postgres running healthy / valkey running healthy / web running healthy
show server_version -> 18.6 (Debian 18.6-1.pgdg13+2)
valkey_version:9.1.3
```

</details>

#### CLI-AMBIENTE-02 *
- Veredito: passou
- `*` appendonly é yes | interpretado como: `CONFIG GET appendonly` | observado `yes` | passou
- `*` appendfsync é everysec | interpretado como: `CONFIG GET appendfsync` | observado `everysec` | passou
- `*` maxmemory-policy é noeviction | interpretado como: `CONFIG GET maxmemory-policy` | observado `noeviction` | passou

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
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: depois da edição, linhas `File change detected. Starting incremental compilation...` e `Nest application successfully started` de um PID novo | observado as duas, PID 222 para 269 | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: Id da imagem `app-dev-api:local` e Id do container iguais antes e depois | observado os dois iguais | passou
- ✓ GET /api/health volta a responder 200 depois da nova subida | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
echo "// eval recarga ..." >> apps/api/src/main.ts (no host)
[6:15:27 PM] File change detected. Starting incremental compilation...
[6:15:27 PM] Found 0 errors. Watching for file changes.
{"level":30,...,"pid":269,...,"msg":"Starting Nest application..."}
{"level":30,...,"pid":269,...,"context":"NestApplication","msg":"Nest application successfully started"}
img: sha256:2622eb0d... -> sha256:2622eb0d...; container ae45a93da999 -> ae45a93da999
GET /api/health -> 200; main.ts restaurado da cópia, git status sem alteração em apps/
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- `*` o processo da api termina com código diferente de 0 | interpretado como: o processo da aplicação (o mesmo `node --import ./dist/instrumentation.js dist/main.js` que o `nest start` relança), num container do serviço api com o `.env` sem a linha | observado código 1 | passou
- `*` a saída nomeia BETTER_AUTH_SECRET | interpretado como: o nome na saída | observado `BETTER_AUTH_SECRET (ausente)` | passou
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: nenhum dos valores do `.env` (URLs de banco, Valkey e API, segredo, host SMTP, remetente, e-mail e senha do admin) na saída | observado 0 ocorrências de cada | passou

<details>
<summary>Evidência</summary>

```
sed -i '/^BETTER_AUTH_SECRET=/d' .env; docker compose run --rm --no-deps -T api sh -c 'cd apps/api && exec node --import ./dist/instrumentation.js dist/main.js'
-> código 1
Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
postgresql://app:app@postgres: 0 / redis://valkey: 0 / exemplo-local: 0 / http://localhost:3000: 0 / mailpit: 0 / <ADMIN_PASSWORD>: 0 / admin@example.com: 0 / no-reply@localhost: 0
.env restaurado da cópia
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: as chaves sem default nem `optional` em `envSchema` da API e `VITE_API_URL` da SPA presentes no arquivo | observado NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, SMTP_HOST, SMTP_PORT, SMTP_FROM e VITE_API_URL declaradas | passou
- `*` o `.env` é ignorado pelo git | interpretado como: `git check-ignore -v .env` | observado `.gitignore:2:.env` | passou
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: os valores sensíveis são marcados como de exemplo, e o gitleaks do `make check` passa | observado BETTER_AUTH_SECRET `exemplo-local-troque-...`, ADMIN_PASSWORD de exemplo, credenciais `app:app` do Compose; gitleaks sem achado | passou

<details>
<summary>Evidência</summary>

```
git check-ignore -v .env -> .gitignore:2:.env	.env; git ls-files -> .env.example
chaves do .env.example: NODE_ENV DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL WEB_ORIGIN SMTP_HOST SMTP_PORT SMTP_FROM ADMIN_EMAIL ADMIN_PASSWORD VITE_API_URL
apps/api/src/platform/config/env.ts: obrigatórias NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, SMTP_HOST, SMTP_PORT, SMTP_FROM (PORT e LOG_LEVEL com default; as outras optional)
apps/web/src/lib/env.ts: VITE_API_URL
make check: ok: nenhum segredo encontrado (gitleaks)
```

</details>

#### CLI-CONFIG-03 *
- Veredito: passou
- `*` o processo da api termina com código diferente de 0 | interpretado como: o processo da aplicação num container do serviço api com PORT=70000 no ambiente | observado código 1 | passou
- `*` a saída nomeia PORT | interpretado como: o nome na saída | observado `PORT (inválida: Too big: expected number to be <=65535)` | passou

<details>
<summary>Evidência</summary>

```
docker compose run --rm --no-deps -T -e PORT=70000 api sh -c 'echo PORT=$PORT; cd apps/api && exec node --import ./dist/instrumentation.js dist/main.js'
PORT=70000
Configuração inválida; corrija no .env: PORT (inválida: Too big: expected number to be <=65535)
-> código 1
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` existem as tabelas user, session, account e verification | interpretado como: consulta a `information_schema.tables` | observado as quatro, mais `_prisma_migrations` | passou
- `*` a tabela user tem as colunas role, banned, banReason e banExpires | interpretado como: consulta a `information_schema.columns` | observado as quatro | passou
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: linha em `_prisma_migrations` com `finished_at` preenchido para a única pasta de `prisma/migrations` | observado `20261029000000_init`, concluída | passou

<details>
<summary>Evidência</summary>

```
DROP DATABASE ... WITH (FORCE); CREATE DATABASE eval_fundacao_2026_10_30t18_11_26z -> 0 tabelas em public
make db-setup -> código 0
Applying migration `20261029000000_init` ... All migrations have been successfully applied.
tabelas: _prisma_migrations, account, session, user, verification
colunas de user: banExpires, banReason, banned, role
_prisma_migrations: 20261029000000_init | finished_at não nulo
```

</details>

#### CLI-BANCO-02 *
- Veredito: passou
- `*` prisma está na major 7 | interpretado como: versão instalada em apps/api | observado 7.10.1 | passou
- `*` @prisma/client está na major 7 | interpretado como: o mesmo | observado 7.10.1 | passou
- `*` @prisma/adapter-pg está instalado na major 7 | interpretado como: `version` do package.json em `apps/api/node_modules/@prisma/adapter-pg` | observado 7.10.1 | passou

<details>
<summary>Evidência</summary>

```
apps/api: require('prisma/package.json').version -> 7.10.1
apps/api: require('@prisma/client/package.json').version -> 7.10.1
apps/api/node_modules/@prisma/adapter-pg/package.json "version": "7.10.1"
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- `*` existe exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` em `user` com o e-mail | observado 1 | passou
- `*` essa conta tem papel admin e e-mail verificado | interpretado como: `role` igual a admin e `emailVerified` true | observado admin e t | passou
- `*` essa conta não está banida | interpretado como: `banned` false e `banExpires` nulo | observado f e nulo | passou
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password` da credencial diferente do texto | observado diferente (hash) | passou

<details>
<summary>Evidência</summary>

```
banco vazio; make db-setup -> código 0, seed: primeiro admin criado
count(*) user email=admin@example.com -> 1
role|emailVerified|banned|banExpires is null|password=texto -> admin|t|f|t|f
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` depois | observado 1 | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual antes e depois | observado `65959d38...` nos dois | passou
- `*` nenhuma migração nova é aplicada | interpretado como: linhas em `_prisma_migrations` iguais e a saída do Prisma | observado 1 e 1, `No pending migrations to apply.` | passou

<details>
<summary>Evidência</summary>

```
make db-setup -> código 0
No pending migrations to apply.
seed: primeiro admin já existia com papel admin, e-mail verificado e sem banimento; nada alterado
hash 65959d38f9d1c86bc839ea4ecbd3a718 -> 65959d38f9d1c86bc839ea4ecbd3a718; migrações 1 -> 1; contas 1
```

</details>

#### CLI-ADMIN-03 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia ADMIN_EMAIL | interpretado como: o nome na saída | observado `corrija no .env: ADMIN_EMAIL` | passou
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em `user` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco vazio; .env com ADMIN_EMAIL=
make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL
select count(*) from "user" -> 0
.env restaurado da cópia
```

</details>

#### CLI-ADMIN-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin | interpretado como: mensagem com esse sentido | observado `seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado` | passou
- `*` essa conta continua sem papel admin e com o e-mail não verificado | interpretado como: `role` nulo e `emailVerified` false depois | observado nulo e f | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual antes e depois | observado `6e05e5d7...` nos dois | passou
- `*` continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` | observado 1 | passou

<details>
<summary>Evidência</summary>

```
antes: role is null|emailVerified|banned|md5 -> t|f|f|6e05e5d7dc226ecbdae3701e9f3cc768
make db-setup -> código 2
seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado
depois: t|f|f|6e05e5d7dc226ecbdae3701e9f3cc768; count 1
```

</details>

#### CLI-ADMIN-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que a conta admin com o e-mail de ADMIN_EMAIL está banida | interpretado como: mensagem com esse sentido | observado `seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado` | passou
- ✓ a saída não contém o texto de ADMIN_EMAIL | esperado 0 ocorrências de admin@example.com, observado 0
- `*` essa conta continua banida e com papel admin | interpretado como: `banned` true e `role` admin depois | observado t e admin | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual antes e depois | observado `e115842b...` nos dois | passou

<details>
<summary>Evidência</summary>

```
antes: admin|t|t|t|e115842b02630fc6215f91d2a239e03c (role, emailVerified, banned, banExpires nulo, md5)
make db-setup -> código 2
seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado
grep -c admin@example.com -> 0
depois: admin|t|e115842b02630fc6215f91d2a239e03c
```

</details>

#### CLI-ADMIN-06 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia ADMIN_PASSWORD | interpretado como: o nome na saída | observado `corrija no .env: ADMIN_PASSWORD` | passou
- ✓ a saída não contém o texto de ADMIN_PASSWORD | esperado 0 ocorrências, observado 0
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em `user` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco vazio; .env com ADMIN_PASSWORD de 13 letras sem número
make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_PASSWORD
grep -c <ADMIN_PASSWORD> -> 0; select count(*) from "user" -> 0
.env restaurado da cópia; admin-inicial recriado por make db-setup
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- `*` a linha é um objeto JSON completo | interpretado como: a linha da requisição (marcada por um cabeçalho `x-eval`) passa por `json.loads` | observado objeto válido | passou
- `*` a linha traz um identificador único da requisição, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` presentes | observado `51d16419-...`, 200 e 3 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | esperado 0 ocorrências, observado 0 (`cookie: "[redigido]"`)
- ✓ a linha não contém o valor do cabeçalho authorization | esperado 0 ocorrências, observado 0 (`authorization: "[redigido]"`)

<details>
<summary>Evidência</summary>

```
GET /api/health, Cookie: sessao=<valor de teste>, Authorization: Bearer <valor de teste>, X-Eval: logs01
{"reqid": "51d16419-52b2-4759-a6ac-2964b388a877", "status": 200, "rt": 3, "headers": {"host": "localhost:3000", "user-agent": "curl/8.5.0", "accept": "*/*", "cookie": "[redigido]", "authorization": "[redigido]", "x-eval": "logs01"}}
grep -c <valores> -> 0
```

</details>

#### CLI-LOGS-02 *
- Veredito: passou
- `*` os dois identificadores de requisição são diferentes | interpretado como: `req.id` das duas linhas | observado `bc822a1a-...` e `a0336671-...` | passou
- `*` nenhum dos dois é um número inteiro | interpretado como: tipo do valor no JSON | observado duas strings UUID | passou

<details>
<summary>Evidência</summary>

```
logs02-a 'bc822a1a-f196-4289-a69d-de589e8965a5'
logs02-b 'a0336671-d974-4dfa-9190-493cd1d000eb'
```

</details>

#### CLI-LOGS-03 *
- Veredito: passou
- `*` o e-mail da conta não aparece em nenhuma linha | interpretado como: `docker compose logs api` inteiro desde a subida do container, depois do sign-in 200 | observado 0 ocorrências em 299 linhas | passou
- `*` a senha da conta não aparece em nenhuma linha | interpretado como: o mesmo log | observado 0 ocorrências | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email (admin-inicial) -> 200
container api iniciado em 2026-10-30T18:15:01Z; docker compose logs api -> 299 linhas
grep -c admin@example.com -> 0; grep -c <ADMIN_PASSWORD> -> 0
```

</details>

#### CLI-LOGS-04 *
- Veredito: passou
- `*` a linha registra o caminho /api/health | interpretado como: `req.url` da linha | observado `/api/health` | passou
- ✓ o texto segredo-da-query não aparece na linha | esperado 0 ocorrências, observado 0

<details>
<summary>Evidência</summary>

```
GET /api/health?token=segredo-da-query, X-Eval: logs04
req.url -> /api/health; req.query -> ausente
grep -c segredo-da-query -> 0
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: com OTEL_EXPORTER_OTLP_ENDPOINT ausente no container e 10 GET /api/health com 200, nenhuma linha JSON de nível 40 ou mais, e nenhuma linha com otlp, exporter ou opentelemetry além do comando de subida | observado 0 linhas de aviso ou erro; a única ocorrência de "otel" é `nest start --watch --exec ./bin/node-with-otel.sh` | passou

<details>
<summary>Evidência</summary>

```
docker compose exec api: endpoint=ausente
10 x GET /api/health -> 200 200 200 200 200 200 200 200 200 200
docker compose logs api: níveis >= 40 -> 0
grep -iE 'otlp|export|opentelemetry|otel' -> 15:$ nest start --watch --exec ./bin/node-with-otel.sh --no-shell
```

</details>

#### CLI-OTEL-02 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | interpretado como: POST em `/v1/traces` no receptor, consultado a cada 1 s | observado em 4 s, `POST /v1/traces application/x-protobuf` com 13240 bytes (e um `/v1/logs`) | passou
- ✓ a api continua respondendo 200 em GET /api/health | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
.env + OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318; docker compose up -d --wait api -> Healthy
container -> POST http://host.docker.internal:4318/reach -> 200
GET /api/health -> 200; segundos=4
POST /v1/logs application/x-protobuf 1340
POST /v1/traces application/x-protobuf 13240
GET /api/health -> 200
```

</details>

#### CLI-OTEL-03 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição | interpretado como: POST `/v1/traces` em JSON com um span `GET /api/health` de `url.path` igual a `/api/health` e `url.query` presente | observado em 5 s, span `GET /api/health` com `url.query` igual a `[redigido]` | passou
- `*` o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos | interpretado como: nenhum valor de atributo de nenhum span com o texto, e o corpo inteiro de cada exportação sem ele | observado 0 atributos e 0 ocorrências nos três corpos | passou

<details>
<summary>Evidência</summary>

```
.env + OTEL_EXPORTER_OTLP_PROTOCOL=http/json; api recriada -> Healthy
GET /api/health?token=segredo-da-query -> 200; segundos=5
/v1/logs application/json 2854 (0 ocorrências) / /v1/logs application/json 3081 (0) / /v1/traces application/json 34596 (0)
GET /api/health {'http.request.method': 'GET', 'url.path': '/api/health', 'url.query': '[redigido]', 'http.route': '/api/health'}
atributos com segredo: 0
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a imagem final roda Node na major 26 | interpretado como: `node -v` na imagem | observado v26.13.0 | passou
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `*.ts` fora de `.d.ts` e de node_modules no sistema de arquivos, e sem `src` em /app/apps/api | observado 0 arquivos; /app/apps/api com dist, node_modules e package.json | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhuma pasta `node_modules/@nestjs/cli` na imagem | observado 0 | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api web (memória para a construção)
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-30t18-11-26z . -> código 0 em 74 s
#8 [base 1/3] FROM docker.io/library/node:26-bookworm-slim@sha256:bc0a2afd...
#14 [pruner 2/2] RUN pnpm dlx "turbo@2.11.10" prune @app/api --docker
docker run --rm --entrypoint node <imagem> -v -> v26.13.0
Cmd ["node","--import","./dist/instrumentation.js","dist/main.js"], WorkingDir /app/apps/api
ts_fora_nm=0; nestcli=0; ls /app/apps/api -> dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: passou
- `*` o container segue em execução | interpretado como: `State.Status` running sem reinício | observado running, Restarting false | passou
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha JSON `Nest application successfully started` e nenhuma linha de nível 50 ou mais | observado a linha, nível máximo 30 | passou
- `*` todas as linhas do log do container são objetos JSON | interpretado como: cada linha passa por `json.loads` | observado 21 de 21 | passou
- ✓ GET /api/health nesse container responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
docker run -d --name eval-fundacao-api-2026-10-30t18-11-26z --network ai-template-harness-nestj-react-monorepo_default --env-file .env -e NODE_ENV=production -p 3100:3000 <imagem>
GET :3100/api/auth/ok -> 200 {"ok":true}
GET :3100/api/health -> 200 {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
docker inspect -> running false
docker logs -> 21 linhas, nao_json 0, max_level 30
{"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` no shell da imagem e busca por arquivo `node` em todo o sistema de arquivos | observado não encontrado (código 127) e 0 arquivos | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: GET /uma-rota-qualquer responde 200 com corpo de sha256 igual ao de `/usr/share/nginx/html/index.html` da imagem | observado 200, `text/html`, sha256 `4957a3f4...f554` nos dois, com `<div id="root"></div>` | passou

<details>
<summary>Evidência</summary>

```
container e imagem da API removidos antes; api e web do Compose ainda paradas
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-30t18-11-26z . -> código 0 em 3 s (12 passos CACHED)
docker run --rm --entrypoint sh <imagem> -c 'command -v node; ...' -> which=127, arquivos_node=0
docker run -d --name eval-fundacao-web-2026-10-30t18-11-26z -p 8180:80 <imagem>
GET http://localhost:8180/uma-rota-qualquer -> HTTP/1.1 200 OK, Content-Type: text/html
sha256(corpo)                               4957a3f4d47fc0d8d60e12ae05b04c622a0274e299e4418f266c1313af7bf554
sha256(/usr/share/nginx/html/index.html)    4957a3f4d47fc0d8d60e12ae05b04c622a0274e299e4418f266c1313af7bf554
container e imagem removidos; docker compose up -d --wait api web -> Healthy
```

</details>

#### CLI-CI-01
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída termina com a linha de que todas as verificações passaram | esperado última linha de sucesso, observado `ok: todas as verificações passaram`
- ✓ a saída não contém o aviso de alvo não implementado | esperado ausente, observado 0 ocorrências

<details>
<summary>Evidência</summary>

```
CI=true make check -> código 0; 16 linhas "ok:"
última linha: ok: todas as verificações passaram
grep -ci 'não implementado' -> 0
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | interpretado como: `actions/setup-node` com `node-version: 26` numa linha anterior ao passo `make check` | observado linha 31 a 33, passo `make check` na 55 | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version` (lê o packageManager) antes do passo | observado linha 28, sem `version`, com o comentário que o explica | passou
- `*` toda action do arquivo está fixada por SHA completo com comentário da versão | interpretado como: cada `uses:` com SHA de 40 caracteres e `# vX` | observado as três (checkout v7.0.1, pnpm/action-setup v6.1.0, setup-node v7.1.0); `make check-actions` ok | passou

<details>
<summary>Evidência</summary>

```
21: - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
25: # Sem `version`: a action lê o campo packageManager do package.json raiz.
28:   uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
31:   uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
33:     node-version: 26
55: - name: make check
59:   run: make check
```

</details>

#### CLI-CAMADAS-01 *
- Veredito: passou
- `*` o controller de GET /api/v1/session fica em presentation/get-session | interpretado como: o único arquivo com `@Controller` do módulo está nessa pasta | observado `presentation/get-session/get-session.controller.ts` | passou
- `*` a raiz do módulo tem só o accounts.module.ts, o auth.ts e pastas de camada | interpretado como: listagem da raiz | observado `accounts.module.ts`, `auth.ts` e `presentation/` | passou
- `*` não há pasta além de domain, application, infra e presentation no módulo | interpretado como: pastas de primeiro nível | observado só `presentation` | passou

<details>
<summary>Evidência</summary>

```
ls -p apps/api/src/modules/accounts -> accounts.module.ts auth.ts presentation/
find -type f -> accounts.module.ts, auth.ts, presentation/get-session/{get-session.controller.ts, get-session.controller.spec.ts, session-response.dto.ts}
grep -l "Controller(" -> presentation/get-session/get-session.controller.ts (e o spec)
```

</details>

#### CLI-CAMADAS-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra a análise de dependências de @app/api sem violação | interpretado como: linha do depcruise com prefixo `@app/api:lint` sem violação | observado `✔ no dependency violations found (60 modules, 111 dependencies cruised)` | passou

<details>
<summary>Evidência</summary>

```
make lint (o mesmo de CLI-STACK-01) -> código 0
@app/api:lint: ✔ no dependency violations found (60 modules, 111 dependencies cruised)
```

</details>

#### CLI-CAMADAS-03 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra do `.dependency-cruiser.cjs` na linha de erro | observado `prisma-gerado-so-em-infra-e-platform` e `domain-so-importa-domain` | passou
- `*` a saída cita o arquivo novo de domain/ | interpretado como: caminho na linha de erro | observado `src/modules/accounts/domain/eval-violacao.ts` | passou

<details>
<summary>Evidência</summary>

```
domain/eval-violacao.ts: import type { PrismaClient } from '../../../generated/prisma/client.js';
make lint -> código 2
error prisma-gerado-so-em-infra-e-platform: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
error domain-so-importa-domain: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
x 2 dependency violations (2 errors, 0 warnings). 61 modules, 112 dependencies cruised.
```

</details>

#### CLI-CAMADAS-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra na linha de erro | observado `domain-e-application-nao-importam-platform` e `application-so-importa-domain` | passou
- `*` a saída cita o arquivo novo de application/ | interpretado como: caminho na linha de erro | observado `src/modules/accounts/application/eval-violacao.ts` | passou

<details>
<summary>Evidência</summary>

```
application/eval-violacao.ts: import { PrismaService } from '../../../platform/prisma/prisma.service.js';
make lint -> código 2
error domain-e-application-nao-importam-platform: src/modules/accounts/application/eval-violacao.ts → src/platform/prisma/prisma.service.ts
error application-so-importa-domain: src/modules/accounts/application/eval-violacao.ts → src/platform/prisma/prisma.service.ts
```

</details>

#### CLI-CAMADAS-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra na linha de erro | observado `presentation-nao-importa-infra` | passou
- `*` a saída cita o controller de presentation/get-session | interpretado como: caminho na linha de erro | observado `src/modules/accounts/presentation/get-session/get-session.controller.ts` | passou

<details>
<summary>Evidência</summary>

```
infra/eval-repositorio.ts novo; get-session.controller.ts com import { valorEval } from '../../infra/eval-repositorio.js'
make lint -> código 2
error presentation-nao-importa-infra: src/modules/accounts/presentation/get-session/get-session.controller.ts → src/modules/accounts/infra/eval-repositorio.ts
controller restaurado da cópia
```

</details>

#### CLI-CAMADAS-06 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra na linha de erro | observado `modulo-nao-importa-camadas-de-outro` | passou
- `*` a saída cita o arquivo do segundo módulo | interpretado como: caminho na linha de erro | observado `src/modules/evalsegundo/presentation/eval-violacao.ts` | passou

<details>
<summary>Evidência</summary>

```
modules/evalsegundo/presentation/eval-violacao.ts: import { GetSessionController } from '../../accounts/presentation/get-session/get-session.controller.js';
make lint -> código 2
error modulo-nao-importa-camadas-de-outro: src/modules/evalsegundo/presentation/eval-violacao.ts → src/modules/accounts/presentation/get-session/get-session.controller.ts
```

</details>

#### CLI-CAMADAS-07 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra na linha de erro | observado `platform-nao-importa-modules` | passou
- `*` a saída cita o arquivo novo de platform/ | interpretado como: caminho na linha de erro | observado `src/platform/eval-violacao.ts` | passou

<details>
<summary>Evidência</summary>

```
platform/eval-violacao.ts: import { AccountsModule } from '../modules/accounts/accounts.module.js';
make lint -> código 2
error platform-nao-importa-modules: src/platform/eval-violacao.ts → src/modules/accounts/accounts.module.ts
```

</details>

#### CLI-CAMADAS-08 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra de ciclo | interpretado como: nome de regra de ciclo na linha de erro | observado `sem-ciclo` | passou
- `*` a saída cita os dois arquivos novos | interpretado como: os dois caminhos no erro | observado `src/platform/eval-ciclo-a.ts` e `src/platform/eval-ciclo-b.ts` | passou

<details>
<summary>Evidência</summary>

```
platform/eval-ciclo-a.ts importa ./eval-ciclo-b.js; platform/eval-ciclo-b.ts importa ./eval-ciclo-a.js
make lint -> código 2
error sem-ciclo: src/platform/eval-ciclo-a.ts →
      src/platform/eval-ciclo-b.ts →
      src/platform/eval-ciclo-a.ts
x 1 dependency violations (1 errors, 0 warnings). 62 modules, 113 dependencies cruised.
arquivos removidos; git status sem alteração em apps/
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que não há sessão aberta | interpretado como: texto visível com a mensagem de ausência de sessão em português | observado "Nenhuma sessão aberta." | passou
- ✓ o elemento html tem lang igual a pt-BR | esperado `pt-BR`, observado `pt-BR`
- `*` o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session | interpretado como: as entradas de nível error do console são só a de recurso com 401 em http://localhost:3000/api/v1/session | observado 1 error, `Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session` | passou
- ✓ base visual: nenhuma imagem ou vídeo; 4 elementos visíveis dentro da janela e recebendo o clique no centro | observado 0 problemas
- `*` base visual por screenshot | interpretado como: corte, sobreposição ou layout quebrado no título e no parágrafo | observado título "App" e o parágrafo legíveis, sem corte | passou

<details>
<summary>Evidência</summary>

```
playwright-cli open --browser chromium http://localhost:5173/   (sessão nova; cookie-list: No cookies found)
snapshot: main > heading "App" [level=1] > paragraph: Nenhuma sessão aberta.
eval document.documentElement.lang -> "pt-BR"
requests: [GET] http://localhost:3000/api/v1/session => [401] Unauthorized
console: [INFO] Download the React DevTools ...
         [ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session
base visual: {"imgs":[],"visiveis":4,"problemas":[],"video":0}
screenshot: <tmp>/evaluator-fundacao-2026-10-30T18-11-26Z/ui-inicio-01.png
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- `*` a página mostra que há sessão aberta com o papel admin | interpretado como: texto visível que anuncia a sessão e o papel `admin` | observado "Sessão aberta com o papel admin." | passou
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: toda requisição a http://localhost:3000 termina com status HTTP (sem falha de rede), a resposta traz `access-control-allow-origin` igual à origem da SPA e o console não tem erro | observado GET /api/v1/session 200 com `access-control-allow-origin: http://localhost:5173` e `access-control-allow-credentials: true`; 0 requisições falhas; console com 0 errors | passou
- ✓ base visual: nenhuma imagem ou vídeo; 5 elementos visíveis dentro da janela e recebendo o clique no centro | observado 0 problemas
- `*` base visual por screenshot | interpretado como: corte, sobreposição ou layout quebrado | observado texto completo, sem corte | passou

<details>
<summary>Evidência</summary>

```
sessao-admin refeita: POST /api/auth/sign-in/email -> 200; GET /api/v1/session com o cookie -> {"userId":"TFxPcrrggKMUFgPOdjluwvo6LiJofPC1","role":"admin"}
cookie-set better-auth.session_token <mascarado> --domain=localhost --path=/ --httpOnly --sameSite=Lax
goto http://localhost:5173/
eval document.body.innerText -> "App\n\nSessão aberta com o papel admin."
requests: [GET] http://localhost:3000/api/v1/session => [200] OK
response-headers 22: access-control-allow-credentials: true; access-control-allow-origin: http://localhost:5173
requests FAILED: 0
console: Total messages: 3 (Errors: 0, Warnings: 0)
base visual: {"imgs":[],"visiveis":5,"problemas":[],"video":0}
screenshot: <tmp>/evaluator-fundacao-2026-10-30T18-11-26Z/ui-inicio-02.png
```

</details>

#### UI-INICIO-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível em português que diz que a página não existe | observado título "Página não encontrada" e "O endereço que você abriu não existe neste aplicativo." | passou
- ✓ base visual: nenhuma imagem ou vídeo; 6 elementos visíveis (com o link "Voltar ao início") dentro da janela e recebendo o clique no centro | observado 0 problemas
- `*` base visual por screenshot | interpretado como: corte, sobreposição ou layout quebrado | observado título, parágrafo e link inteiros | passou

<details>
<summary>Evidência</summary>

```
cookie-clear; goto http://localhost:5173/nao-existe
Page URL: http://localhost:5173/nao-existe
eval document.body.innerText -> "Página não encontrada\n\nO endereço que você abriu não existe neste aplicativo.\n\nVoltar ao início"
console: Total messages: 3 (Errors: 0, Warnings: 0)
base visual: {"imgs":[],"visiveis":6,"problemas":[],"video":0}
screenshot: <tmp>/evaluator-fundacao-2026-10-30T18-11-26Z/ui-inicio-03.png
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que o servidor não respondeu | interpretado como: texto visível em português sobre a falta de resposta do servidor | observado título "O servidor não respondeu" e "Não foi possível falar com a API. Tente de novo em alguns instantes." | passou
- `*` a página não fica em branco | interpretado como: `#root` com filhos e texto visível não vazio | observado 1 filho em `#root` e o texto acima | passou
- ✓ base visual: nenhuma imagem ou vídeo; 6 elementos visíveis dentro da janela e recebendo o clique no centro | observado 0 problemas
- `*` base visual por screenshot | interpretado como: corte, sobreposição ou layout quebrado | observado título, parágrafo e link inteiros | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api -> Stopped; GET http://localhost:3000/api/health -> 000 (conexão recusada)
goto http://localhost:5173/
requests: [GET] http://localhost:3000/api/v1/session => [FAILED] net::ERR_CONNECTION_REFUSED
eval document.body.innerText -> "O servidor não respondeu\n\nNão foi possível falar com a API. Tente de novo em alguns instantes.\n\nVoltar ao início"
eval document.getElementById('root').children.length -> 1
base visual: {"imgs":[],"visiveis":6,"problemas":[],"video":0}
screenshot: <tmp>/evaluator-fundacao-2026-10-30T18-11-26Z/ui-inicio-04.png
docker compose up -d --wait api -> Healthy; GET /api/health 200
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: com a raiz aberta e uma marca em `window`, troca-se no host o texto "Nenhuma sessão aberta." de `apps/web/src/routes/root/route.tsx`; o texto novo aparece na página em até 15 s sem nenhum comando de recarga, e a marca em `window` continua lá (sem recarga da página) | observado o texto novo em 1 s e a marca intacta | passou
- ✓ base visual: nenhuma imagem ou vídeo; 4 elementos visíveis dentro da janela e recebendo o clique no centro | observado 0 problemas
- `*` base visual por screenshot | interpretado como: corte, sobreposição ou layout quebrado depois da troca | observado título e o parágrafo novo inteiros | passou

<details>
<summary>Evidência</summary>

```
goto http://localhost:5173/ -> "App\n\nNenhuma sessão aberta."
eval window.__evalMarker = 'antes' -> "antes"
sed no host: "Nenhuma sessão aberta." -> "Nenhuma sessão aberta (recarga eval)." em apps/web/src/routes/root/route.tsx (linha 11)
eval document.body.innerText, a cada 1 s -> apareceu em 1 s: "App\n\nNenhuma sessão aberta (recarga eval)."
eval window.__evalMarker -> "antes"
base visual: {"imgs":[],"visiveis":4,"problemas":[],"video":0}
screenshot: <tmp>/evaluator-fundacao-2026-10-30T18-11-26Z/ui-recarga-01.png
route.tsx restaurado da cópia; git status sem alteração em apps/
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json`, já instaladas no host; o Compose instala nos volumes ao subir |
| Ambiente efêmero e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose up -d --wait`, com `.env` a partir de `.env.example` |
| Banco efêmero e migração | 1 e 5 | contrato (Compose) e `scripts/db-setup.sh`: banco `eval_fundacao_...` no postgres do Compose apontado por `DATABASE_URL`; `make db-setup` migra e cria o admin |
| Banco vazio entre itens | 6 | `DROP DATABASE ... WITH (FORCE)` e `CREATE DATABASE` do banco efêmero |
| Estado persistido | 3 e 6 | spec da fundação, Convenções: `admin-inicial` pelo seed via `make db-setup`; `sessao-admin` por POST /api/auth/sign-in/email; `conta-comum-com-email-do-admin` e `admin-banido` pelo seed seguido de UPDATE em `user` (as factories de `apps/api/test/factories` exigem a aplicação Nest de teste) |
| Gates | 1 | contrato: `make check` e `make build` na raiz, com o `.env` do ambiente efêmero |
| Subida da api com configuração inválida | 5 | `apps/api/package.json` (`start:prod`) e `bin/node-with-otel.sh`: o processo da aplicação num `docker compose run` do serviço api |
| Receptor OTLP | 6 | servidor HTTP em Python na porta 4318 do host; `compose.yaml` documenta `host.docker.internal:4318` |
| Imagens | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` construídos da raiz, um por vez, com api e web do Compose paradas; tags `eval-fundacao-<app>:<execução>` |
| Navegador | 3 | spec, Verificação por superfície: `@playwright/cli` 0.1.22 (ADR-0024) do cache do npx, com o Chromium headless já instalado |
| Limpeza entre itens de UI | 6 | `cookie-clear` e navegação nova; api parada e religada só em UI-INICIO-04 |
| Recarga no desenvolvimento | 5 | edição no host de `apps/api/src/main.ts` e `apps/web/src/routes/root/route.tsx`, restaurados de cópia |
| Base visual | 6 | `eval` no navegador (imagens, caixas na janela, `elementFromPoint`, corte por `overflow`) e screenshot por item |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_fundacao_*`, nenhuma pasta `evaluator-fundacao-*`, nenhum container e nenhuma imagem `eval-fundacao-*` no início.
- Derrubada: completa. Navegador (PID 45108) fechado; receptor OTLP (PID 38359) parado; containers `eval-fundacao-api-...` e `eval-fundacao-web-...` e imagens `eval-fundacao-api:2026-10-30t18-11-26z` e `eval-fundacao-web:2026-10-30t18-11-26z` removidos; banco `eval_fundacao_2026_10_30t18_11_26z` apagado; `.env` removido, como estava antes da avaliação, e api e web recriadas sem ele; arquivos de código editados restaurados; pasta temporária apagada.

## Avisos

- Avaliado com 1 arquivo fora de commit além deste: `docs/features/fundacao/orquestracao.md`, que não é código avaliado.
- As imagens foram construídas uma por vez, com api e web do Compose paradas, por causa da memória da VM do WSL2 (6 GB); a da SPA saiu do cache de construção do Docker (12 passos `CACHED`).
- CLI-IMAGEM-01 e 03 construíram do working tree, não de um clone novo; os únicos arquivos fora de commit eram `.env` e os dois documentos desta pasta.
- Os gates `make check` e `make build`, e o `make lint` e o `make build` dos itens, vieram do cache local do Turborepo; `make test` foi repetido com `TURBO_FORCE=true` para os testes rodarem de fato, e passou.
- CLI-STACK-04 apagou `apps/api/dist` e `apps/web/dist` (movidos para a pasta da avaliação); o `make build` os restaurou do cache, e a api do Compose recompilou o próprio `dist` depois.
- CLI-CONFIG-01 e 03 sobem o processo da aplicação num container do serviço api, não o `nest start --watch` do serviço: no modo watch o processo da aplicação termina com código 1, mas o Nest CLI fica esperando mudança de arquivo, e o container não termina.
- API-DOCS-03 usou o container da imagem de produção de CLI-IMAGEM-02, não o serviço api do Compose com NODE_ENV trocado.
- As requisições a /api/auth/* não aparecem no log da api (nenhuma linha de `sign-in` em CLI-LOGS-03); o item passa, porque pede só a ausência de e-mail e senha.
- `DATABASE_URL` do `.env` apontou para o banco efêmero com o marcador da skill, no mesmo PostgreSQL do Compose, para não tocar o banco `app`.
- `validate.py` do spec-writer avisa que `spec.md` cita o componente 'API NestJS', ausente da tabela de componentes do HLD.

## Motivo do aborto

Nenhum.
