# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-31T19-13-50Z
- Branch: docs/observabilidade-fundacao
- Commit: 8cdd225
- Status: reprovado
- Itens: 80 passou, 1 falhou, 1 bloqueado, 0 manual, 0 pulado, de 82
- Critérios: 21 verificado, 1 reprovado, 1 indeterminado, de 23
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
| Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010). | ✓ verificado | API-BORDA-01, API-BORDA-02, API-BORDA-03, API-BORDA-04, API-ADMIN-01, API-CORS-01, API-CORS-02 |
| Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade). | ✓ verificado | API-SAUDE-01, API-SAUDE-02, API-SAUDE-03 |
| Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018). | ✓ verificado | CLI-LOGS-01, CLI-LOGS-02, CLI-LOGS-03, CLI-LOGS-04 |
| Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019). | ✓ verificado | CLI-OTEL-01, CLI-OTEL-02, CLI-OTEL-03 |
| Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020). | ✓ verificado | API-DOCS-01, API-DOCS-02, API-DOCS-03 |
| SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012). | ✓ verificado | CLI-MONOREPO-02, UI-INICIO-01, UI-INICIO-02, UI-INICIO-03, UI-INICIO-04 |
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | ✗ reprovado | CLI-IMAGEM-02 (falhou: com as variáveis do `.env` a API recusa subir em produção por TRUSTED_PROXIES vazia) |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | ✓ verificado | CLI-CI-01, CLI-CI-02 |
| Regra de dependência na API: Módulo Contas nas camadas da Clean Architecture e dependency-cruiser no lint de apps/api barrando import entre camadas, entre módulos e ciclos (ADR-0025, ADR-0026). | ✓ verificado | CLI-CAMADAS-01, CLI-CAMADAS-02, CLI-CAMADAS-03, CLI-CAMADAS-04, CLI-CAMADAS-05, CLI-CAMADAS-06, CLI-CAMADAS-07, CLI-CAMADAS-08 |
| Correlação de logs e traces: com a exportação ligada, as linhas de log da API trazem o trace_id e o span_id do span ativo (ADR-0018, ADR-0019). | ✓ verificado | CLI-OTEL-04, CLI-OTEL-05 |
| Tracing de filas: contexto W3C propagado do enfileiramento ao processamento em toda fila do BullMQ, ligado no módulo de filas da plataforma (HLD, Observabilidade; ADR-0015, ADR-0019). | ✓ verificado | CLI-FILA-01 |
| Métricas de componente: requisições HTTP por rota e status, pool do PostgreSQL, memória do Valkey, estado do health check e, por fila do BullMQ, jobs por estado, idade do job pendente mais antigo e falhas por tentativa (HLD, Observabilidade; ADR-0019). | ✓ verificado | CLI-METRICAS-01, CLI-METRICAS-02, CLI-METRICAS-03, CLI-FILA-02, CLI-FILA-03 |
| Métricas de negócio: Meter da aplicação em platform/ com a convenção de nome app.<domínio>.<medida>, onde cada RF registra as suas (HLD, Observabilidade). | ✓ verificado | CLI-METRICAS-04 |
| Fila de diagnóstico: fila e rota anônima POST /api/diagnostics/jobs, ligadas só por DIAGNOSTICS_ENABLED e fora de produção, para exercitar a telemetria de filas sem depender de módulo de funcionalidade (HLD, Observabilidade). | ✓ verificado | API-DIAG-01, API-DIAG-02, API-DIAG-03, API-DIAG-04 |
| Backend local de observabilidade: serviço do Compose no perfil observability que recebe OTLP da API e guarda traces, métricas e logs com amostragem de 100 por cento (HLD, Observabilidade; ADR-0029). | ⊘ indeterminado | CLI-BACKEND-01 (bloqueado: porta 3001 do host ocupada por um processo do Windows) |
| Painéis e alertas como código: painel por interface, painel das filas e os quatro alertas do HLD, provisionados no backend local a partir de arquivos versionados (HLD, Dashboards e alertas; ADR-0029). | ✓ verificado | CLI-PAINEIS-01, CLI-ALERTAS-01, CLI-ALERTAS-02, CLI-ALERTAS-03, CLI-ALERTAS-04 |
| Amostragem do destino: configuração de referência do coletor com 10 por cento dos traces e 100 por cento dos traces com erro (HLD, Tracing). | ✓ verificado | CLI-AMOSTRAGEM-02 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (17 linhas `ok`, lint e test do Turborepo do cache local, `FULL TURBO`; última linha `ok: todas as verificações passaram`)
- ✓ build: `make build`, código 0 (4 tarefas, 3 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, apontada para o banco efêmero `eval_fundacao_2026_10_31t19_13_50z`
- ✓ SPA Web: http://localhost:5173, serviço web saudável
- ✓ PostgreSQL: serviço postgres saudável, banco efêmero criado nele
- ✓ Redis (serviço Valkey): serviço valkey saudável; `checks.valkey` igual a `up`
- ✓ Mailpit: serviço mailpit saudável
- ✓ Backend de observabilidade local no perfil observability: `docker compose --profile observability up -d --wait` sai com código 1 porque a porta 127.0.0.1:3001 do host está ocupada (ver CLI-BACKEND-01); para os demais itens do backend, o mesmo serviço subiu com um arquivo de override fora do repositório que só troca a porta publicada para 127.0.0.1:3002 (imagem, volumes e healthcheck iguais); saudável em 12 s, Grafana `/api/health` com `database: ok`

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (código 0, `seed: primeiro admin criado`) no banco efêmero; conferido: admin@example.com com role admin, emailVerified t, banned f, banExpires nulo, credencial `credential` com hash de 161 caracteres. Recriado do mesmo jeito depois dos itens que esvaziam o banco
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial` (200, `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`); conferido: GET /api/v1/session com o cookie respondeu 200 com o userId e role admin. Refeita antes de UI-INICIO-02
- ✓ `conta-comum-com-email-do-admin`: `make db-setup` no banco vazio com ADMIN_PASSWORD trocada por outra senha e depois `role` nulo e `emailVerified` false por SQL; conferido: role nulo, emailVerified f, banned f
- ✓ `admin-banido`: `make db-setup` no banco vazio e depois `banned` true e `banExpires` nulo por SQL; conferido: role admin, emailVerified t, banned t, banExpires nulo, credencial da senha de ADMIN_PASSWORD

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD de exemplo (letras e números, 9 caracteres), NODE_ENV=development, OTEL_EXPORTER_OTLP_ENDPOINT ausente; DATABASE_URL apontada para o banco efêmero (o `.env` da pessoa foi guardado e restaurado no fim)
- ✓ OTEL_EXPORTER_OTLP_PROTOCOL: `http/json` só em CLI-OTEL-03, CLI-OTEL-04, Telemetria de filas e Métricas; ausente em CLI-OTEL-02 (protocolo padrão, `application/x-protobuf` no receptor)
- ✓ DIAGNOSTICS_ENABLED e DIAGNOSTICS_WORKER_ENABLED: ausentes salvo nos itens que os pedem (`printenv` no container da api sem nenhuma das duas fora deles)
- ✓ OTEL_EXPORTER_OTLP_ENDPOINT nos itens com o backend: `http://observability:4318`, protocolo padrão
- ✓ Docker 28.5.1 com Compose v2.40.0, ShellCheck, actionlint, gitleaks e Python 3.13.14 instalados

### Dependências externas
- ✓ Coletor OTLP: receptor HTTP em Python na porta 4318 do host, que aceita qualquer requisição e grava método, caminho, horário, tipo e corpo (com chunked e gzip); a api o alcança por `http://host.docker.internal:4318`. Nos itens do backend, o próprio backend local

## Itens

### API HTTP

#### API-SAUDE-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo informa status ok | interpretado como: `status` igual a `ok` | observado `ok` | passou
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
- `*` o corpo informa postgres up | interpretado como: `checks.postgres` igual a `up`, em requisições a cerca de 3, 15, 30 e 60 s da parada | observado `up` nas quatro | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey -> Stopped
+3 s  GET /api/health -> 503 (1,51 s) {"status":"error","checks":{"postgres":"up","valkey":"down"}}
+15 s, +30 s, +60 s -> 503, mesmo corpo, postgres up
docker compose up -d --wait valkey -> Healthy; GET /api/health -> 200
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
GET /api/v1/session, Cookie: better-auth.session_token=sessao-inventada -> 401 {"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo traz o userId da conta `admin-inicial` | interpretado como: `userId` igual ao `id` da linha de `user` com o e-mail de ADMIN_EMAIL | observado `nw9UgLlqjN5e3koKzOovLXoDhEKB5cew` nos dois | passou
- `*` o corpo traz role igual a admin | interpretado como: campo `role` igual a `admin` | observado `admin` | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/session, cookie de sessao-admin -> 200 {"userId":"nw9UgLlqjN5e3koKzOovLXoDhEKB5cew","role":"admin"}
select id,email,role from "user" -> nw9UgLlqjN5e3koKzOovLXoDhEKB5cew|admin@example.com|admin
```

</details>

#### API-ADMIN-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta define o cookie de sessão com o atributo HttpOnly | interpretado como: `set-cookie` de `better-auth.session_token` com `HttpOnly` | observado `HttpOnly; SameSite=Lax` | passou
- `*` o corpo não contém a senha | interpretado como: o texto de ADMIN_PASSWORD ausente do corpo | observado 0 ocorrências | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email {"email":"admin@example.com","password":"<ADMIN_PASSWORD>"} -> 200
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
corpo: {"redirect":false,"token":"<mascarado>","user":{"name":"admin","email":"admin@example.com","emailVerified":true,...,"role":"admin","banned":false,...}}
ocorrências do texto da senha no corpo: 0
```

</details>

#### API-CORS-01
- Veredito: passou
- ✓ o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN | esperado `http://localhost:5173`, observado `http://localhost:5173`
- ✓ o cabeçalho Access-Control-Allow-Credentials é true | esperado `true`, observado `true`

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://localhost:5173 -> 204
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

</details>

#### API-CORS-02
- Veredito: passou
- ✓ a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem | esperado ausência, observado sem Access-Control-Allow-Origin

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session, Origin: http://outra-origem.example -> 204
Vary: Origin, Access-Control-Request-Headers
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

</details>

#### API-DOCS-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é uma página HTML | interpretado como: `content-type` text/html e `<!DOCTYPE html>` no corpo | observado `text/html; charset=utf-8` e a página do Swagger UI | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs -> 200, Content-Type: text/html; charset=utf-8
<!DOCTYPE html> ... <title>Swagger UI</title>
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
GET /api/docs-json -> 200; openapi 3.0.0; paths ['/api/health', '/api/v1/session']
```

</details>

#### API-DOCS-03
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404

<details>
<summary>Evidência</summary>

```
container da imagem de CLI-IMAGEM-01 com NODE_ENV=production (e TRUSTED_PROXIES=172.16.0.0/12, exigida em produção), porta 3100
GET http://localhost:3100/api/docs-json -> 404
```

</details>

#### API-DIAG-01 *
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404
- `*` o Valkey não tem fila chamada diagnostics | interpretado como: nenhuma chave `*diagnostics*` no Valkey | observado 0 chaves | passou

<details>
<summary>Evidência</summary>

```
printenv no container da api: 0 variáveis DIAGNOSTICS_* ou OTEL_*
POST /api/diagnostics/jobs {"outcome":"succeed"} -> 404 {"message":"Cannot POST /api/diagnostics/jobs","error":"Not Found","statusCode":404}
valkey-cli --scan --pattern '*diagnostics*' -> 0 chaves
```

</details>

#### API-DIAG-02 *
- Veredito: passou
- ✓ a resposta é 202 | esperado 202, observado 202
- `*` o corpo traz o jobId | interpretado como: campo `jobId` presente | observado `"1"` | passou
- ✓ em até 10 segundos o job com esse id está concluído na fila diagnostics do Valkey | esperado o id em `bull:diagnostics:completed` em até 10 s, observado em 199 ms, `returnvalue` `{"outcome":"succeed"}`

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_ENABLED=true, NODE_ENV=development; fila sem chaves
POST /api/diagnostics/jobs {"outcome":"succeed"} -> 202 {"jobId":"1"}
zscore bull:diagnostics:completed 1 -> 1793474269298 (199 ms)
hmget bull:diagnostics:1 data returnvalue -> {"outcome":"succeed"} {"outcome":"succeed"}
```

</details>

#### API-DIAG-03 *
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404
- `*` o Valkey não tem fila chamada diagnostics | interpretado como: nenhuma chave `*diagnostics*` no Valkey depois da requisição | observado 0 chaves (só `bull:email.send:*`) | passou

<details>
<summary>Evidência</summary>

```
container da imagem de produção com NODE_ENV=production, DIAGNOSTICS_ENABLED=true e TRUSTED_PROXIES=172.16.0.0/12; fila sem chaves antes
POST http://localhost:3100/api/diagnostics/jobs {"outcome":"succeed"} -> 404 {"message":"Cannot POST /api/diagnostics/jobs",...}
valkey-cli --scan --pattern '*diagnostics*' -> 0; filas presentes: email.send
```

</details>

#### API-DIAG-04 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` nenhum job novo entra na fila diagnostics | interpretado como: contador `bull:diagnostics:id` igual antes e depois e `wait` vazia | observado `1` e `1`, `llen wait` 0 | passou

<details>
<summary>Evidência</summary>

```
POST /api/diagnostics/jobs {"outcome":"explodir"} -> 400 {"message":"O corpo deve ser { \"outcome\": \"succeed\" } ou { \"outcome\": \"fail\" }","error":"Bad Request","statusCode":400}
get bull:diagnostics:id antes 1, depois 1; llen bull:diagnostics:wait 0
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- `*` o packageManager da raiz fixa o pnpm na major 12 | interpretado como: `packageManager` começa com `pnpm@12.` | observado `pnpm@12.16.1` | passou
- `*` o engines.node da raiz exige a major 26 | interpretado como: faixa que só aceita a 26 ou acima | observado `>=26.0.0` | passou
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: pacotes do workspace além da raiz | observado `@app/api`, `@app/contracts`, `@app/web` (raiz `app`) | passou
- `*` o TypeScript instalado está na major 6 | interpretado como: `tsc --version` | observado `6.0.3` | passou
- `*` o Turborepo instalado está na major 2 | interpretado como: `turbo --version` | observado `2.11.10` | passou

<details>
<summary>Evidência</summary>

```
package.json: packageManager pnpm@12.16.1, engines {"node":">=26.0.0","pnpm":">=12.0.0"}
pnpm -r ls: ['@app/api', '@app/contracts', '@app/web', 'app']
pnpm exec tsc --version -> Version 6.0.3; pnpm exec turbo --version -> 2.11.10
```

</details>

#### CLI-MONOREPO-02 *
- Veredito: passou
- `*` @app/api declara @app/contracts pelo protocolo workspace: | interpretado como: versão declarada começa com `workspace:` | observado `workspace:*` | passou
- `*` @app/web declara @app/contracts pelo protocolo workspace: | interpretado como: idem | observado `workspace:*` | passou

<details>
<summary>Evidência</summary>

```
apps/api/package.json @app/contracts: workspace:*
apps/web/package.json @app/contracts: workspace:*
```

</details>

#### CLI-STACK-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída não contém o aviso de alvo não implementado | esperado ausência, observado 0 ocorrências de "não implementado"
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: tarefas `<pacote>:lint` na saída | observado as três | passou

<details>
<summary>Evidência</summary>

```
make lint -> código 0
@app/api:lint, @app/contracts:lint, @app/web:lint
@app/api:lint: ✔ no dependency violations found (116 modules, 298 dependencies cruised)
Tasks: 3 successful, 3 total (Cached: 3 cached)
```

</details>

#### CLI-STACK-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` nenhum arquivo versionado fica alterado | interpretado como: `git status --porcelain` igual antes e depois | observado igual (só os dois documentos desta pasta, já alterados antes) | passou

<details>
<summary>Evidência</summary>

```
git status --porcelain antes: M docs/features/fundacao/avaliacao.md, M docs/features/fundacao/orquestracao.md
make format -> código 0 (3 tarefas, 0 do cache)
git status --porcelain depois: igual
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: sumário do Vitest de cada pacote | observado api 22 arquivos/101 testes, web 2/14, contracts 3/18 | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: `prisma migrate deploy` em `app_test` e arquivos `*.int-spec.ts` executados | observado `PostgreSQL database "app_test"` e 7 arquivos/50 testes de integração | passou

<details>
<summary>Evidência</summary>

```
TURBO_FORCE=true make test -> código 0 (5 tarefas, 0 do cache)
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
@app/contracts:test: Test Files 3 passed, Tests 18 passed
@app/web:test: Test Files 2 passed, Tests 14 passed
@app/api:test: Test Files 22 passed, Tests 101 passed
@app/api:test: ✓ test/integration/diagnostics.int-spec.ts (4 tests) ... Test Files 7 passed, Tests 50 passed
```

</details>

#### CLI-STACK-04
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existe o arquivo main.js na pasta dist de apps/api | esperado existente e não vazio, observado 945 bytes
- ✓ existe o arquivo index.html na pasta dist de apps/web | esperado existente e não vazio, observado 527 bytes

<details>
<summary>Evidência</summary>

```
conteúdo de apps/api/dist e as pastas apps/web/dist e packages/contracts/dist movidos para a pasta da avaliação; apps/api/dist vazio, os outros dois inexistentes
make build -> código 0 (4 tarefas, do cache)
apps/api/dist/main.js 945 bytes; apps/web/dist/index.html 527 bytes
```

</details>

#### CLI-STACK-05 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída informa que todas as tarefas vieram do cache local | interpretado como: `Cached: N cached, N total` com N igual ao total | observado `Cached: 4 cached, 4 total`, `FULL TURBO` | passou

<details>
<summary>Evidência</summary>

```
make build (segunda vez) -> código 0
Tasks: 4 successful, 4 total
Cached: 4 cached, 4 total >>> FULL TURBO
```

</details>

#### CLI-AMBIENTE-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis | interpretado como: `docker compose ps` com os cinco `healthy` | observado os cinco `Up (healthy)` | passou
- `*` o postgres informa versão na major 18 | interpretado como: `postgres --version` | observado `18.6` | passou
- `*` o valkey informa versão na major 9 | interpretado como: `valkey-server --version` | observado `v=9.1.3` | passou

<details>
<summary>Evidência</summary>

```
docker compose --profile observability down; docker compose down; docker compose ps -q -> 0
docker compose up -d --wait -> código 0 em 22 s
api/mailpit/postgres/valkey/web: Up (healthy)
postgres (PostgreSQL) 18.6; Valkey server v=9.1.3
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
valkey-cli config get appendonly -> yes; appendfsync -> everysec; maxmemory-policy -> noeviction
```

</details>

#### CLI-AMBIENTE-03 *
- Veredito: passou
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: "File change detected" e "Nest application successfully started" depois da edição | observado os dois | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: id da imagem do container igual antes e depois | observado `97e034f7d864` nos dois | passou
- `*` GET /api/health volta a responder 200 depois da nova subida | interpretado como: 200 em até 180 s | observado 200 | passou

<details>
<summary>Evidência</summary>

```
comentário acrescentado a apps/api/src/main.ts no host (restaurado de cópia depois)
File change detected. Starting incremental compilation... / Found 0 errors. / Nest application successfully started
imagem do container api antes e depois: sha256:97e034f7d864...
GET /api/health -> 200
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia BETTER_AUTH_SECRET | esperado presente, observado presente
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: nenhum valor do `.env` na saída | observado 0 ocorrências de cada valor conferido | passou

<details>
<summary>Evidência</summary>

```
.env sem BETTER_AUTH_SECRET; docker compose run --rm -T --no-deps api sh -c 'cd apps/api && node dist/main.js' -> código 1
Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
ocorrências: postgresql://app:app 0, redis://valkey 0, senha do admin 0, segredo de exemplo 0, mailpit 0, admin@example.com 0, localhost:5173 0, localhost:3000 0, no-reply 0
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: as chaves obrigatórias do esquema de `apps/api/src/platform/config/env.ts` e as `VITE_*` usadas na SPA definidas no arquivo | observado NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, TRUSTED_PROXIES, SMTP_HOST, SMTP_PORT, SMTP_FROM, ADMIN_EMAIL, ADMIN_PASSWORD e VITE_API_URL (PORT tem padrão e vem do Compose) | passou
- ✓ o `.env` é ignorado pelo git | esperado ignorado, observado `.gitignore:2:.env`
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: valores de exemplo e hosts do Compose | observado segredo `exemplo-local-troque-...`, senha `app` do Compose, admin de exemplo | passou

<details>
<summary>Evidência</summary>

```
chaves definidas no .env.example: NODE_ENV DATABASE_URL REDIS_URL BETTER_AUTH_SECRET BETTER_AUTH_URL WEB_ORIGIN TRUSTED_PROXIES SMTP_HOST SMTP_PORT SMTP_FROM ADMIN_EMAIL ADMIN_PASSWORD VITE_API_URL
import.meta.env na SPA: VITE_API_URL
git check-ignore -v .env -> .gitignore:2:.env
```

</details>

#### CLI-CONFIG-03
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | esperado diferente de 0, observado 1
- ✓ a saída nomeia PORT | esperado presente, observado presente

<details>
<summary>Evidência</summary>

```
docker compose run --rm -T --no-deps -e PORT=70000 api sh -c 'cd apps/api && node dist/main.js' -> código 1
Configuração inválida; corrija no .env: PORT (inválida: Too big: expected number to be <=65535)
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` existem as tabelas user, session, account e verification | interpretado como: `pg_tables` do schema public | observado as quatro e `_prisma_migrations` | passou
- `*` a tabela user tem as colunas role, banned, banReason e banExpires | interpretado como: `information_schema.columns` | observado as quatro | passou
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: linha concluída em `_prisma_migrations` | observado `20261029000000_init`, finished_at preenchido | passou

<details>
<summary>Evidência</summary>

```
banco efêmero recriado vazio (0 tabelas); make db-setup -> código 0
Applying migration `20261029000000_init`; seed: primeiro admin criado
tabelas: _prisma_migrations, account, session, user, verification
colunas de user: banned, banExpires, role, banReason
_prisma_migrations: 20261029000000_init|t
```

</details>

#### CLI-BANCO-02 *
- Veredito: passou
- `*` prisma está na major 7 | interpretado como: versão do pacote instalado em apps/api | observado `7.10.1` | passou
- `*` @prisma/client está na major 7 | interpretado como: idem | observado `7.10.1` | passou
- `*` @prisma/adapter-pg está instalado na major 7 | interpretado como: idem | observado `7.10.1` | passou

<details>
<summary>Evidência</summary>

```
apps/api/node_modules/<pacote>/package.json: prisma 7.10.1, @prisma/client 7.10.1, @prisma/adapter-pg 7.10.1
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- `*` existe exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` em `user` | observado 1 | passou
- `*` essa conta tem papel admin e e-mail verificado | interpretado como: `role` admin e `emailVerified` true | observado `admin` e `t` | passou
- `*` essa conta não está banida | interpretado como: `banned` false e `banExpires` nulo | observado `f` e nulo | passou
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password` diferente do texto | observado hash de 161 caracteres, diferente | passou

<details>
<summary>Evidência</summary>

```
mesmo make db-setup de CLI-BANCO-01 (banco vazio)
count(*) user com admin@example.com -> 1
role|emailVerified|banned|banExpires|providerId|length(password)|password=texto -> admin|t|f||credential|161|f
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` | observado 1 | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash e `updatedAt` iguais | observado `f97a249f...` e o mesmo `updatedAt` | passou
- ✓ nenhuma migração nova é aplicada | esperado 1 linha em `_prisma_migrations` antes e depois, observado 1 e 1, `No pending migrations to apply.`

<details>
<summary>Evidência</summary>

```
make db-setup -> código 0
No pending migrations to apply.
seed: primeiro admin já existia com papel admin, e-mail verificado e sem banimento; nada alterado
md5(password)/updatedAt antes f97a249f0bd80baeacf419f477e3cc50/2026-10-31 19:20:35.005, depois igual
```

</details>

#### CLI-ADMIN-03 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- ✓ a saída nomeia ADMIN_EMAIL | esperado presente, observado presente
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em `user` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco vazio, ADMIN_EMAIL= no .env; make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL
count(*) user -> 0
```

</details>

#### CLI-ADMIN-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin | interpretado como: mensagem do seed com esse sentido | observado `já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado` | passou
- `*` essa conta continua sem papel admin e com o e-mail não verificado | interpretado como: `role` nulo e `emailVerified` false | observado nulo e `f` | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual | observado `b465aab6...` antes e depois | passou
- `*` continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | interpretado como: `count(*)` | observado 1 | passou

<details>
<summary>Evidência</summary>

```
estado: conta-comum-com-email-do-admin (role nulo, emailVerified f, banned f, senha diferente de ADMIN_PASSWORD)
make db-setup -> código 2
seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado
role is null|emailVerified -> t|f; md5 antes/depois b465aab65387199afcc90d75504b2da6; count -> 1
```

</details>

#### CLI-ADMIN-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída diz que a conta admin com o e-mail de ADMIN_EMAIL está banida | interpretado como: mensagem do seed com esse sentido | observado `a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado` | passou
- ✓ a saída não contém o texto de ADMIN_EMAIL | esperado ausência, observado 0 ocorrências de `admin@example.com`
- `*` essa conta continua banida e com papel admin | interpretado como: `banned` true e `role` admin | observado `t` e `admin` | passou
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual | observado `5f0cecaf...` antes e depois | passou

<details>
<summary>Evidência</summary>

```
estado: admin-banido (role admin, emailVerified t, banned t, banExpires nulo)
make db-setup -> código 2
seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado
ocorrências de admin@example.com na saída: 0; role|banned -> admin|t; md5 antes/depois 5f0cecafb1b84a7c53e2d29ac7fc3a2a
```

</details>

#### CLI-ADMIN-06 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- ✓ a saída nomeia ADMIN_PASSWORD | esperado presente, observado presente
- ✓ a saída não contém o texto de ADMIN_PASSWORD | esperado ausência, observado 0 ocorrências
- `*` nenhuma conta existe no banco | interpretado como: `count(*)` em `user` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
banco vazio, ADMIN_PASSWORD com 13 letras e sem número; make db-setup -> código 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_PASSWORD
ocorrências do texto da senha: 0; count(*) user -> 0
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- `*` a linha é um objeto JSON completo | interpretado como: `json.loads` da linha | observado objeto válido | passou
- `*` a linha traz um identificador único da requisição, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` | observado UUID, 200 e 2 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | esperado ausência, observado `"cookie":"[redigido]"`
- ✓ a linha não contém o valor do cabeçalho authorization | esperado ausência, observado `"authorization":"[redigido]"`

<details>
<summary>Evidência</summary>

```
GET /api/health com Cookie e Authorization de valores marcados (User-Agent eval-logs01)
req.id 82980ae4-b9cf-4681-a114-324ef1b271f6, res.statusCode 200, responseTime 2
headers.cookie "[redigido]", headers.authorization "[redigido]"; ocorrências dos dois valores: 0
```

</details>

#### CLI-LOGS-02 *
- Veredito: passou
- `*` os dois identificadores de requisição são diferentes | interpretado como: `req.id` das duas linhas do item (User-Agent marcado) | observado UUIDs distintos | passou
- `*` nenhum dos dois é um número inteiro | interpretado como: não casam com `^\d+$` | observado UUIDs | passou

<details>
<summary>Evidência</summary>

```
duas GET /api/health em sequência (User-Agent eval-logs02)
['3b2242c2-1741-4620-9ada-323125aabadb', 'a182bac6-492a-4ba8-9d93-f9c1d52627c7']
```

</details>

#### CLI-LOGS-03 *
- Veredito: passou
- `*` o e-mail da conta não aparece em nenhuma linha | interpretado como: busca de `admin@example.com` no log inteiro da api desde a subida do container | observado 0 em 709 linhas | passou
- `*` a senha da conta não aparece em nenhuma linha | interpretado como: busca do texto de ADMIN_PASSWORD | observado 0 | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email -> 200
docker compose logs api (desde a subida): 709 linhas; e-mail 0; senha 0; linhas com sign-in 0
```

</details>

#### CLI-LOGS-04 *
- Veredito: passou
- `*` a linha registra o caminho /api/health | interpretado como: `req.url` igual a `/api/health` | observado `/api/health` | passou
- ✓ o texto segredo-da-query não aparece na linha | esperado ausência, observado 0 ocorrências

<details>
<summary>Evidência</summary>

```
GET /api/health?token=segredo-da-query -> linha com "url":"/api/health"; ocorrências de segredo-da-query: 0
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: nenhuma linha de nível 40 ou mais, e nenhuma linha citando OTLP, exportação ou OpenTelemetry além da inicialização do módulo | observado nenhuma linha de nível 40+, só `TelemetryModule dependencies initialized` | passou

<details>
<summary>Evidência</summary>

```
printenv | grep -cE 'OTEL_|DIAG' -> 0; api recriada; 10 x GET /api/health -> 200
37 linhas JSON desde a subida; nível 40/50/60: 0
única linha com telemetr: {"level":30,...,"context":"InstanceLoader","msg":"TelemetryModule dependencies initialized"}
```

</details>

#### CLI-OTEL-02 *
- Veredito: passou
- ✓ em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | esperado POST /v1/traces em até 30 s, observado em cerca de 1 s
- `*` a api continua respondendo 200 em GET /api/health | interpretado como: nova requisição depois da exportação | observado 200 | passou

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318 (protocolo padrão)
GET /api/health -> 200; receptor: POST /v1/traces application/x-protobuf, POST /v1/logs application/x-protobuf
GET /api/health -> 200
```

</details>

#### CLI-OTEL-03 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição | interpretado como: span de servidor `GET /api/health` com o User-Agent do item | observado em menos de 10 s, trace `0a420bf2...` | passou
- `*` o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos | interpretado como: busca no JSON de todos os spans recebidos | observado 0 ocorrências em 150 spans; `url.query` igual a `[redigido]` | passou

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
GET /api/health?token=segredo-da-query (User-Agent eval-otel03) -> 200
span kind 2 GET /api/health trace 0a420bf23e23973b9b3b9710c18c4cc8 {'url.scheme': 'http', 'url.path': '/api/health', 'url.query': '[redigido]', 'http.route': '/api/health'}
ocorrências de segredo-da-query nos 150 spans: 0
```

</details>

#### CLI-OTEL-04 *
- Veredito: passou
- `*` a linha do log da api referente a essa requisição traz trace_id e span_id | interpretado como: campos `trace_id` e `span_id` na linha | observado `260b2f2f...` e `f5117930...` | passou
- `*` em até 30 segundos o receptor registra um span de servidor dessa requisição com o mesmo trace_id da linha de log | interpretado como: span kind 2 com o mesmo traceId | observado `GET /api/health`, traceId e spanId iguais aos do log, em menos de 10 s | passou

<details>
<summary>Evidência</summary>

```
linha do log (User-Agent eval-otel04): trace_id 260b2f2f88d012dc2bc3758a13b64cdd, span_id f5117930133cefaa
receptor: SERVER GET /api/health 260b2f2f88d012dc2bc3758a13b64cdd f5117930133cefaa
```

</details>

#### CLI-OTEL-05 *
- Veredito: passou
- `*` a linha do log da api referente a essa requisição não traz trace_id | interpretado como: chave ausente | observado ausente | passou
- `*` a linha do log da api referente a essa requisição não traz span_id | interpretado como: chave ausente | observado ausente | passou

<details>
<summary>Evidência</summary>

```
sem OTEL_EXPORTER_OTLP_ENDPOINT; linha de eval-otel05, chaves: ['hostname', 'level', 'msg', 'pid', 'req', 'res', 'responseTime', 'time']
```

</details>

#### CLI-FILA-01 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra o span de servidor dessa requisição | interpretado como: span kind 2 `POST /api/diagnostics/jobs` | observado em cerca de 5 s, trace `906efe8e...` | passou
- `*` o receptor registra um span de produtor da fila diagnostics com o mesmo trace_id do span de servidor | interpretado como: span kind 4 com `bullmq.queue.name` diagnostics no mesmo trace | observado `add diagnostics.run` | passou
- `*` o receptor registra um span de consumidor da fila diagnostics com o mesmo trace_id, filho do span de produtor | interpretado como: span kind 5 no mesmo trace com `parentSpanId` igual ao spanId do produtor | observado `process diagnostics`, parent `b1bd0e2b6bb11854` | passou
- `*` nenhum atributo desses spans contém o corpo do job | interpretado como: nenhum atributo dos 28 spans do trace com `outcome` ou `succeed` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
fila sem chaves; POST /api/diagnostics/jobs {"outcome":"succeed"} -> 202 {"jobId":"1"}
SERVER POST /api/diagnostics/jobs 906efe8e2763dc2b13c5daf93e86e65b 1d108bb2741ff50f
PRODUCER add diagnostics.run b1bd0e2b6bb11854 parent e55efe9462aa7b17 {'bullmq.queue.name':'diagnostics','bullmq.queue.operation':'add','bullmq.job.name':'run','bullmq.job.id':'1'}
CONSUMER process diagnostics 17df9dd54f9a9b29 parent b1bd0e2b6bb11854 {'bullmq.queue.name':'diagnostics','bullmq.queue.operation':'process',...,'bullmq.job.attempts.made':1}
28 spans no trace; com corpo do job: 0
```

</details>

#### CLI-FILA-02 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.queue.job.failures da fila diagnostics com uma falha na tentativa 1 e uma na tentativa 2 | interpretado como: pontos com `queue` diagnostics e `attempt` 1 e 2, valor 1 cada | observado os dois com 1, em 29 s | passou
- `*` o receptor registra app.queue.jobs da fila diagnostics com valor 1 no estado failed | interpretado como: ponto com `state` failed | observado 1 | passou

<details>
<summary>Evidência</summary>

```
fila diagnostics sem chaves; POST {"outcome":"fail"} -> 202 {"jobId":"1"}
app.queue.jobs {'queue':'diagnostics','state':'failed'} 1 (waiting/active/delayed 0)
app.queue.job.failures {'queue':'diagnostics','attempt':1} 1
app.queue.job.failures {'queue':'diagnostics','attempt':2} 1
```

</details>

#### CLI-FILA-03 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.queue.jobs da fila diagnostics com valor 1 no estado waiting | interpretado como: ponto com `state` waiting igual a 1 na janela | observado 1, 52 s depois do job | passou
- `*` a última exportação de app.queue.oldest_job.age da fila diagnostics registra pelo menos 20 segundos | interpretado como: último ponto na janela de 90 s, unidade `s` | observado 51,72 | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_WORKER_ENABLED=false; api recriada; fila sem chaves; POST {"outcome":"succeed"} -> 202 {"jobId":"1"}
+52 s app.queue.jobs {'queue':'diagnostics','state':'waiting'} 1 {job}
+52 s app.queue.oldest_job.age {'queue':'diagnostics'} 51.72 s (única exportação de métricas da janela)
```

</details>

#### CLI-METRICAS-01 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra http.server.request.duration com http.route igual a /api/health e status 200 | interpretado como: ponto com `http.route` /api/health e `http.response.status_code` 200 | observado 73 s depois da subida, contagem 17 | passou
- `*` o receptor registra http.server.request.duration com http.route igual a /api/v1/session e status 401 | interpretado como: ponto com rota e status | observado contagem 1 | passou
- `*` nenhum atributo dessas métricas contém query string | interpretado como: nenhum `?` nem `url.query` nos atributos | observado só method, status, route, protocol e scheme | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_* ausentes; api recriada; 10 x GET /api/health e GET /api/v1/session -> 401
+73 s 17 {"http.request.method":"GET","url.scheme":"http","network.protocol.version":"1.1","http.route":"/api/health","http.response.status_code":200}
+73 s 1 {"http.request.method":"GET","url.scheme":"http","network.protocol.version":"1.1","http.route":"/api/v1/session","http.response.status_code":401}
pontos com query nos atributos: 0
```

</details>

#### CLI-METRICAS-02 *
- Veredito: passou
- `*` o receptor registra db.client.connection.count com o atributo db.client.connection.state | interpretado como: pontos com o atributo | observado `idle` 0 e `used` 1 | passou
- `*` o receptor registra app.valkey.memory.used com valor maior que 0 | interpretado como: último ponto | observado 2532024 | passou
- `*` o receptor registra app.health.status igual a 1 para postgres e para valkey | interpretado como: último ponto por `dependency` | observado 1 e 1 | passou

<details>
<summary>Evidência</summary>

```
mesma subida de CLI-METRICAS-01, leitura 100 s depois da subida (exportação em +73 s)
db.client.connection.count {"db.client.connection.pool.name":"unknown_host:unknown_port/unknown_database","db.client.connection.state":"used"} 1 / "idle" 0
app.valkey.memory.used {} 2532024
app.health.status {"dependency":"postgres"} 1; {"dependency":"valkey"} 1
```

</details>

#### CLI-METRICAS-03 *
- Veredito: passou
- `*` o receptor registra app.health.status igual a 0 para valkey | interpretado como: ponto da janela de 90 s com `dependency` valkey igual a 0 | observado 0 (exportação 61 s depois da parada) | passou
- `*` o receptor registra app.health.status igual a 1 para postgres | interpretado como: ponto da mesma janela com `dependency` postgres igual a 1 | observado 1 | passou
- `*` a api continua respondendo a GET /api/health | interpretado como: resposta HTTP durante e no fim da janela | observado 503 com `postgres up` nas seis requisições, a cada 15 s até 98 s | passou

<details>
<summary>Evidência</summary>

```
OTEL http/json para o receptor; docker compose stop valkey
+61 s app.health.status {'dependency':'postgres'} 1; {'dependency':'valkey'} 0 (única exportação da janela)
GET /api/health em +15, +32, +48, +65, +81 e +98 s -> 503 (cerca de 1,5 s cada) {"status":"error","checks":{"postgres":"up","valkey":"down"}}
```

</details>

#### CLI-METRICAS-04 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.diagnostics.jobs.processed com valor 1 e outcome igual a succeed | interpretado como: ponto da soma com `outcome` succeed igual a 1, com a api recém-subida e a fila sem job (o contador é cumulativo desde a subida) | observado 1, 57 s depois | passou
- `*` o escopo de instrumentação dessa métrica se chama app | interpretado como: `scope.name` | observado `app` | passou
- `*` toda métrica recebida com nome começando por app. segue o formato app.<domínio>.<medida> em minúsculas | interpretado como: casa com `app\.[a-z0-9_]+\.[a-z0-9_]+(\.[a-z0-9_]+)*` | observado as 6 casam (app.diagnostics.jobs.processed, app.health.status, app.queue.jobs, app.queue.oldest_job.age, app.valkey.memory.max, app.valkey.memory.used) | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_ENABLED=true; fila sem chaves; api recriada; POST {"outcome":"succeed"} -> 202 {"jobId":"1"}
+57 s app.diagnostics.jobs.processed scope app {'outcome':'succeed'} 1 sum
nomes app.* fora do formato: []
primeira tentativa descartada: a fila foi limpa depois de a api subir, e o worker já tinha processado o job pendente de CLI-FILA-03 (valor 2); repetida com a fila limpa antes da subida
```

</details>

#### CLI-BACKEND-01
- Veredito: bloqueado
- Dono: ambiente
- bloqueado: a porta 127.0.0.1:3001 do host está ocupada por um `svchost` do Windows (PID 5540, escutando em 0.0.0.0:3001), e o Docker recusa publicar o Grafana nela; o comando não chega a subir o serviço, então nenhum bullet pôde ser conferido
- ✗ o código de saída é 0 | esperado 0, observado 1
  - causa: `ports are not available: exposing port TCP 127.0.0.1:3001 ... bind: An attempt was made to access a socket in a way forbidden by its access permissions`
- os serviços e a interface em http://localhost:3001 não foram conferidos; com a porta remapeada para 3002 fora do repositório, o serviço sobe saudável em 12 s (ver Pré-requisitos)

<details>
<summary>Evidência</summary>

```
docker compose --profile observability down; ps -q -> 0
docker compose --profile observability up -d --wait -> código 1 em 3 s
Error response from daemon: ports are not available: exposing port TCP 127.0.0.1:3001 -> 127.0.0.1:0: listen tcp4 127.0.0.1:3001: bind: An attempt was made to access a socket in a way forbidden by its access permissions.
Get-NetTCPConnection -LocalPort 3001 -State Listen -> 0.0.0.0, OwningProcess 5540
```

</details>

#### CLI-BACKEND-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` o backend de observabilidade não está em execução | interpretado como: `docker compose --profile observability ps` sem o serviço observability | observado ausente | passou
- `*` só os serviços api, web, postgres, valkey e mailpit estão em execução | interpretado como: lista do `ps` com o perfil | observado exatamente os cinco | passou

<details>
<summary>Evidência</summary>

```
docker compose --profile observability down; rodando: 0
docker compose up -d --wait -> código 0
docker compose --profile observability ps: api, mailpit, postgres, valkey, web (healthy)
```

</details>

#### CLI-BACKEND-03 *
- Veredito: passou
- `*` em até 90 segundos a consulta de traces do backend acha o trace dessa requisição | interpretado como: Tempo pelo proxy do Grafana, trace pelo trace_id da linha de log | observado 200 em cerca de 1 s, com o span de servidor `GET /api/health` | passou
- `*` a consulta de métricas do backend acha a série de http.server.request.duration com a rota /api/health | interpretado como: Prometheus, `http_server_request_duration_seconds_count{http_route="/api/health"}` | observado 1 série, status 200, em 17 s | passou
- `*` a consulta de logs do backend acha a linha dessa requisição com o mesmo trace_id | interpretado como: Loki, `{service_name="api"} \| trace_id="<id>"` | observado a linha com `req_id` da requisição, `req_url` /api/health e o mesmo `trace_id` | passou

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://observability:4318; GET /api/health (User-Agent eval-backend03) -> 200
log: trace_id c4d24202d5f50cf5e51e6d27492be07c, req.id 8f3a9c7a-8ff8-4e8b-a1c9-f072af0e5ad4
tempo /api/traces/c4d24202... -> 200, server span: GET /api/health
prometheus: /api/health 200 8
loki: {'req_headers_user_agent':'eval-backend03','req_id':'8f3a9c7a-...','req_url':'/api/health','res_statusCode':'200','span_id':'a9ad215b6d6f10bd','trace_id':'c4d24202d5f50cf5e51e6d27492be07c'}
```

</details>

#### CLI-AMOSTRAGEM-01 *
- Veredito: passou
- `*` em até 90 segundos a consulta de traces do backend acha vinte traces distintos de GET /api/health enviados depois do início do item | interpretado como: busca TraceQL no Tempo por `name = "GET /api/health"` e o user-agent do item, a partir do início | observado 20 traceIDs distintos em 33 s | passou

<details>
<summary>Evidência</summary>

```
20 x GET /api/health (User-Agent eval-amostragem-2)
tempo /api/search q={ span.user_agent.original = "eval-amostragem-2" && name = "GET /api/health" } -> 20 traces, 20 distintos, rootTraceName GET /api/health
```

</details>

#### CLI-AMOSTRAGEM-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` o arquivo tem uma política de amostragem probabilística de 10 por cento | interpretado como: política `type: probabilistic` com `sampling_percentage: 10` em `tail_sampling` | observado `amostra-10-por-cento` | passou
- `*` o arquivo tem uma política que guarda todo trace com status de erro | interpretado como: política `type: status_code` com `status_codes: [ERROR]` | observado `erros` | passou

<details>
<summary>Evidência</summary>

```
docker run --rm -v docker/observability:/cfg:ro --entrypoint /otel-lgtm/otelcol-contrib/otelcol-contrib grafana/otel-lgtm:0.39.0 validate --config=/cfg/collector-destino.yaml -> código 0
tail_sampling.policies: erros (status_code [ERROR]); amostra-10-por-cento (probabilistic, sampling_percentage 10)
```

</details>

#### CLI-PAINEIS-01 *
- Veredito: passou
- `*` existe o painel API por interface, com vazão, taxa de 5xx e p95 por rota | interpretado como: dashboard com esse título e painéis de vazão, 5xx e p95 agrupados por `http_route` | observado `app-api-interfaces` com os três painéis por interface (/api/v1, /api/auth, demais) | passou
- `*` existe o painel Filas, com jobs por estado, idade do job pendente mais antigo e falhas por tentativa, por fila | interpretado como: painéis agrupados por `queue` | observado `app-queues` com os três (e memória do Valkey) | passou
- `*` os dois painéis constam como provisionados de arquivo | interpretado como: `meta.provisioned` true | observado true, `provisionedExternalId` `api-interfaces.json` e `queues.json` | passou
- `*` cada painel corresponde a um arquivo versionado em docker/observability | interpretado como: `git ls-files` | observado `docker/observability/dashboards/api-interfaces.json` e `queues.json` | passou

<details>
<summary>Evidência</summary>

```
backend recém-subido; GET /api/search?type=dash-db -> app-api-interfaces | API por interface | App; app-queues | Filas | App
API por interface provisioned= True ext= api-interfaces.json: Vazão por rota, Taxa de 5xx por rota, p95 por rota (sum by (http_route) ...)
Filas provisioned= True ext= queues.json: Jobs por estado sum by (queue, state); Idade do job pendente mais antigo max by (queue); Falhas por tentativa sum by (queue, attempt)
```

</details>

#### CLI-ALERTAS-01 *
- Veredito: passou
- `*` existe a regra de taxa de 5xx acima de 1 por cento por 5 minutos | interpretado como: razão de 5xx em 5m com limiar `gt 0.01` e `for` 5m | observado `api-5xx-rate` | passou
- `*` existe a regra de p95 acima de 300 ms por 5 minutos nas rotas /api/v1 | interpretado como: `histogram_quantile(0.95, ...{http_route=~"/api/v1(/.*)?"}[5m])` com limiar `gt 0.3` e `for` 5m | observado `api-v1-p95` | passou
- `*` existe a regra, por fila, de job pendente há mais de 2 minutos ou de qualquer job falho | interpretado como: expressão por `queue` com idade maior que 120 ou failed maior que 0 | observado `queue-stalled` | passou
- `*` existe a regra, por dependência, de health check do PostgreSQL ou do Valkey falhando por 1 minuto | interpretado como: `min by (dependency) (app_health_status_ratio)` com limiar `lt 1` e `for` 1m | observado `dependency-down` | passou
- `*` as quatro regras constam como provisionadas de arquivo | interpretado como: `provenance` igual a `file` | observado `file` nas quatro | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/provisioning/alert-rules
api-5xx-rate for=5m provenance=file, B threshold gt 0.01
api-v1-p95 for=5m provenance=file, B threshold gt 0.3
queue-stalled for=0s provenance=file: clamp_max((max by (queue) (app_queue_oldest_job_age_seconds) > bool 120) + (max by (queue) (app_queue_jobs{state="failed"}) > bool 0), 1), B gt 0
dependency-down for=1m provenance=file: min by (dependency) (app_health_status_ratio), B lt 1
```

</details>

#### CLI-ALERTAS-02 *
- Veredito: passou
- `*` a regra de health check está em disparo para a dependência valkey | interpretado como: alerta `dependency-down` com `dependency` valkey em `Alerting` 4 min depois da parada | observado `Alerting` desde 19:45:40Z (parada às 19:43:42Z) | passou
- `*` a regra de health check não está em disparo para a dependência postgres | interpretado como: alerta `dependency-down` com `dependency` postgres fora de `Alerting` | observado `Normal` | passou

<details>
<summary>Evidência</summary>

```
OTEL para o backend local; docker compose stop valkey às 19:43:42Z; 240 s depois:
dependency-down valkey Alerting 2026-10-31T19:45:40Z
dependency-down postgres Normal
api-5xx-rate /api/health Pending (efeito dos 503 de /api/health)
app_health_status_ratio a cada 15 s nos últimos 270 s:
postgres ['1' x 19]
valkey   ['1','1','1','0', ... '0'] (0 desde a parada)
GET /api/health no fim -> 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
```

</details>

#### CLI-ALERTAS-03 *
- Veredito: passou
- `*` em até 4 minutos a regra de fila está em disparo para a fila diagnostics | interpretado como: alerta `queue-stalled` com `queue` diagnostics em `Alerting` | observado em 81 s | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_ENABLED=true; api recriada; fila sem chaves; POST {"outcome":"fail"} -> 202 {"jobId":"1"}
81 s depois: queue-stalled diagnostics Alerting 2026-10-31T19:49:40Z
```

</details>

#### CLI-ALERTAS-04 *
- Veredito: passou
- `*` em até 5 minutos a regra de fila está em disparo para a fila diagnostics | interpretado como: `queue-stalled` diagnostics passa de `Normal` a `Alerting` depois do job | observado `Alerting` desde 19:57:40Z, 181 s depois do job | passou
- `*` nenhum job da fila diagnostics está no estado failed | interpretado como: `zcard bull:diagnostics:failed` | observado 0 (wait 1) | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_WORKER_ENABLED=false; fila sem chaves; api recriada
o alerta ainda disparava por CLI-ALERTAS-03 (série failed=1 da instância anterior até expirar no Prometheus); a avaliação esperou ele voltar a Normal (19:54:40Z, 241 s) antes do job
POST {"outcome":"succeed"} -> 202 {"jobId":"1"}
181 s depois do job: queue-stalled diagnostics Alerting 2026-10-31T19:57:40Z
failed=0 wait=1
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a imagem final roda Node na major 26 | interpretado como: `node --version` na imagem | observado `v26.13.0` | passou
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `*.ts` (fora `*.d.ts`) fora de node_modules | observado nenhum; `/app/apps/api` só com dist, node_modules e package.json | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhuma pasta `@nestjs/cli` | observado nenhuma | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-31t19-13-50z . -> código 0 em 15 s
node --version -> v26.13.0; find *.ts sem node_modules -> nada; find @nestjs/cli -> nada; ls /app/apps/api -> dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: falhou
- Dono: contrato
- ✗ o container segue em execução | esperado em execução, observado `Exited (1)`
  - causa: com as variáveis do `.env` (copiado do `.env.example`, TRUSTED_PROXIES vazia) e NODE_ENV=production, a API recusa subir: `Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)`. O `.env.example` declara TRUSTED_PROXIES obrigatória com NODE_ENV=production, então o item como está escrito não passa sem dar valor a ela
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha JSON com `Nest application successfully started` | observado só a linha de configuração inválida | falhou
  - causa: a mesma recusa de configuração
- `*` todas as linhas do log do container são objetos JSON | interpretado como: `json.loads` de cada linha | observado 1 linha de texto puro | falhou
  - causa: a mensagem de configuração inválida sai em texto antes do logger
- `*` GET /api/health nesse container responde 200 | interpretado como: requisição ao container | observado container parado (sem resposta) | falhou
  - causa: a mesma recusa de configuração
- com TRUSTED_PROXIES=172.16.0.0/12 acrescentada, o container sobe, 29 linhas de log, todas JSON, `Nest application successfully started`, nenhuma de nível 50+, GET /api/auth/ok 200 e GET /api/health 200

<details>
<summary>Evidência</summary>

```
docker run -d --network <rede do Compose> --env-file .env -e NODE_ENV=production -p 3100:3000 eval-fundacao-api:2026-10-31t19-13-50z
status: Exited (1) 7 seconds ago
log: Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)
GET /api/auth/ok e /api/health -> sem resposta (000)
.env.example: "TRUSTED_PROXIES= ... Obrigatória com NODE_ENV=production (sem ela a API não sobe)"
com -e TRUSTED_PROXIES=172.16.0.0/12: /api/auth/ok 200 {"ok":true}; /api/health 200; 29 linhas, 29 JSON, erros 0, started 1
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` e busca por arquivo `node` | observado nenhum | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: 200 com o mesmo conteúdo de `/index.html` | observado 200, `<html lang="pt-BR">`, 527 bytes, idêntico | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-31t19-13-50z . -> código 0
command -v node -> nada; find / -name node -type f -> nada
GET http://localhost:3180/uma-rota-qualquer -> 200, 527 bytes, <!doctype html><html lang="pt-BR">...; cmp com /index.html -> iguais
```

</details>

#### CLI-CI-01
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a saída termina com a linha de que todas as verificações passaram | esperado `ok: todas as verificações passaram`, observado a mesma
- ✓ a saída não contém o aviso de alvo não implementado | esperado ausência, observado 0 ocorrências

<details>
<summary>Evidência</summary>

```
CI=true make check -> código 0; última linha: ok: todas as verificações passaram; "não implementado": 0
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | interpretado como: `actions/setup-node` com `node-version: 26` antes do passo `make check` | observado sim | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version` (lê o packageManager) antes do passo | observado sim | passou
- `*` toda action do arquivo está fixada por SHA completo com comentário da versão | interpretado como: cada `uses:` com 40 hex e `# vX` | observado as três | passou

<details>
<summary>Evidência</summary>

```
actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0 (sem version: lê packageManager)
actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0, node-version: 26
passo "make check" depois dos três
```

</details>

#### CLI-CAMADAS-01 *
- Veredito: passou
- `*` o controller de GET /api/v1/session fica em presentation/get-session | interpretado como: arquivo do `@Controller('session')` | observado `presentation/get-session/get-session.controller.ts` | passou
- `*` a raiz do módulo tem só o accounts.module.ts, o auth.ts e pastas de camada | interpretado como: `ls` da raiz | observado `accounts.module.ts`, `auth.ts`, `infra/`, `presentation/` | passou
- `*` não há pasta além de domain, application, infra e presentation no módulo | interpretado como: pastas de primeiro nível | observado `infra` e `presentation` | passou

<details>
<summary>Evidência</summary>

```
apps/api/src/modules/accounts: accounts.module.ts auth.ts infra/ presentation/
presentation/get-session: get-session.controller.ts, get-session.controller.spec.ts, session-response.dto.ts
```

</details>

#### CLI-CAMADAS-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra a análise de dependências de @app/api sem violação | interpretado como: linha do dependency-cruiser sem violação | observado `no dependency violations found` | passou

<details>
<summary>Evidência</summary>

```
make lint -> código 0
@app/api:lint: ✔ no dependency violations found (116 modules, 298 dependencies cruised)
```

</details>

#### CLI-CAMADAS-03 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra do `.dependency-cruiser.cjs` | observado `prisma-gerado-so-em-infra-e-platform` e `domain-so-importa-domain` | passou
- ✓ a saída cita o arquivo novo de domain/ | esperado presente, observado `src/modules/accounts/domain/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
domain/eval-violacao.ts: import type { PrismaClient } from '../../../generated/prisma/client.js'
make lint -> código 2
error prisma-gerado-so-em-infra-e-platform: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
error domain-so-importa-domain: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
arquivo removido depois
```

</details>

#### CLI-CAMADAS-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra | observado `domain-e-application-nao-importam-platform` e `application-so-importa-domain` | passou
- ✓ a saída cita o arquivo novo de application/ | esperado presente, observado `src/modules/accounts/application/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
application/eval-violacao.ts: import { PrismaService } from '../../../platform/prisma/prisma.service.js'
make lint -> código 2
error domain-e-application-nao-importam-platform: src/modules/accounts/application/eval-violacao.ts → src/platform/prisma/prisma.service.ts
error application-so-importa-domain: (mesmo par)
```

</details>

#### CLI-CAMADAS-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra | observado `presentation-nao-importa-infra` | passou
- ✓ a saída cita o controller de presentation/get-session | esperado presente, observado `src/modules/accounts/presentation/get-session/get-session.controller.ts`

<details>
<summary>Evidência</summary>

```
infra/eval-violacao.ts novo; controller com export { evalInfra } from '../../infra/eval-violacao.js' (restaurado de cópia depois)
make lint -> código 2
error presentation-nao-importa-infra: src/modules/accounts/presentation/get-session/get-session.controller.ts → src/modules/accounts/infra/eval-violacao.ts
```

</details>

#### CLI-CAMADAS-06 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra | observado `modulo-nao-importa-camadas-de-outro` | passou
- ✓ a saída cita o arquivo do segundo módulo | esperado presente, observado `src/modules/evalsegundo/presentation/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
modules/evalsegundo/presentation/eval-violacao.ts reexporta o GetSessionController
make lint -> código 2
error modulo-nao-importa-camadas-de-outro: src/modules/evalsegundo/presentation/eval-violacao.ts → src/modules/accounts/presentation/get-session/get-session.controller.ts
```

</details>

#### CLI-CAMADAS-07 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra violada | interpretado como: nome de regra | observado `platform-nao-importa-modules` | passou
- ✓ a saída cita o arquivo novo de platform/ | esperado presente, observado `src/platform/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
platform/eval-violacao.ts reexporta o AccountsModule
make lint -> código 2
error platform-nao-importa-modules: src/platform/eval-violacao.ts → src/modules/accounts/accounts.module.ts
```

</details>

#### CLI-CAMADAS-08 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | esperado diferente de 0, observado 2
- `*` a saída nomeia a regra de ciclo | interpretado como: regra de ciclo do `.dependency-cruiser.cjs` | observado `sem-ciclo` | passou
- ✓ a saída cita os dois arquivos novos | esperado os dois, observado `src/platform/eval-ciclo-a.ts` e `src/platform/eval-ciclo-b.ts`

<details>
<summary>Evidência</summary>

```
platform/eval-ciclo-a.ts e eval-ciclo-b.ts importam um ao outro (formatados com o prettier do projeto)
make lint -> código 2
error sem-ciclo: src/platform/eval-ciclo-a.ts → src/platform/eval-ciclo-b.ts → src/platform/eval-ciclo-a.ts
git status depois dos itens de camadas: só os dois documentos desta pasta
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que não há sessão aberta | interpretado como: texto visível com esse sentido | observado "Nenhuma sessão aberta." | passou
- ✓ o elemento html tem lang igual a pt-BR | esperado `pt-BR`, observado `pt-BR`
- `*` o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session | interpretado como: erros do console | observado 1 erro, `Failed to load resource: ... 401 (Unauthorized) @ http://localhost:3000/api/v1/session` | passou
- ✓ base visual (mecânica): nenhuma imagem; nenhum elemento fora da janela, cortado ou que não recebe o clique no centro
- `*` base visual (screenshot) | interpretado como: corte, sobreposição ou layout desmontado | observado cabeçalho com "Entrar" e "Criar conta", título e texto alinhados | passou

<details>
<summary>Evidência</summary>

```
playwright-cli (Chromium headless, .playwright/cli.config.json), sem cookie, http://localhost:5173/
snapshot: navigation "Principal" (App, Entrar, Criar conta); heading "App"; paragraph "Nenhuma sessão aberta."; link "Cadastre-se"
console: Total messages: 4 (Errors: 1); [ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session
base visual: {"lang":"pt-BR","W":1280,"H":720,"imgs":[],"fora":[],"cortados":[],"cliques":[]}
screenshot: ui-inicio-01.png (na pasta da avaliação, apagada no fim)
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- `*` a página mostra que há sessão aberta com o papel admin | interpretado como: texto visível | observado "Sessão aberta com o papel admin." | passou
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: console sem erro e requisição à API concluída | observado 0 erros e GET /api/v1/session 200 | passou
- ✓ base visual (mecânica): nenhuma imagem; nenhum elemento fora da janela, cortado ou que não recebe o clique no centro
- `*` base visual (screenshot) | interpretado como: corte, sobreposição ou layout desmontado | observado título e parágrafo alinhados | passou

<details>
<summary>Evidência</summary>

```
cookie de sessao-admin (sign-in refeito, <mascarado>) posto no navegador para localhost, HttpOnly
snapshot: heading "App"; paragraph "Sessão aberta com o papel" strong "admin"
console: Total messages: 3 (Errors: 0, Warnings: 0)
requests: [GET] http://localhost:3000/api/v1/session => [200] OK
base visual: {"lang":"pt-BR","imgs":[],"fora":[],"cortados":[],"cliques":[]}
```

</details>

#### UI-INICIO-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível | observado título "Página não encontrada" e "O endereço que você abriu não existe neste aplicativo." | passou
- ✓ base visual (mecânica): nenhuma imagem; nenhum elemento fora da janela, cortado ou que não recebe o clique no centro
- `*` base visual (screenshot) | interpretado como: corte, sobreposição ou layout desmontado | observado título, texto e link "Voltar ao início" alinhados | passou

<details>
<summary>Evidência</summary>

```
http://localhost:5173/nao-existe
alert: heading "Página não encontrada"; paragraph "O endereço que você abriu não existe neste aplicativo."; link "Voltar ao início"
base visual: {"lang":"pt-BR","imgs":[],"fora":[],"cortados":[],"cliques":[]}
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que o servidor não respondeu | interpretado como: texto visível | observado título "O servidor não respondeu" e "Não foi possível falar com a API. Tente de novo em alguns instantes." | passou
- `*` a página não fica em branco | interpretado como: texto visível no corpo | observado cabeçalho, título, mensagem e link | passou
- ✓ base visual (mecânica): nenhuma imagem; nenhum elemento fora da janela, cortado ou que não recebe o clique no centro
- `*` base visual (screenshot) | interpretado como: corte, sobreposição ou layout desmontado | observado mensagem de erro e link alinhados | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api; http://localhost:5173/ sem cookie
alert: heading "O servidor não respondeu"; paragraph "Não foi possível falar com a API. Tente de novo em alguns instantes."; link "Voltar ao início"
base visual: {"lang":"pt-BR","imgs":[],"fora":[],"cortados":[],"cliques":[]}
docker compose up -d --wait api -> Healthy
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: texto alterado visível e marcador posto em `window` antes da edição ainda presente (sem recarga da página) | observado `true|sem-recarga` em cerca de 3 s | passou
- ✓ base visual (mecânica): nenhuma imagem; nenhum elemento fora da janela, cortado ou que não recebe o clique no centro
- `*` base visual (screenshot) | interpretado como: corte ou layout desmontado depois do HMR | observado nenhum | passou

<details>
<summary>Evidência</summary>

```
window.__marcaEval = 'sem-recarga'; texto "Nenhuma sessão aberta." trocado em apps/web/src/routes/root/route.tsx por "Nenhuma sessão aberta (texto da avaliação)."
após cerca de 3 s: includes('texto da avaliação') + '|' + window.__marcaEval -> "true|sem-recarga"
arquivo restaurado de cópia; git status: só os dois documentos desta pasta
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json`, já instaladas no host; o Compose instala nos volumes ao subir |
| Ambiente efêmero e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose up -d --wait`, com `.env` a partir de `.env.example` |
| Banco efêmero e migração | 1 e 5 | contrato (Compose) e `scripts/db-setup.sh`: banco `eval_fundacao_...` no postgres do Compose apontado por `DATABASE_URL`; `make db-setup` migra e cria o admin |
| Banco vazio entre itens | 6 | `DROP DATABASE ... WITH (FORCE)` e `CREATE DATABASE` do banco efêmero |
| Estado persistido | 3 e 6 | spec da fundação, Convenções: `admin-inicial` pelo seed via `make db-setup`; `sessao-admin` por POST /api/auth/sign-in/email; `conta-comum-com-email-do-admin` e `admin-banido` pelo seed seguido de UPDATE em `user` |
| Fila diagnostics vazia entre itens | 6 | apagar as chaves `bull:diagnostics:*` no Valkey antes de recriar a api |
| Gates | 1 | contrato: `make check` e `make build` na raiz, com o `.env` do ambiente efêmero |
| Subida da api com configuração inválida | 5 | `apps/api/package.json`: `node dist/main.js` num `docker compose run` do serviço api |
| Receptor OTLP | 6 | servidor HTTP em Python na porta 4318 do host; `compose.yaml` documenta `host.docker.internal:4318` |
| Backend local de observabilidade | 5 | `compose.yaml` (perfil observability, grafana/otel-lgtm 0.39.0) e `.env.example` (`http://observability:4318`); consultas pelo proxy de datasources do Grafana (Tempo, Prometheus, Loki) e pelas APIs de dashboards, provisionamento de alertas e estado das regras |
| Validação do coletor do destino | 5 | comentário de `docker/observability/collector-destino.yaml`: `otelcol-contrib validate` da imagem do backend |
| Imagens | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` construídos da raiz, com api e web do Compose paradas; tags `eval-fundacao-<app>:<execução>` |
| Navegador | 3 | spec, Verificação por superfície: `playwright-cli` com `.playwright/cli.config.json` (Chromium headless) |
| Limpeza entre itens de UI | 6 | `cookie-clear` e navegação nova; api parada e religada só em UI-INICIO-04 |
| Recarga no desenvolvimento | 5 | edição no host de `apps/api/src/main.ts` e `apps/web/src/routes/root/route.tsx`, restaurados de cópia |
| Base visual | 6 | `eval` no navegador (imagens, caixas na janela, `elementFromPoint`, corte por `overflow`) e screenshot por item |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_fundacao_*`, nenhuma pasta `evaluator-fundacao-*`, nenhum container e nenhuma imagem `eval-fundacao-*` no início.
- Derrubada: completa. Navegador fechado; receptor OTLP (PID 979646) parado; containers `eval-fundacao-*` removidos e as duas imagens `eval-fundacao-*:2026-10-31t19-13-50z` apagadas; serviço observability parado e removido; `.env` da pessoa restaurado e os serviços recriados com ele (api de novo em `postgres:5432/app`, saúde 200); banco `eval_fundacao_2026_10_31t19_13_50z` apagado; arquivos de código editados restaurados; pasta temporária apagada.

## Avisos

- Avaliado com 2 arquivos fora de commit, ambos documentos desta pasta (`avaliacao.md` da avaliação anterior e `orquestracao.md`), que não são código avaliado.
- `validate.py` do spec-writer: 4 avisos (componente 'API NestJS' fora da tabela do HLD; 23 hipóteses; 7 fases e 34 passos acima do orçamento).
- A porta 3001 do host continua ocupada por um `svchost` do Windows (PID 5540). CLI-BACKEND-01 ficou bloqueado por isso; CLI-BACKEND-03, CLI-AMOSTRAGEM-01, CLI-PAINEIS-01 e CLI-ALERTAS-01 a 04 rodaram com o mesmo serviço publicado em 127.0.0.1:3002 por um override fora do repositório (`ports: !override`), sem mudar imagem, volumes nem healthcheck.
- CLI-METRICAS-03 e CLI-ALERTAS-02, reprovados na avaliação anterior, passaram depois da correção 8cdd225 (UV_THREADPOOL_SIZE 16): com o Valkey parado, todas as respostas de /api/health em API-SAUDE-02, CLI-METRICAS-03 e CLI-ALERTAS-02 trouxeram `postgres up`, e `app_health_status_ratio` do postgres ficou em 1 durante os 4 min.
- CLI-IMAGEM-02 segue reprovado com dono contrato: o item pede o container com as variáveis do `.env` e NODE_ENV=production, mas o `.env.example` deixa TRUSTED_PROXIES vazia e a declara obrigatória em produção. API-DOCS-03 e API-DIAG-03 usaram o container da imagem com TRUSTED_PROXIES=172.16.0.0/12.
- CLI-METRICAS-04: a primeira tentativa foi descartada por erro da avaliação (a fila foi limpa depois da subida da api, e o worker processou o job pendente de CLI-FILA-03, deixando o contador em 2); repetida com a fila limpa antes da subida, como o `Dado` pede.
- CLI-CAMADAS-08: a primeira tentativa parou no prettier porque os arquivos de violação escritos pela avaliação não estavam formatados; repetida com os arquivos formatados pelo prettier do projeto, chegou ao dependency-cruiser.
- Os gates `make check` e `make build`, e o `make lint` e o `make build` dos itens, vieram do cache local do Turborepo; `make test` foi repetido com `TURBO_FORCE=true` para os testes rodarem de fato, e passou. Os itens de camadas invalidaram o cache do lint de @app/api e rodaram o dependency-cruiser de fato.
- CLI-STACK-04 moveu o conteúdo de `apps/api/dist` e as pastas `apps/web/dist` e `packages/contracts/dist` para a pasta da avaliação; o `make build` os restaurou do cache.
- CLI-CONFIG-01 e 03 sobem o processo da aplicação (`node dist/main.js`) num `docker compose run` do serviço api, não o `nest start --watch` do serviço, que não termina quando a aplicação sai.
- CLI-IMAGEM-01 e 03 construíram do working tree, não de um clone novo; os únicos arquivos fora de commit eram `.env` e os documentos desta pasta.
- As requisições a /api/auth/* não aparecem no log da api (nenhuma linha de `sign-in` em CLI-LOGS-03); o item passa, porque pede só a ausência de e-mail e senha.
- O `playwright-cli` grava snapshots e logs de console em `.playwright-cli/` na raiz, pasta ignorada pelo git; os arquivos desta avaliação ficaram lá.
- No início da avaliação o serviço api do Compose estava `unhealthy` (sobra da correção anterior, com o Valkey reiniciado); o ambiente foi derrubado e subido do zero para CLI-AMBIENTE-01.

## Motivo do aborto

Nenhum.
