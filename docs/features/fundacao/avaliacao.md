# Avaliação: fundação

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-31T20-57-30Z
- Branch: docs/observabilidade-fundacao
- Commit: 0a9fcad
- Status: limpo
- Itens: 84 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 84
- Critérios: 23 verificado, 0 reprovado, 0 indeterminado, de 23
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
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | ✓ verificado | CLI-IMAGEM-01, CLI-IMAGEM-02, CLI-IMAGEM-03 |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | ✓ verificado | CLI-CI-01, CLI-CI-02 |
| Regra de dependência na API: Módulo Contas nas camadas da Clean Architecture e dependency-cruiser no lint de apps/api barrando import entre camadas, entre módulos e ciclos (ADR-0025, ADR-0026). | ✓ verificado | CLI-CAMADAS-01, CLI-CAMADAS-02, CLI-CAMADAS-03, CLI-CAMADAS-04, CLI-CAMADAS-05, CLI-CAMADAS-06, CLI-CAMADAS-07, CLI-CAMADAS-08 |
| Correlação de logs e traces: com a exportação ligada, as linhas de log da API trazem o trace_id e o span_id do span ativo (ADR-0018, ADR-0019). | ✓ verificado | CLI-OTEL-04, CLI-OTEL-05 |
| Tracing de filas: contexto W3C propagado do enfileiramento ao processamento em toda fila do BullMQ, ligado no módulo de filas da plataforma (HLD, Observabilidade; ADR-0015, ADR-0019). | ✓ verificado | CLI-FILA-01 |
| Métricas de componente: requisições HTTP por rota e status, pool do PostgreSQL, memória do Valkey, estado do health check e, por fila do BullMQ, jobs por estado, idade do job pendente mais antigo e falhas por tentativa (HLD, Observabilidade; ADR-0019). | ✓ verificado | CLI-METRICAS-01, CLI-METRICAS-02, CLI-METRICAS-03, CLI-METRICAS-05, CLI-FILA-02, CLI-FILA-03 |
| Métricas de negócio: Meter da aplicação em platform/ com a convenção de nome app.<domínio>.<medida>, onde cada RF registra as suas (HLD, Observabilidade). | ✓ verificado | CLI-METRICAS-04 |
| Fila de diagnóstico: fila e rota anônima POST /api/diagnostics/jobs, ligadas só por DIAGNOSTICS_ENABLED e fora de produção, para exercitar a telemetria de filas sem depender de módulo de funcionalidade (HLD, Observabilidade). | ✓ verificado | API-DIAG-01, API-DIAG-02, API-DIAG-03, API-DIAG-04 |
| Backend local de observabilidade: serviço do Compose no perfil observability que recebe OTLP da API e guarda traces, métricas e logs com amostragem de 100 por cento (HLD, Observabilidade; ADR-0029). | ✓ verificado | CLI-BACKEND-01, CLI-BACKEND-02, CLI-BACKEND-03, CLI-AMOSTRAGEM-01 |
| Painéis e alertas como código: painel por interface, painel das filas e os quatro alertas do HLD, provisionados no backend local a partir de arquivos versionados (HLD, Dashboards e alertas; ADR-0029). | ✓ verificado | CLI-PAINEIS-01, CLI-PAINEIS-02, CLI-ALERTAS-01, CLI-ALERTAS-02, CLI-ALERTAS-03, CLI-ALERTAS-04 |
| Amostragem do destino: configuração de referência do coletor com 10 por cento dos traces e 100 por cento dos traces com erro (HLD, Tracing). | ✓ verificado | CLI-AMOSTRAGEM-02 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (17 linhas `ok`; lint e test do Turborepo do cache local, `FULL TURBO`; última linha `ok: todas as verificações passaram`)
- ✓ build: `make build`, código 0 (4 tarefas, 4 do cache, `FULL TURBO`)

## Pré-requisitos

### Serviços em execução
- ✓ API NestJS: http://localhost:3000, saúde GET /api/health respondeu 200 com `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, apontada para o banco efêmero `eval_fundacao_2026_10_31t20_57_30z`
- ✓ SPA Web: http://localhost:5173, serviço web saudável
- ✓ PostgreSQL: serviço postgres saudável (18.6), banco efêmero criado nele
- ✓ Redis (serviço Valkey): serviço valkey saudável (9.1.3); `checks.valkey` igual a `up`
- ✓ Mailpit: serviço mailpit saudável
- ✓ Backend de observabilidade local no perfil observability: `docker compose --profile observability up -d --wait` código 0, serviço observability saudável, Grafana em http://localhost:8001 com `/api/health` `database: ok`

### Estado persistido
- ✓ `admin-inicial`: criado por `make db-setup` (código 0, `seed: primeiro admin criado`) no banco efêmero; conferido: admin@example.com com role admin, emailVerified t, banned f, banExpires nulo, credencial `credential` com hash de 161 caracteres. Recriado do mesmo jeito depois dos itens que esvaziam o banco
- ✓ `sessao-admin`: criada por POST /api/auth/sign-in/email com as credenciais de `admin-inicial` (200, `set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`); conferido: GET /api/v1/session com o cookie respondeu 200 com o userId e role admin. Refeita antes de UI-INICIO-02
- ✓ `conta-comum-com-email-do-admin`: `make db-setup` no banco vazio com ADMIN_PASSWORD trocada por outra senha e depois `role` nulo e `emailVerified` false por SQL; conferido: role nulo, emailVerified f, banned f
- ✓ `admin-banido`: `make db-setup` no banco vazio e depois `banned` true e `banExpires` nulo por SQL; conferido: role admin, emailVerified t, banned t, banExpires nulo, credencial da senha de ADMIN_PASSWORD

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env`: copiado de `.env.example` com ADMIN_EMAIL=admin@example.com e ADMIN_PASSWORD de exemplo (letras e números, 9 caracteres), NODE_ENV=development, OTEL_EXPORTER_OTLP_ENDPOINT ausente; DATABASE_URL apontada para o banco efêmero depois de CLI-AMBIENTE-01 (que rodou com o `.env` igual ao `.env.example`)
- ✓ OTEL_EXPORTER_OTLP_PROTOCOL: `http/json` só em CLI-OTEL-03, CLI-OTEL-04, Telemetria de filas e Métricas; ausente em CLI-OTEL-02 (protocolo padrão, `application/x-protobuf` no receptor)
- ✓ DIAGNOSTICS_ENABLED e DIAGNOSTICS_WORKER_ENABLED: ausentes salvo nos itens que os pedem (`printenv` no container da api sem nenhuma das duas fora deles)
- ✓ OTEL_EXPORTER_OTLP_ENDPOINT nos itens com o backend: `http://observability:4318`, protocolo padrão
- ✓ Docker com Compose v2, shellcheck, actionlint, gitleaks e python3 instalados (`make check` rodou check-shell, check-actions e check-secrets com as ferramentas)

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
- `*` o corpo informa postgres up | interpretado como: `checks.postgres` igual a `up` nas três requisições feitas com o Valkey parado | observado `up` nas três | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey -> Stopped
GET /api/health x3 -> 503 (1,5 s cada) {"status":"error","checks":{"postgres":"up","valkey":"down"}}
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
GET /api/health x3 -> 503 {"status":"error","checks":{"postgres":"down","valkey":"up"}}
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
- ✓ o corpo não traz id, papel nem e-mail de conta nenhuma | esperado sem `userId`, `id`, `role`, `email` | observado `{"message":"Unauthorized","statusCode":401}`

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
GET /api/v1/session  Cookie: better-auth.session_token=sessao-inventada -> 401 {"message":"Unauthorized","statusCode":401}
```

</details>

#### API-BORDA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o userId da conta `admin-inicial` | esperado `ViS1g7vr12QugmZjZI28ermmWHsejKJC` (id em `user`), observado o mesmo
- ✓ o corpo traz role igual a admin | esperado `admin`, observado `admin`

<details>
<summary>Evidência</summary>

```
GET /api/v1/session  Cookie: better-auth.session_token=<mascarado> -> 200 {"userId":"ViS1g7vr12QugmZjZI28ermmWHsejKJC","role":"admin"}
select id from "user" -> ViS1g7vr12QugmZjZI28ermmWHsejKJC
```

</details>

#### API-ADMIN-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta define o cookie de sessão com o atributo HttpOnly | interpretado como: `set-cookie` de `better-auth.session_token` com `HttpOnly` | observado `better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax` | passou
- `*` o corpo não contém a senha | interpretado como: o texto de ADMIN_PASSWORD e campo `password` ausentes do corpo | observado ausentes | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-in/email {"email":"admin@example.com","password":"<ADMIN_PASSWORD>"} -> 200
set-cookie: better-auth.session_token=<mascarado>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
{"redirect":false,"token":"<mascarado>","user":{"name":"admin","email":"admin@example.com","emailVerified":true,"role":"admin","banned":false,...}}
```

</details>

#### API-CORS-01
- Veredito: passou
- ✓ o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN | esperado `http://localhost:5173`, observado `http://localhost:5173`
- ✓ o cabeçalho Access-Control-Allow-Credentials é true | esperado `true`, observado `true`

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session  Origin: http://localhost:5173  Access-Control-Request-Method: GET -> 204
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

</details>

#### API-CORS-02
- Veredito: passou
- ✓ a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem | esperado ausente, observado ausente

<details>
<summary>Evidência</summary>

```
OPTIONS /api/v1/session  Origin: http://outra-origem.example -> 204, sem Access-Control-Allow-Origin
```

</details>

#### API-DOCS-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo é uma página HTML | interpretado como: `Content-Type: text/html` e corpo com `<!DOCTYPE html>` | observado os dois (Swagger UI) | passou

<details>
<summary>Evidência</summary>

```
GET /api/docs -> 200 Content-Type: text/html; charset=utf-8
<!DOCTYPE html><html lang="en"><head>... <title>Swagger UI</title>
```

</details>

#### API-DOCS-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o campo openapi do corpo começa com 3. | interpretado como: prefixo `3.` em `openapi` | observado `3.0.0` | passou
- ✓ os caminhos do documento incluem /api/v1/session | observado em `paths`
- ✓ os caminhos do documento incluem /api/health | observado em `paths`

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
container eval-fundacao-api (imagem de CLI-IMAGEM-01) com NODE_ENV=production, TRUSTED_PROXIES=172.16.0.0/12, porta 3100
GET /api/docs-json -> 404 {"message":"Cannot GET /api/docs-json","error":"Not Found","statusCode":404}
GET /api/docs -> 404
```

</details>

#### API-DIAG-01 *
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404
- `*` o Valkey não tem fila chamada diagnostics | interpretado como: nenhuma chave `bull:diagnostics*` | observado 0 chaves | passou

<details>
<summary>Evidência</summary>

```
printenv DIAGNOSTICS_ENABLED no container da api -> ausente (código 1)
POST /api/diagnostics/jobs {"outcome":"succeed"} -> 404 {"message":"Cannot POST /api/diagnostics/jobs",...}
valkey-cli --scan --pattern 'bull:diagnostics*' -> 0 chaves
```

</details>

#### API-DIAG-02 *
- Veredito: passou
- ✓ a resposta é 202 | esperado 202, observado 202
- ✓ o corpo traz o jobId | observado `"jobId":"1"`
- `*` em até 10 segundos o job com esse id está concluído na fila diagnostics do Valkey | interpretado como: id no conjunto `bull:diagnostics:completed` e `finishedOn` no hash do job, consultado a cada 1 s | observado concluído em 1 s | passou

<details>
<summary>Evidência</summary>

```
api recriada com DIAGNOSTICS_ENABLED=true, NODE_ENV=development
POST /api/diagnostics/jobs {"outcome":"succeed"} -> 202 {"jobId":"1"}
zscore bull:diagnostics:completed 1 -> 1793480472023 (após 1 s); hget bull:diagnostics:1 finishedOn -> 1793480472023
```

</details>

#### API-DIAG-03 *
- Veredito: passou
- ✓ a resposta é 404 | esperado 404, observado 404
- `*` o Valkey não tem fila chamada diagnostics | interpretado como: nenhuma chave `bull:diagnostics*`, com as chaves da fila apagadas antes de subir o container | observado 0 chaves | passou

<details>
<summary>Evidência</summary>

```
container eval-fundacao-api com NODE_ENV=production, DIAGNOSTICS_ENABLED=true, TRUSTED_PROXIES=172.16.0.0/12
POST /api/diagnostics/jobs {"outcome":"succeed"} -> 404 {"message":"Cannot POST /api/diagnostics/jobs",...}
chaves bull:diagnostics* -> 0
```

</details>

#### API-DIAG-04 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` nenhum job novo entra na fila diagnostics | interpretado como: contador `bull:diagnostics:id` e tamanhos de wait, completed e failed iguais antes e depois | observado id 1 -> 1; wait 0, completed 1, failed 0 antes e depois | passou

<details>
<summary>Evidência</summary>

```
POST /api/diagnostics/jobs {"outcome":"explodir"} -> 400 {"message":"O corpo deve ser { \"outcome\": \"succeed\" } ou { \"outcome\": \"fail\" }","error":"Bad Request","statusCode":400}
bull:diagnostics:id 1 -> 1; wait 0/0, completed 1/1, failed 0/0
```

</details>

### CLI

#### CLI-MONOREPO-01 *
- Veredito: passou
- `*` o packageManager da raiz fixa o pnpm na major 12 | interpretado como: `packageManager` do package.json raiz | observado `pnpm@12.16.1` | passou
- `*` o engines.node da raiz exige a major 26 | interpretado como: `engines.node` | observado `>=26.0.0` | passou
- `*` o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts | interpretado como: pacotes dos globs de `pnpm-workspace.yaml` (`apps/*`, `packages/*`), sem a raiz | observado `@app/api`, `@app/contracts`, `@app/web` | passou
- ✓ o TypeScript instalado está na major 6 | observado 6.0.3
- ✓ o Turborepo instalado está na major 2 | observado 2.11.10

<details>
<summary>Evidência</summary>

```
package.json: packageManager pnpm@12.16.1; engines { node: '>=26.0.0', pnpm: '>=12.0.0' }
pnpm -r ls --depth -1 -> ['@app/api', '@app/contracts', '@app/web', 'app'(raiz)]; ls -d apps/* packages/* -> apps/api apps/web packages/contracts
pnpm exec tsc --version -> Version 6.0.3; pnpm exec turbo --version -> 2.11.10
```

</details>

#### CLI-MONOREPO-02
- Veredito: passou
- ✓ @app/api declara @app/contracts pelo protocolo workspace: | observado `workspace:*` em dependencies
- ✓ @app/web declara @app/contracts pelo protocolo workspace: | observado `workspace:*` em dependencies

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
- ✓ a saída não contém o aviso de alvo não implementado | observado 0 ocorrências de `não implementado`
- `*` a saída mostra o lint rodando em @app/api, @app/web e @app/contracts | interpretado como: linhas com prefixo `@app/<pacote>:lint` dos três | observado as três (oxlint, prettier e depcruise em @app/api) | passou

<details>
<summary>Evidência</summary>

```
make lint -> 0
@app/api:lint: $ oxlint src/ test/ && prettier --check . && depcruise src --config .dependency-cruiser.cjs
@app/api:lint: Found 1 warning and 0 errors.
@app/api:lint: ✔ no dependency violations found (118 modules, 301 dependencies cruised)
@app/web:lint: Found 0 warnings and 0 errors.
@app/contracts:lint: Found 0 warnings and 0 errors.
```

</details>

#### CLI-STACK-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` nenhum arquivo versionado fica alterado | interpretado como: `git status --short` igual antes e depois | observado só `docs/features/fundacao/orquestracao.md`, já alterado antes da avaliação | passou

<details>
<summary>Evidência</summary>

```
make format -> 0; Tasks: 3 successful, 3 total (0 cached)
git status --short ->  M docs/features/fundacao/orquestracao.md (igual ao início)
```

</details>

#### CLI-STACK-03 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra testes de unidade de @app/api, @app/web e @app/contracts | interpretado como: resumo do Vitest de cada pacote | observado api 22 arquivos/101 testes, web 2/14, contracts 3/18 | passou
- `*` a saída mostra os testes de integração de @app/api rodando contra o banco app_test | interpretado como: `vitest.integration.config.ts` rodando e datasource `app_test` | observado `Datasource "db": PostgreSQL database "app_test"` e 8 arquivos/52 testes de integração | passou

<details>
<summary>Evidência</summary>

```
TURBO_FORCE=true make test -> 0
Datasource "db": PostgreSQL database "app_test", schema "public" at "localhost:5432"
@app/contracts:test: Test Files 3 passed (3) / Tests 18 passed (18)
@app/web:test: Test Files 2 passed (2) / Tests 14 passed (14)
@app/api:test: $ vitest run && vitest run --config ./vitest.integration.config.ts
@app/api:test: Test Files 22 passed (22) / Tests 101 passed (101)
@app/api:test: ✓ Cadastro aberto (integração, banco app_test) (15)
@app/api:test: Test Files 8 passed (8) / Tests 52 passed (52)
```

</details>

#### CLI-STACK-04
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existe o arquivo main.js na pasta dist de apps/api | observado 945 bytes
- ✓ existe o arquivo index.html na pasta dist de apps/web | observado 527 bytes

<details>
<summary>Evidência</summary>

```
conteúdo de apps/api/dist, apps/web/dist e packages/contracts/dist movido para a pasta da avaliação
make build -> 0; Tasks: 4 successful, 4 total (4 cached, artefatos restaurados do cache)
apps/api/dist/main.js 945 bytes; apps/web/dist/index.html 527 bytes
```

</details>

#### CLI-STACK-05 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída informa que todas as tarefas vieram do cache local | interpretado como: `Cached: N cached, N total` igual ao total e `FULL TURBO` | observado `Cached: 4 cached, 4 total`, `FULL TURBO` | passou

<details>
<summary>Evidência</summary>

```
make build (segunda vez) -> 0
 Tasks:    4 successful, 4 total
Cached:    4 cached, 4 total
  Time:    35ms >>> FULL TURBO
```

</details>

#### CLI-AMBIENTE-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis | interpretado como: `docker compose ps` com State running e Health healthy | observado os cinco | passou
- `*` o postgres informa versão na major 18 | interpretado como: `show server_version` | observado 18.6 | passou
- `*` o valkey informa versão na major 9 | interpretado como: `info server` | observado `valkey_version:9.1.3` | passou

<details>
<summary>Evidência</summary>

```
docker compose down (nenhum container do projeto); .env igual ao .env.example
docker compose up -d --wait -> 0 (22 s)
api running healthy | mailpit running healthy | postgres running healthy | valkey running healthy | web running healthy
show server_version -> 18.6 (Debian 18.6-1.pgdg13+2); valkey_version:9.1.3
```

</details>

#### CLI-AMBIENTE-02
- Veredito: passou
- ✓ appendonly é yes | observado yes
- ✓ appendfsync é everysec | observado everysec
- ✓ maxmemory-policy é noeviction | observado noeviction

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
- `*` o log da api mostra a recompilação e a nova subida | interpretado como: `File change detected`, `Found 0 errors` e `Nest application successfully started` depois da edição | observado as três em 2 s | passou
- `*` a imagem do serviço api não é reconstruída | interpretado como: Id da imagem `app-dev-api:local` e id do container iguais antes e depois | observado iguais | passou
- ✓ GET /api/health volta a responder 200 depois da nova subida | observado 200

<details>
<summary>Evidência</summary>

```
edição no host: comentário acrescentado ao fim de apps/api/src/main.ts (restaurado de cópia depois)
[9:24:11 PM] File change detected. Starting incremental compilation...
[9:24:12 PM] Found 0 errors. Watching for file changes.
{"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
GET /api/health -> 200; imagem igual: sim; container igual: sim
```

</details>

#### CLI-CONFIG-01 *
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | observado 1
- ✓ a saída nomeia BETTER_AUTH_SECRET | observado `BETTER_AUTH_SECRET (ausente)`
- `*` a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável | interpretado como: busca dos valores do `.env` (DATABASE_URL, REDIS_URL, WEB_ORIGIN, ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_HOST, SMTP_FROM) na saída | observado 0 ocorrências | passou

<details>
<summary>Evidência</summary>

```
.env sem BETTER_AUTH_SECRET; docker compose run --rm -T --no-deps api sh -c 'cd apps/api && node dist/main.js' -> 1
Configuração inválida; corrija no .env: BETTER_AUTH_SECRET (ausente)
```

</details>

#### CLI-CONFIG-02 *
- Veredito: passou
- `*` o `.env.example` declara todas as variáveis obrigatórias da API e da SPA | interpretado como: chaves sem padrão do `envSchema` de `apps/api/src/platform/config/env.ts` (NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, SMTP_HOST, SMTP_PORT, SMTP_FROM, e TRUSTED_PROXIES em produção) e `import.meta.env.VITE_API_URL` da SPA | observado todas declaradas | passou
- ✓ o `.env` é ignorado pelo git | observado `git check-ignore -v .env` -> `.gitignore:2:.env`
- `*` o `.env.example` não traz segredo real, só valores de desenvolvimento | interpretado como: valores de exemplo e gitleaks do `make check` sem achado | observado `BETTER_AUTH_SECRET=exemplo-local-troque-...`, senha `app` do Compose, ADMIN_PASSWORD de exemplo; gitleaks `ok` | passou

<details>
<summary>Evidência</summary>

```
git check-ignore -v .env -> .gitignore:2:.env	.env
.env.example: NODE_ENV, DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, TRUSTED_PROXIES, SMTP_HOST, SMTP_PORT, SMTP_FROM, ADMIN_EMAIL, ADMIN_PASSWORD, VITE_API_URL (opcionais comentadas)
make check: ok: nenhum segredo encontrado (gitleaks)
```

</details>

#### CLI-CONFIG-03
- Veredito: passou
- ✓ o processo da api termina com código diferente de 0 | observado 1
- ✓ a saída nomeia PORT | observado `PORT (inválida: ...)`

<details>
<summary>Evidência</summary>

```
docker compose run --rm -T --no-deps -e PORT=70000 api sh -c 'cd apps/api && node --import ./dist/instrumentation.js dist/main.js' -> 1
Configuração inválida; corrija no .env: PORT (inválida: Too big: expected number to be <=65535)
```

</details>

#### CLI-BANCO-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ existem as tabelas user, session, account e verification | observado as quatro e `_prisma_migrations`
- ✓ a tabela user tem as colunas role, banned, banReason e banExpires | observado as quatro
- `*` o histórico de migrações do Prisma registra a migração inicial | interpretado como: linha de `20261029000000_init` (única pasta em `prisma/migrations`) com `finished_at` preenchido | observado | passou

<details>
<summary>Evidência</summary>

```
banco efêmero recriado vazio (0 tabelas); make db-setup -> 0
pg_tables public: _prisma_migrations, account, session, user, verification
colunas de user: banExpires, banReason, banned, role
_prisma_migrations: 20261029000000_init | finished t
```

</details>

#### CLI-BANCO-02
- Veredito: passou
- ✓ prisma está na major 7 | observado 7.10.1
- ✓ @prisma/client está na major 7 | observado 7.10.1
- ✓ @prisma/adapter-pg está instalado na major 7 | observado 7.10.1

<details>
<summary>Evidência</summary>

```
pnpm --filter @app/api ls prisma @prisma/client @prisma/adapter-pg
dependencies: @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1; devDependencies: prisma@7.10.1
apps/api/node_modules/@prisma/adapter-pg/package.json version 7.10.1
```

</details>

#### CLI-ADMIN-01 *
- Veredito: passou
- ✓ existe exatamente uma conta com o e-mail de ADMIN_EMAIL | esperado 1, observado 1
- ✓ essa conta tem papel admin e e-mail verificado | observado role admin, emailVerified t
- ✓ essa conta não está banida | observado banned f, banExpires nulo
- `*` a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD | interpretado como: `account.password` da credencial diferente do texto | observado diferente (hash de 161 caracteres) | passou

<details>
<summary>Evidência</summary>

```
banco vazio; make db-setup -> 0
count(user where email=admin@example.com) -> 1
admin@example.com|admin|t|f|NULL|md5(hash)=d880934a...
account.password = ADMIN_PASSWORD -> f; length 161
```

</details>

#### CLI-ADMIN-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | observado 1
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash gravado igual antes e depois | observado igual | passou
- `*` nenhuma migração nova é aplicada | interpretado como: linhas de `_prisma_migrations` antes e depois e saída do `migrate deploy` | observado 1 -> 1, `No pending migrations to apply.` | passou

<details>
<summary>Evidência</summary>

```
make db-setup -> 0
antes:  admin@example.com|admin|t|f|NULL|d880934a098bbb198e05e484754c13c7
depois: admin@example.com|admin|t|f|NULL|d880934a098bbb198e05e484754c13c7
No pending migrations to apply.
seed: primeiro admin já existia com papel admin, e-mail verificado e sem banimento; nada alterado
```

</details>

#### CLI-ADMIN-03
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia ADMIN_EMAIL | observado `corrija no .env: ADMIN_EMAIL`
- ✓ nenhuma conta existe no banco | observado count 0

<details>
<summary>Evidência</summary>

```
banco vazio, ADMIN_EMAIL= no .env; make db-setup -> 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_EMAIL
select count(*) from "user" -> 0
```

</details>

#### CLI-ADMIN-04 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- `*` a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin | interpretado como: mensagem do seed com esse sentido | observado `seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado` | passou
- ✓ essa conta continua sem papel admin e com o e-mail não verificado | observado role nulo, emailVerified f
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual antes e depois | observado igual | passou
- ✓ continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL | observado 1

<details>
<summary>Evidência</summary>

```
dado:   admin@example.com|NULL|f|f|NULL|3da36a1347ab9329d94df17f6ab20738
make db-setup -> 2
seed: já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado
depois: admin@example.com|NULL|f|f|NULL|3da36a1347ab9329d94df17f6ab20738
```

</details>

#### CLI-ADMIN-05 *
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- `*` a saída diz que a conta admin com o e-mail de ADMIN_EMAIL está banida | interpretado como: mensagem do seed com esse sentido | observado `seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado` | passou
- ✓ a saída não contém o texto de ADMIN_EMAIL | observado 0 ocorrências de `admin@example.com`
- ✓ essa conta continua banida e com papel admin | observado banned t, role admin
- `*` a credencial de senha dessa conta não muda | interpretado como: md5 do hash igual antes e depois | observado igual | passou

<details>
<summary>Evidência</summary>

```
dado:   admin@example.com|admin|t|t|NULL|1e228e227d86b7866a23d6bf3c2b658b
make db-setup -> 2
seed: a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado
depois: admin@example.com|admin|t|t|NULL|1e228e227d86b7866a23d6bf3c2b658b
```

</details>

#### CLI-ADMIN-06
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia ADMIN_PASSWORD | observado `corrija no .env: ADMIN_PASSWORD`
- ✓ a saída não contém o texto de ADMIN_PASSWORD | observado 0 ocorrências da senha sem número usada
- ✓ nenhuma conta existe no banco | observado count 0

<details>
<summary>Evidência</summary>

```
banco vazio, ADMIN_PASSWORD com 13 letras e nenhum número; make db-setup -> 2
seed: configuração do primeiro admin inválida; corrija no .env: ADMIN_PASSWORD
select count(*) from "user" -> 0
```

</details>

#### CLI-LOGS-01 *
- Veredito: passou
- ✓ a linha é um objeto JSON completo | observado `json.loads` sem erro
- `*` a linha traz um identificador único da requisição, o status e o tempo de resposta | interpretado como: `req.id`, `res.statusCode` e `responseTime` | observado `41915867-a919-4025-be2a-0caa4dee896b`, 200, 2 | passou
- ✓ a linha não contém o valor do cabeçalho cookie | observado `"cookie":"[redigido]"`
- ✓ a linha não contém o valor do cabeçalho authorization | observado `"authorization":"[redigido]"`

<details>
<summary>Evidência</summary>

```
GET /api/health  Cookie: sessao=valor-do-cookie-secreto  Authorization: Bearer valor-do-authorization-secreto  X-Eval: logs01
{"level":30,...,"req":{"id":"41915867-a919-4025-be2a-0caa4dee896b","method":"GET","url":"/api/health","headers":{...,"cookie":"[redigido]","authorization":"[redigido]","x-eval":"logs01"},...},"res":{"statusCode":200,...},"responseTime":2,"msg":"request completed"}
```

</details>

#### CLI-LOGS-02
- Veredito: passou
- ✓ os dois identificadores de requisição são diferentes | observado `0cc3b605-b9b7-4d81-be85-e07fdc73fde8` e `4519faf8-8f89-4f61-b63e-49e916afa6bb`
- ✓ nenhum dos dois é um número inteiro | observado UUIDs

<details>
<summary>Evidência</summary>

```
req.id (logs02a) = 0cc3b605-b9b7-4d81-be85-e07fdc73fde8
req.id (logs02b) = 4519faf8-8f89-4f61-b63e-49e916afa6bb
```

</details>

#### CLI-LOGS-03
- Veredito: passou
- ✓ o e-mail da conta não aparece em nenhuma linha | observado 0 ocorrências de `admin@example.com` no log desde a subida
- ✓ a senha da conta não aparece em nenhuma linha | observado 0 ocorrências

<details>
<summary>Evidência</summary>

```
api recriada; POST /api/auth/sign-in/email com as credenciais de admin-inicial -> 200
docker compose logs api (59 linhas desde a subida): admin@example.com 0, senha 0
```

</details>

#### CLI-LOGS-04 *
- Veredito: passou
- `*` a linha registra o caminho /api/health | interpretado como: `req.url` igual a `/api/health` | observado `/api/health` (query removida) | passou
- ✓ o texto segredo-da-query não aparece na linha | observado ausente (0 linhas do log com o texto)

<details>
<summary>Evidência</summary>

```
GET /api/health?token=segredo-da-query
{"level":30,...,"req":{"id":"9bf6b34a-79a6-4c6f-8377-2b83ca9526a0","method":"GET","url":"/api/health",...},"res":{"statusCode":200,...}}
```

</details>

#### CLI-OTEL-01 *
- Veredito: passou
- `*` nenhuma linha registra erro ou aviso de exportação de telemetria | interpretado como: nenhuma linha com `otlp`, `export` ou `opentelemetry` e nenhuma linha JSON com level 40 ou mais | observado nenhuma | passou

<details>
<summary>Evidência</summary>

```
api recriada sem OTEL_EXPORTER_OTLP_ENDPOINT (printenv código 1); 10 GET /api/health -> 200
log desde a subida: 59 linhas (14 do pnpm/tsc, 45 JSON); level>=40: nenhuma; otlp/export/opentelemetry: nenhuma
```

</details>

#### CLI-OTEL-02 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces | interpretado como: POST em `/v1/traces` no receptor | observado em 1 s (`application/x-protobuf`, 16716 bytes) | passou
- ✓ a api continua respondendo 200 em GET /api/health | observado 200

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318, protocolo padrão
GET /api/health -> 200; receptor: /v1/traces application/x-protobuf 16716; /v1/logs x2
GET /api/health -> 200
```

</details>

#### CLI-OTEL-03 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição | interpretado como: span de servidor `GET /api/health` com `url.query` presente, recebido depois da requisição | observado em 0,6 s, trace `73551ed9...` | passou
- `*` o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos | interpretado como: busca em todos os atributos e no corpo de todas as exportações de traces | observado 0 ocorrências; `url.query` = `[redigido]` | passou

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
GET /api/health?token=segredo-da-query -> 200
span kind=2 "GET /api/health" http.route=/api/health url.path=/api/health url.query=[redigido] status 200
exportações /v1/traces com "segredo-da-query": 0
```

</details>

#### CLI-OTEL-04 *
- Veredito: passou
- ✓ a linha do log da api referente a essa requisição traz trace_id e span_id | observado `57d90f703fdd945efafdfbda47d068fa` e `c8a0f5ad48406f72`
- `*` em até 30 segundos o receptor registra um span de servidor dessa requisição com o mesmo trace_id da linha de log | interpretado como: span kind 2 com o mesmo traceId | observado `GET /api/health` com o mesmo traceId e spanId igual ao span_id do log, em 0,6 s | passou

<details>
<summary>Evidência</summary>

```
log: {"req":{...,"x-eval":"otel04"},...,"trace_id":"57d90f703fdd945efafdfbda47d068fa","span_id":"c8a0f5ad48406f72"}
receptor: span kind=2 "GET /api/health" traceId 57d90f70... spanId c8a0f5ad48406f72 url.path /api/health
```

</details>

#### CLI-OTEL-05
- Veredito: passou
- ✓ a linha do log da api referente a essa requisição não traz trace_id | observado ausente
- ✓ a linha do log da api referente a essa requisição não traz span_id | observado ausente

<details>
<summary>Evidência</summary>

```
api sem OTEL_EXPORTER_OTLP_ENDPOINT; GET /api/health (X-Eval: otel05)
linha: {"level":30,...,"req":{...},"res":{"statusCode":200,...},"responseTime":...,"msg":"request completed"} sem trace_id nem span_id
```

</details>

#### CLI-FILA-01 *
- Veredito: passou
- `*` em até 30 segundos o receptor registra o span de servidor dessa requisição | interpretado como: span kind 2 `POST /api/diagnostics/jobs` | observado em 0,8 s, status 202 | passou
- `*` o receptor registra um span de produtor da fila diagnostics com o mesmo trace_id do span de servidor | interpretado como: span kind 4 com `bullmq.queue.name` diagnostics no mesmo trace | observado `add diagnostics.run` (2e51c42c...) | passou
- `*` o receptor registra um span de consumidor da fila diagnostics com o mesmo trace_id, filho do span de produtor | interpretado como: span kind 5 com `parentSpanId` igual ao spanId do produtor | observado `process diagnostics` (3ebef9a3...) com parent 2e51c42c... | passou
- `*` nenhum atributo desses spans contém o corpo do job | interpretado como: nenhum atributo com `outcome` ou `succeed`, e nenhuma exportação de traces com o texto | observado 0 | passou

<details>
<summary>Evidência</summary>

```
SERVER POST /api/diagnostics/jobs d6de569793fa5519 trace a93a3bd7b30b593b040827eb8f316f73 202
  kind 4 add diagnostics.run      2e51c42c179f4286 parent b923baf399b5bca9 {bullmq.queue.name: diagnostics, bullmq.queue.operation: add, bullmq.job.id: 1}
  kind 5 process diagnostics      3ebef9a35cb83923 parent 2e51c42c179f4286 {bullmq.queue.operation: process, bullmq.job.attempts.made: 1}
  kind 1 complete diagnostics     56242b6f605cccba parent 3ebef9a35cb83923
atributos com o corpo do job: []
```

</details>

#### CLI-FILA-02 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.queue.job.failures da fila diagnostics com uma falha na tentativa 1 e uma na tentativa 2 | interpretado como: pontos com `queue` diagnostics e `attempt` 1 e 2, valor 1 cada | observado em 52 s | passou
- `*` o receptor registra app.queue.jobs da fila diagnostics com valor 1 no estado failed | interpretado como: ponto `state` failed | observado 1 | passou

<details>
<summary>Evidência</summary>

```
POST /api/diagnostics/jobs {"outcome":"fail"} -> 202 {"jobId":"1"}
+52s app.queue.job.failures {queue: diagnostics, attempt: 1} 1
+52s app.queue.job.failures {queue: diagnostics, attempt: 2} 1
+52s app.queue.jobs {queue: diagnostics, state: failed} 1 (waiting 0, active 0, delayed 0)
```

</details>

#### CLI-FILA-03 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.queue.jobs da fila diagnostics com valor 1 no estado waiting | interpretado como: ponto `state` waiting | observado 1 em 53 s | passou
- `*` a última exportação de app.queue.oldest_job.age da fila diagnostics registra pelo menos 20 segundos | interpretado como: valor do último ponto, unidade `s` | observado 52.736 | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_WORKER_ENABLED=false; POST {"outcome":"succeed"} -> 202 {"jobId":"1"}
+53s app.queue.jobs {queue: diagnostics, state: waiting} 1
+53s app.queue.oldest_job.age {queue: diagnostics} 52.736 (unit s)
```

</details>

#### CLI-METRICAS-01 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra http.server.request.duration com http.route igual a /api/health e status 200 | interpretado como: ponto do histograma com esses atributos | observado count 18 na exportação de 52 s | passou
- `*` o receptor registra http.server.request.duration com http.route igual a /api/v1/session e status 401 | observado count 1 | passou
- `*` nenhum atributo dessas métricas contém query string | interpretado como: nenhum valor de atributo das métricas `http*` com `?` ou `token` | observado nenhum | passou

<details>
<summary>Evidência</summary>

```
api recém-subida, http/json; 10 GET /api/health e 1 GET /api/v1/session (401)
dur {http.request.method: GET, url.scheme: http, network.protocol.version: 1.1, http.route: /api/health, http.response.status_code: 200} 18
dur {..., http.route: /api/v1/session, http.response.status_code: 401} 1
```

</details>

#### CLI-METRICAS-02 *
- Veredito: passou
- `*` o receptor registra db.client.connection.count com o atributo db.client.connection.state | observado estados `used` 1 e `idle` 0 | passou
- `*` o receptor registra app.valkey.memory.used com valor maior que 0 | observado 2594688 | passou
- `*` o receptor registra app.health.status igual a 1 para postgres e para valkey | observado 1 e 1 | passou

<details>
<summary>Evidência</summary>

```
exportação de métricas aos 52 s da subida (espera total 95 s)
db.client.connection.count {db.client.connection.state: used, ...} 1 / {state: idle} 0
app.valkey.memory.used {} 2594688
app.health.status {dependency: postgres} 1 / {dependency: valkey} 1
```

</details>

#### CLI-METRICAS-03 *
- Veredito: passou
- `*` o receptor registra app.health.status igual a 0 para valkey | interpretado como: exportações depois da parada | observado 0 aos 11 s e aos 71 s | passou
- `*` o receptor registra app.health.status igual a 1 para postgres | observado 1 nas mesmas exportações | passou
- `*` a api continua respondendo a GET /api/health | interpretado como: resposta HTTP aos 92 s da parada | observado 503 com `valkey down`, `postgres up` | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey; espera 92 s
+11s app.health.status {dependency: postgres} 1 / {dependency: valkey} 0
+71s app.health.status {dependency: postgres} 1 / {dependency: valkey} 0
GET /api/health -> 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
```

</details>

#### CLI-METRICAS-04 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra app.diagnostics.jobs.processed com valor 1 e outcome igual a succeed | observado 1 em 52 s | passou
- `*` o escopo de instrumentação dessa métrica se chama app | interpretado como: `scope.name` | observado `app` | passou
- `*` toda métrica recebida com nome começando por app. segue o formato app.<domínio>.<medida> em minúsculas | interpretado como: `^app\.[a-z0-9_]+\.[a-z0-9_.]+$`, aceitando medida com ponto | observado as 6 métricas `app.*` no formato | passou

<details>
<summary>Evidência</summary>

```
fila vazia antes da subida; DIAGNOSTICS_ENABLED=true; POST {"outcome":"succeed"} -> 202
+52s app.diagnostics.jobs.processed scope=app {outcome: succeed} 1
app.diagnostics.jobs.processed, app.health.status, app.queue.jobs, app.queue.oldest_job.age, app.valkey.memory.max, app.valkey.memory.used: todas no formato, escopo app
```

</details>

#### CLI-METRICAS-05 *
- Veredito: passou
- `*` em até 90 segundos o receptor registra http.server.request.duration com http.route igual a /api/auth/* e status 200 | observado count 1 em 56 s | passou
- `*` a série de http.server.request.duration com status 404 não tem http.route igual a /api/auth/* | interpretado como: ponto com status 404 sem `http.route` ou com valor diferente | observado sem `http.route` | passou

<details>
<summary>Evidência</summary>

```
api recém-subida; GET /api/auth/ok -> 200; GET /rota-inexistente -> 404 (HTML do Express)
+56s {http.route: /api/auth/*, http.response.status_code: 200} 1
+56s {http.response.status_code: 404} 1 (sem http.route)
```

</details>

#### CLI-BACKEND-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` os serviços api, web, postgres, valkey, mailpit e o backend de observabilidade estão em execução e saudáveis | interpretado como: `docker compose --profile observability ps` | observado os seis running healthy | passou
- `*` a interface web do backend responde em http://localhost:8001 | interpretado como: GET / e /api/health do Grafana | observado 200 e `database: ok` | passou
- `*` a porta 8001 do backend está publicada só no endereço 127.0.0.1 do host | interpretado como: `docker port` e `ss -ltn` | observado `3000/tcp -> 127.0.0.1:8001`, escuta só em `127.0.0.1:8001` | passou

<details>
<summary>Evidência</summary>

```
docker compose down (0 containers); docker compose --profile observability up -d --wait -> 0
observability running healthy 127.0.0.1:8001->3000/tcp (mais api, mailpit, postgres, valkey, web running healthy)
GET http://localhost:8001/ -> 200; /api/health -> {"database":"ok","version":"13.3.0",...}
ss -ltn: LISTEN 127.0.0.1:8001
```

</details>

#### CLI-BACKEND-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` o backend de observabilidade não está em execução | interpretado como: `docker compose --profile observability ps` sem observability | observado ausente | passou
- `*` só os serviços api, web, postgres, valkey e mailpit estão em execução | observado os cinco | passou

<details>
<summary>Evidência</summary>

```
docker compose --profile observability down (0 containers); docker compose up -d --wait -> 0
api running healthy | mailpit running healthy | postgres running healthy | valkey running healthy | web running healthy
```

</details>

#### CLI-BACKEND-03 *
- Veredito: passou
- `*` em até 90 segundos a consulta de traces do backend acha o trace dessa requisição | interpretado como: GET do trace pelo trace_id da linha de log no Tempo, pelo proxy de datasource do Grafana | observado 200 com span de servidor `GET /api/health` em 2 s | passou
- `*` a consulta de métricas do backend acha a série de http.server.request.duration com a rota /api/health | interpretado como: Prometheus `http_server_request_duration_seconds_count{http_route="/api/health"}` | observado 1 série | passou
- `*` a consulta de logs do backend acha a linha dessa requisição com o mesmo trace_id | interpretado como: Loki `{service_name=~".+"} | trace_id="<id>"` (metadado estruturado) | observado 1 linha com `req_headers_x_eval` da requisição, em 2 s | passou

<details>
<summary>Evidência</summary>

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://observability:4318
GET /api/health (X-Eval: backend03b) -> 200; trace_id do log 6428842d0b921d37e458ae761edeaad2
+2s tempo=200 prom_series=1 loki=1 ['backend03b']
primeira tentativa (backend03): Tempo e Prometheus acharam em 7 s e 17 s; a consulta de Loki por filtro de linha (|= trace_id) não acha, porque o trace_id é metadado estruturado; repetida com a consulta por metadado
```

</details>

#### CLI-AMOSTRAGEM-01 *
- Veredito: passou
- `*` em até 90 segundos a consulta de traces do backend acha vinte traces distintos de GET /api/health enviados depois do início do item | interpretado como: busca TraceQL no Tempo por `span.user_agent.original` próprio do item e `span.http.route = "/api/health"`, a partir do início do item | observado 20 traceIDs distintos em 36 s | passou

<details>
<summary>Evidência</summary>

```
20 x GET /api/health com User-Agent eval-amostragem-01
Tempo search { span.user_agent.original = "eval-amostragem-01" && span.http.route = "/api/health" }
+5s..+31s 0 (indexação); +36s traces=20 GET /api/health
```

</details>

#### CLI-AMOSTRAGEM-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` o arquivo tem uma política de amostragem probabilística de 10 por cento | interpretado como: política `type: probabilistic` com `sampling_percentage: 10` em `tail_sampling` | observado `amostra-10-por-cento` | passou
- `*` o arquivo tem uma política que guarda todo trace com status de erro | interpretado como: política `status_code` com `status_codes: [ERROR]` | observado `erros` | passou

<details>
<summary>Evidência</summary>

```
docker run --rm -v docker/observability:/cfg:ro --entrypoint /otel-lgtm/otelcol-contrib/otelcol-contrib grafana/otel-lgtm:0.39.0 validate --config=/cfg/collector-destino.yaml -> 0
otelcol-contrib version 0.164.0
tail_sampling.policies: erros (status_code [ERROR]); amostra-10-por-cento (probabilistic 10)
```

</details>

#### CLI-PAINEIS-01 *
- Veredito: passou
- `*` existe o painel API por interface, com vazão, taxa de 5xx e p95 por rota | interpretado como: painéis com esses títulos e consultas agrupadas por `http_route` | observado `Vazão por rota`, `Taxa de 5xx por rota`, `p95 por rota` em três linhas (v1, auth, demais) | passou
- `*` existe o painel Filas, com jobs por estado, idade do job pendente mais antigo e falhas por tentativa, por fila | interpretado como: painéis com esses títulos e consultas por `queue` | observado `Jobs por estado` (queue, state), `Idade do job pendente mais antigo` (queue), `Falhas por tentativa` (queue, attempt) | passou
- `*` os dois painéis constam como provisionados de arquivo | interpretado como: `meta.provisioned` true e `provisionedExternalId` | observado true, `api-interfaces.json` e `queues.json` | passou
- `*` cada painel corresponde a um arquivo versionado em docker/observability | observado `docker/observability/dashboards/api-interfaces.json` e `queues.json` no git | passou

<details>
<summary>Evidência</summary>

```
GET /api/search?type=dash-db -> app-api-interfaces "API por interface", app-queues "Filas" (pasta App)
GET /api/dashboards/uid/app-api-interfaces -> meta.provisioned true, provisionedExternalId api-interfaces.json
GET /api/dashboards/uid/app-queues -> meta.provisioned true, provisionedExternalId queues.json
dashboards.yaml: provider app, type file, allowUiUpdates false
```

</details>

#### CLI-PAINEIS-02 *
- Veredito: passou
- `*` a legenda das séries mostra o último valor e a média, sem o máximo | interpretado como: `options.legend.calcs` de cada série temporal | observado `['lastNotNull', 'mean']` nos 9 painéis | passou
- `*` a linha de limiar de 300 ms aparece só no p95 das rotas /api/v1 | interpretado como: `thresholdsStyle.mode` line com passo 0.3 | observado só em `p95 por rota` da linha v1; p95 de auth e demais com `off` | passou
- `*` as rotas de autenticação são selecionadas por http.route igual a /api/auth/* | interpretado como: seletor das consultas da linha de autenticação | observado `http_route="/api/auth/*"` nas três | passou

<details>
<summary>Evidência</summary>

```
p95 por rota (v1): thrStyle line, thr [None, 0.3]; expr ...{http_route=~"/api/v1(/.*)?"}
p95 por rota (auth): thrStyle off; expr ...{http_route="/api/auth/*"}
p95 por rota (demais): thrStyle off
Taxa de 5xx: thr 0.01 (linha de 1 por cento, não de 300 ms)
legend.calcs: ['lastNotNull', 'mean'] em todas as séries temporais
```

</details>

#### CLI-ALERTAS-01 *
- Veredito: passou
- `*` existe a regra de taxa de 5xx acima de 1 por cento por 5 minutos | observado `api-5xx-rate`, limiar gt 0.01, for 5m | passou
- `*` existe a regra de p95 acima de 300 ms por 5 minutos nas rotas /api/v1 | observado `api-v1-p95`, `http_route=~"/api/v1(/.*)?"`, gt 0.3, for 5m | passou
- `*` existe a regra, por fila, de job pendente há mais de 2 minutos ou de qualquer job falho | observado `queue-stalled`, `max by (queue)` de idade > 120 ou failed > 0 | passou
- `*` existe a regra, por dependência, de health check do PostgreSQL ou do Valkey falhando por 1 minuto | observado `dependency-down`, `min by (dependency) (app_health_status_ratio)` lt 1, for 1m | passou
- `*` as quatro regras constam como provisionadas de arquivo | interpretado como: `provenance` na API de provisionamento | observado `file` nas quatro | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/provisioning/alert-rules
api-5xx-rate     for 5m provenance file  B threshold gt 0.01
api-v1-p95       for 5m provenance file  B threshold gt 0.3
queue-stalled    for 0s provenance file  A clamp_max((max by (queue)(app_queue_oldest_job_age_seconds) > bool 120) + (max by (queue)(app_queue_jobs{state="failed"}) > bool 0), 1)
dependency-down  for 1m provenance file  A min by (dependency) (app_health_status_ratio) B lt 1
```

</details>

#### CLI-ALERTAS-02 *
- Veredito: passou
- `*` a regra de health check está em disparo para a dependência valkey | interpretado como: alerta `dependency-down` com `dependency=valkey` em `Alerting` na API de regras do Grafana | observado Alerting desde 21:33:10Z | passou
- `*` a regra de health check não está em disparo para a dependência postgres | observado `Normal` | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey; espera 242 s
GET /api/prometheus/grafana/api/v1/rules
dependency-down firing: valkey Alerting 2026-10-31T21:33:10Z 1; postgres Normal
```

</details>

#### CLI-ALERTAS-03 *
- Veredito: passou
- `*` em até 4 minutos a regra de fila está em disparo para a fila diagnostics | interpretado como: alerta `queue-stalled` com `queue=diagnostics` em `Alerting`, depois de esperar o alerta da fila sair do disparo de CLI-ALERTAS-04 | observado Alerting em 60 s (activeAt 21:45:10Z); `bull:diagnostics:failed` com 1 job | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_ENABLED=true, fila vazia antes da subida
antes: diagnostics=Normal@2026-10-31T21:44:10Z; email.send=Normal
21:44:20 POST {"outcome":"fail"} -> 202 {"jobId":"1"}
+60s diagnostics=Alerting@2026-10-31T21:45:10Z(1)
wait: 0, failed: 1, completed: 0
```

</details>

#### CLI-ALERTAS-04 *
- Veredito: passou
- `*` em até 5 minutos a regra de fila está em disparo para a fila diagnostics | interpretado como: alerta `queue-stalled` com `queue=diagnostics` em `Alerting`; antes do item, só `email.send` em Normal | observado Alerting em 191 s (activeAt 21:39:10Z) | passou
- `*` nenhum job da fila diagnostics está no estado failed | interpretado como: tamanho de `bull:diagnostics:failed` | observado 0 (wait 1) | passou

<details>
<summary>Evidência</summary>

```
DIAGNOSTICS_ENABLED=true, DIAGNOSTICS_WORKER_ENABLED=false, fila vazia antes da subida
antes: email.send=Normal
21:36:14 POST {"outcome":"succeed"} -> 202 {"jobId":"1"}
+191s diagnostics=Alerting@2026-10-31T21:39:10Z(1)
wait: 1, failed: 0, completed: 0
```

</details>

#### CLI-IMAGEM-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- ✓ a imagem final roda Node na major 26 | observado v26.13.0
- `*` a imagem final não contém os arquivos TypeScript do código-fonte da API | interpretado como: nenhum `*.ts` fora de `node_modules` (exceto `.d.ts`) | observado 0; `/app/apps/api` só com dist, node_modules e package.json | passou
- `*` a imagem final não contém o @nestjs/cli | interpretado como: nenhuma pasta `node_modules/@nestjs/cli` | observado 0 | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/api/Dockerfile -t eval-fundacao-api:2026-10-31t20-57-30z . -> 0 (estágios pruner, deps, deps-prod, builder, runner)
node --version -> v26.13.0
ts fora de node_modules: 0; nestjs-cli dirs: 0; ls /app/apps/api -> dist node_modules package.json
```

</details>

#### CLI-IMAGEM-02 *
- Veredito: passou
- `*` o container segue em execução | interpretado como: `State.Status` running e RestartCount 0 depois das requisições | observado running, 0 | passou
- `*` o log do container tem a linha JSON de subida da API sem erro | interpretado como: linha `Nest application successfully started` e nenhuma linha com level 50 ou mais | observado | passou
- ✓ todas as linhas do log do container são objetos JSON | observado 31 linhas, 0 não JSON
- ✓ GET /api/health nesse container responde 200 | observado 200

<details>
<summary>Evidência</summary>

```
docker run --network <rede do Compose> --env-file .env -e NODE_ENV=production -e TRUSTED_PROXIES=172.16.0.0/12 -p 3100:3000 eval-fundacao-api:...
GET /api/auth/ok -> 200 {"ok":true}; GET /api/health -> 200 {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
{"level":30,...,"context":"NestApplication","msg":"Nest application successfully started"}
running restart=0; 31 linhas, linhas não JSON: 0, level>=50: nenhuma
```

</details>

#### CLI-IMAGEM-03 *
- Veredito: passou
- ✓ o código de saída da construção é 0 | esperado 0, observado 0
- `*` a imagem final não contém o executável node | interpretado como: `command -v node` e busca de arquivo `node` | observado ausente | passou
- `*` uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA | interpretado como: 200 text/html com corpo igual ao de /index.html | observado igual (`<html lang="pt-BR">`, script `/assets/index-*.js`) | passou

<details>
<summary>Evidência</summary>

```
docker build -f apps/web/Dockerfile -t eval-fundacao-web:2026-10-31t20-57-30z . -> 0 (runner nginx)
command -v node -> node ausente
docker run -p 8180:80; GET /uma-rota-qualquer -> 200 text/html; diff com /index.html: igual
```

</details>

#### CLI-CI-01 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída termina com a linha de que todas as verificações passaram | observado última linha `ok: todas as verificações passaram` | passou
- ✓ a saída não contém o aviso de alvo não implementado | observado 0 ocorrências

<details>
<summary>Evidência</summary>

```
CI=true make check -> 0
ok: nome do branch 'docs/observabilidade-fundacao'
...
ok: todas as verificações passaram
```

</details>

#### CLI-CI-02 *
- Veredito: passou
- `*` o arquivo instala Node na major 26 antes do passo make check | observado `actions/setup-node` com `node-version: 26`, antes de `make check` | passou
- `*` o arquivo instala o pnpm na versão do packageManager antes do passo make check | interpretado como: `pnpm/action-setup` sem `version`, que lê o `packageManager` | observado | passou
- `*` toda action do arquivo está fixada por SHA completo com comentário da versão | interpretado como: cada `uses:` com 40 hexadecimais e `# vX` | observado as 3 (checkout v7.0.1, action-setup v6.1.0, setup-node v7.1.0); `make check` com `ok: actions fixadas por SHA` | passou

<details>
<summary>Evidência</summary>

```
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0   (sem version: lê packageManager)
uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0   node-version: 26
- name: make check (último passo)
```

</details>

#### CLI-CAMADAS-01 *
- Veredito: passou
- ✓ o controller de GET /api/v1/session fica em presentation/get-session | observado `presentation/get-session/get-session.controller.ts` com `@Controller('session')` e `@Get()`
- `*` a raiz do módulo tem só o accounts.module.ts, o auth.ts e pastas de camada | interpretado como: `ls -p` da raiz | observado `accounts.module.ts`, `auth.ts`, `infra/`, `presentation/` | passou
- ✓ não há pasta além de domain, application, infra e presentation no módulo | observado só infra e presentation

<details>
<summary>Evidência</summary>

```
ls -p apps/api/src/modules/accounts -> accounts.module.ts auth.ts infra/ presentation/
presentation/get-session: get-session.controller.ts, get-session.controller.spec.ts, session-response.dto.ts
```

</details>

#### CLI-CAMADAS-02 *
- Veredito: passou
- ✓ o código de saída é 0 | esperado 0, observado 0
- `*` a saída mostra a análise de dependências de @app/api sem violação | observado `✔ no dependency violations found (118 modules, 301 dependencies cruised)` | passou

<details>
<summary>Evidência</summary>

```
make lint -> 0
@app/api:lint: ✔ no dependency violations found (118 modules, 301 dependencies cruised)
```

</details>

#### CLI-CAMADAS-03
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra violada | observado `domain-so-importa-domain` e `prisma-gerado-so-em-infra-e-platform`
- ✓ a saída cita o arquivo novo de domain/ | observado `src/modules/accounts/domain/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
domain/eval-violacao.ts: import type { PrismaClient } from '../../../generated/prisma/client.js'
error prisma-gerado-so-em-infra-e-platform: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
error domain-so-importa-domain: src/modules/accounts/domain/eval-violacao.ts → src/generated/prisma/client.ts
```

</details>

#### CLI-CAMADAS-04
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra violada | observado `application-so-importa-domain` e `domain-e-application-nao-importam-platform`
- ✓ a saída cita o arquivo novo de application/ | observado `src/modules/accounts/application/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
error domain-e-application-nao-importam-platform: src/modules/accounts/application/eval-violacao.ts → src/platform/prisma/prisma.service.ts
error application-so-importa-domain: src/modules/accounts/application/eval-violacao.ts → src/platform/prisma/prisma.service.ts
```

</details>

#### CLI-CAMADAS-05
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra violada | observado `presentation-nao-importa-infra`
- ✓ a saída cita o controller de presentation/get-session | observado `src/modules/accounts/presentation/get-session/get-session.controller.ts`

<details>
<summary>Evidência</summary>

```
error presentation-nao-importa-infra: src/modules/accounts/presentation/get-session/get-session.controller.ts → src/modules/accounts/infra/eval-violacao.ts
```

</details>

#### CLI-CAMADAS-06
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra violada | observado `modulo-nao-importa-camadas-de-outro`
- ✓ a saída cita o arquivo do segundo módulo | observado `src/modules/evalsegundo/presentation/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
error modulo-nao-importa-camadas-de-outro: src/modules/evalsegundo/presentation/eval-violacao.ts → src/modules/accounts/presentation/get-session/get-session.controller.ts
```

</details>

#### CLI-CAMADAS-07
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra violada | observado `platform-nao-importa-modules`
- ✓ a saída cita o arquivo novo de platform/ | observado `src/platform/eval-violacao.ts`

<details>
<summary>Evidência</summary>

```
error platform-nao-importa-modules: src/platform/eval-violacao.ts → src/modules/accounts/accounts.module.ts
```

</details>

#### CLI-CAMADAS-08
- Veredito: passou
- ✓ o código de saída é diferente de 0 | observado 2
- ✓ a saída nomeia a regra de ciclo | observado `sem-ciclo`
- ✓ a saída cita os dois arquivos novos | observado `src/platform/eval-ciclo-a.ts` e `src/platform/eval-ciclo-b.ts`

<details>
<summary>Evidência</summary>

```
error sem-ciclo: src/platform/eval-ciclo-a.ts →
    src/platform/eval-ciclo-b.ts →
    src/platform/eval-ciclo-a.ts
```

</details>

### UI

#### UI-INICIO-01 *
- Veredito: passou
- ✓ a página mostra, em português do Brasil, que não há sessão aberta | observado `Nenhuma sessão aberta.`
- ✓ o elemento html tem lang igual a pt-BR | observado `pt-BR`
- `*` o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session | interpretado como: mensagens de nível error do console | observado 1 erro, `Failed to load resource: ... 401 (Unauthorized) @ http://localhost:3000/api/v1/session` | passou
- ✓ base visual, mecânica: nenhuma imagem na página; 13 elementos visíveis dentro da janela, sem corte por overflow e com `elementFromPoint` no próprio elemento
- `*` base visual, screenshot | interpretado como: corte, sobreposição ou layout quebrado no topo e no conteúdo | observado nenhum | passou

<details>
<summary>Evidência</summary>

```
playwright-cli open http://localhost:5173/ (sem cookie: "No cookies found")
lang pt-BR; texto: "App / Entrar / Criar conta / App / Nenhuma sessão aberta. / Ainda não tem conta? Cadastre-se."
[ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:3000/api/v1/session
requests: [GET] http://localhost:3000/api/v1/session => [401]
base visual: imgs [], visiveis 13, problems []
screenshot: /tmp/evaluator-fundacao-2026-10-31T20-57-30Z/ui-inicio-01.png (apagado na derrubada)
```

</details>

#### UI-INICIO-02 *
- Veredito: passou
- ✓ a página mostra que há sessão aberta com o papel admin | observado `Sessão aberta com o papel admin.`
- `*` nenhuma requisição à API é bloqueada por CORS | interpretado como: requisições à API com resposta e nenhum erro de CORS no console | observado `GET /api/v1/session => 200`, 0 erros | passou
- ✓ base visual, mecânica: nenhuma imagem; 9 elementos visíveis sem problema
- `*` base visual, screenshot | observado sem corte nem sobreposição | passou

<details>
<summary>Evidência</summary>

```
sessao-admin: POST /api/auth/sign-in/email -> 200; GET /api/v1/session com o cookie -> 200 {"userId":"XEmJ...","role":"admin"}
cookie-set better-auth.session_token=<mascarado> --domain=localhost --path=/ --httpOnly; goto http://localhost:5173/
texto: "App / App / Sessão aberta com o papel admin."; console: Errors 0
requests: [GET] http://localhost:3000/api/v1/session => [200] OK
```

</details>

#### UI-INICIO-03
- Veredito: passou
- ✓ a página mostra, em português do Brasil, que a página não foi encontrada | observado `Página não encontrada`
- ✓ base visual, mecânica: nenhuma imagem; 12 elementos visíveis sem problema
- ✓ base visual, screenshot: sem corte nem sobreposição

<details>
<summary>Evidência</summary>

```
goto http://localhost:5173/nao-existe
texto: "App / Entrar / Criar conta / Página não encontrada / O endereço que você abriu não existe neste aplicativo. / Voltar ao início"
console: Errors 0; base visual: problems []
```

</details>

#### UI-INICIO-04 *
- Veredito: passou
- ✓ a página mostra, em português do Brasil, que o servidor não respondeu | observado `O servidor não respondeu` e `Não foi possível falar com a API. Tente de novo em alguns instantes.`
- `*` a página não fica em branco | interpretado como: texto visível e elementos visíveis no corpo | observado 12 elementos visíveis com o cabeçalho e a mensagem | passou
- ✓ base visual, mecânica: nenhuma imagem; 12 elementos visíveis sem problema
- `*` base visual, screenshot | observado sem corte nem sobreposição | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api; GET /api/health -> 000 (conexão recusada)
cookie-clear; goto http://localhost:5173/
texto: "App / Entrar / Criar conta / O servidor não respondeu / Não foi possível falar com a API. Tente de novo em alguns instantes. / Voltar ao início"
[ERROR] Failed to load resource: net::ERR_CONNECTION_REFUSED @ http://localhost:3000/api/v1/session
base visual: imgs [], visiveis 12, problems []
api religada na derrubada (healthy)
```

</details>

#### UI-RECARGA-01 *
- Veredito: passou
- `*` a página mostra o texto novo sem recarga manual | interpretado como: texto novo no DOM e a marca posta em `window` antes da edição ainda presente (sem recarga da página) | observado texto novo em 1 s, marca presente | passou
- ✓ base visual, screenshot: sem corte nem sobreposição

<details>
<summary>Evidência</summary>

```
página na raiz com sessão; window.__semRecarga = 'marca'
edição no host de apps/web/src/routes/root/route.tsx: "Sessão aberta com o papel" -> "Sessão aberta (recarga avaliada) com o papel" (restaurado de cópia depois)
+1s {"t":true,"m":"marca"}
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
| Fila diagnostics vazia entre itens | 6 | apagar as chaves `bull:diagnostics*` no Valkey com a api parada, antes de subi-la |
| Gates | 1 | contrato: `make check` e `make build` na raiz, com o `.env` do ambiente efêmero |
| Subida da api com configuração inválida | 5 | `apps/api/package.json`: `node dist/main.js` (e `start:prod`) num `docker compose run` do serviço api |
| Receptor OTLP | 6 | servidor HTTP em Python na porta 4318 do host; `compose.yaml` documenta `host.docker.internal:4318` |
| Backend local de observabilidade | 5 | `compose.yaml` (perfil observability, grafana/otel-lgtm 0.39.0, porta 127.0.0.1:8001) e `.env.example` (`http://observability:4318`); consultas pelo proxy de datasources do Grafana (Tempo, Prometheus, Loki) e pelas APIs de dashboards, provisionamento de alertas e estado das regras |
| Validação do coletor do destino | 5 | comentário de `docker/observability/collector-destino.yaml`: `otelcol-contrib validate` da imagem do backend |
| Imagens | 5 | `apps/api/Dockerfile` e `apps/web/Dockerfile` construídos da raiz, com api e web do Compose paradas; tags `eval-fundacao-<app>:<execução>` |
| Navegador | 3 | spec, Verificação por superfície: `playwright-cli` com `.playwright/cli.config.json` (Chromium) |
| Limpeza entre itens de UI | 6 | `cookie-clear` e navegação nova; api parada e religada só em UI-INICIO-04 |
| Recarga no desenvolvimento | 5 | edição no host de `apps/api/src/main.ts` e `apps/web/src/routes/root/route.tsx`, restaurados de cópia |
| Base visual | 6 | `eval` no navegador (imagens, caixas na janela, `elementFromPoint`, corte por `overflow`) e screenshot por item |

## Limpeza e ambiente

- Sobras removidas: banco `eval_fundacao_2026_10_31t20_38_28z` e pasta `/tmp/evaluator-fundacao-2026-10-31T20-38-28Z` da avaliação interrompida; o `.env` apontava para esse banco e voltou ao `.env.example` (DATABASE_URL em `postgres:5432/app`) antes de CLI-AMBIENTE-01. Nenhum `processos.lock` com PID vivo.
- Derrubada: completa. Navegador fechado; receptor OTLP parado; containers `eval-fundacao-*` removidos e as duas imagens `eval-fundacao-*:2026-10-31t20-57-30z` apagadas; chaves `bull:diagnostics*` apagadas; serviço observability parado e removido; `.env` restaurado (igual ao `.env.example`) e os serviços recriados com ele (api de novo em `postgres:5432/app`, saúde 200); banco `eval_fundacao_2026_10_31t20_57_30z` apagado; arquivos de código editados restaurados; pasta temporária apagada.

## Avisos

- Avaliado com 1 arquivo fora de commit, `docs/features/fundacao/orquestracao.md`, documento desta pasta e não código avaliado.
- `validate.py` do spec-writer: 4 avisos (componente 'API NestJS' fora da tabela do HLD; 23 hipóteses; 7 fases e 34 passos acima do orçamento).
- Os gates `make check` e `make build`, e o `make build` de CLI-STACK-04 e 05, vieram do cache local do Turborepo; `make test` de CLI-STACK-03 rodou com `TURBO_FORCE=true` para os testes rodarem de fato. Os itens de camadas invalidaram o cache do lint de @app/api e rodaram o dependency-cruiser de fato; CLI-STACK-01 e CLI-CAMADAS-02 reproduziram do cache a saída do mesmo código.
- CLI-STACK-04 moveu o conteúdo de `apps/api/dist` e as pastas `apps/web/dist` e `packages/contracts/dist` para a pasta da avaliação; o `make build` os restaurou do cache.
- CLI-CONFIG-01 e 03 sobem o processo da aplicação num `docker compose run` do serviço api, não o `nest start --watch` do serviço, que não termina quando a aplicação sai.
- CLI-IMAGEM-01 e 03 construíram do working tree, não de um clone novo; os únicos arquivos fora de commit eram `.env` e o `orquestracao.md`.
- CLI-BACKEND-03: a primeira consulta de Loki usou filtro de linha pelo trace_id e não achou nada, porque o backend guarda o trace_id como metadado estruturado; o item foi repetido com uma requisição nova e a consulta por metadado, que achou a linha em 2 s.
- O `lint` de @app/api tem 1 aviso do oxlint (`no-new` em `src/modules/email/infra/queue/bullmq-email.queue.spec.ts`), que não reprova o gate.
- O `playwright-cli` grava snapshots e logs de console em `.playwright-cli/` na raiz, pasta ignorada pelo git; os arquivos desta avaliação ficaram lá.

## Motivo do aborto

Nenhum.
