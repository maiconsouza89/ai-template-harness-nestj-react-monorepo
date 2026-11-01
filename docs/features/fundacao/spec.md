# Spec: fundação

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.3.0
Complexidade: complexa

---

## Escopo

Incluído
- Monorepo: workspaces do pnpm 12 orquestrados pelo Turborepo, com apps/api, apps/web e packages/contracts, Node 26 e TypeScript 6 (ADR-0002, ADR-0012, ADR-0013, ADR-0020).
- Scripts do contrato da stack: scripts/lint.sh, scripts/format.sh, scripts/test.sh e scripts/build.sh delegando ao Turborepo (ADR-0002).
- Ambiente local: Docker Compose com api, web, postgres, valkey e mailpit, com o código montado e hot reload (ADR-0006, ADR-0014, ADR-0016).
- Configuração e segredos: .env.example versionado e validação das variáveis na subida da API, que falha se faltar alguma (HLD, Gestão de segredos).
- Banco: PostgreSQL 18 com Prisma 7 e a migração inicial com as tabelas do Better Auth e os campos do plugin admin (ADR-0007, ADR-0008, ADR-0010).
- Preparo do banco: alvo make db-setup que aplica as migrações e cria o primeiro admin a partir do .env, de forma idempotente (PRD, Decisão primeiro admin criado na instalação).
- Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010).
- Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade).
- Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018).
- Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019).
- Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020).
- SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012).
- Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005).
- CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação).
- Regra de dependência na API: Módulo Contas nas camadas da Clean Architecture e dependency-cruiser no lint de apps/api barrando import entre camadas, entre módulos e ciclos (ADR-0025, ADR-0026).
- Correlação de logs e traces: com a exportação ligada, as linhas de log da API trazem o trace_id e o span_id do span ativo (ADR-0018, ADR-0019).
- Tracing de filas: contexto W3C propagado do enfileiramento ao processamento em toda fila do BullMQ, ligado no módulo de filas da plataforma (HLD, Observabilidade; ADR-0015, ADR-0019).
- Métricas de componente: requisições HTTP por rota e status, pool do PostgreSQL, memória do Valkey, estado do health check e, por fila do BullMQ, jobs por estado, idade do job pendente mais antigo e falhas por tentativa (HLD, Observabilidade; ADR-0019).
- Métricas de negócio: Meter da aplicação em platform/ com a convenção de nome app.<domínio>.<medida>, onde cada RF registra as suas (HLD, Observabilidade).
- Fila de diagnóstico: fila e rota anônima POST /api/diagnostics/jobs, ligadas só por DIAGNOSTICS_ENABLED e fora de produção, para exercitar a telemetria de filas sem depender de módulo de funcionalidade (HLD, Observabilidade).
- Backend local de observabilidade: serviço do Compose no perfil observability que recebe OTLP da API e guarda traces, métricas e logs com amostragem de 100 por cento (HLD, Observabilidade; ADR-0029).
- Painéis e alertas como código: painel por interface, painel das filas e os quatro alertas do HLD, provisionados no backend local a partir de arquivos versionados (HLD, Dashboards e alertas; ADR-0029).
- Amostragem do destino: configuração de referência do coletor com 10 por cento dos traces e 100 por cento dos traces com erro (HLD, Tracing).

Entradas
- nenhuma: a fundação não depende de RF.

Saídas
- `PrismaService` e o `schema.prisma` com as tabelas do Better Auth, que todos os RFs estendem com migrações novas.
- A instância do Better Auth no Módulo Contas, com o guard global e os decorators `@Session()` e `@AllowAnonymous()`, que RF-001 a RF-007 configuram (envio de e-mail, bloqueio, rate limit).
- A conexão com o Valkey (`ioredis` 5) exposta como provider, que o Módulo E-mail (BullMQ) e o rate limit do Better Auth usam a partir do RF-001.
- `GET /api/v1/session` e o esquema da resposta em Contratos, que a SPA usa nas rotas protegidas de todos os RFs com tela.
- O pacote Contratos (`@app/contracts`), onde cada RF acrescenta os próprios esquemas.
- O roteador da SPA com a rota raiz e a página de erro, onde cada RF pendura as próprias rotas.
- A configuração do dependency-cruiser em `apps/api/.dependency-cruiser.cjs`, que cobre todo módulo novo em `apps/api/src/modules/` sem edição, porque as regras capturam o nome do módulo pelo caminho.
- As convenções de pastas, testes, seed, fixtures, configuração de teste e dublês da seção "Convenções para as features".
- O `AppMetrics` em `apps/api/src/platform/telemetry/`, com o `Meter` da aplicação, onde cada RF registra as próprias métricas de negócio no padrão `app.<domínio>.<medida>`: os bloqueios de login por hora (RF-003) e os cadastros sem confirmação após 24 horas (RF-001 ou RF-002).
- A telemetria de filas ligada no `BullModule.forRootAsync` de `platform/queue/`: toda fila registrada por um módulo, inclusive a `email.send`, herda a propagação do trace e entra nas métricas de fila sem código próprio.
- Os painéis e as regras de alerta em `docker/observability/`, que agrupam por fila e por rota, então uma fila ou uma rota nova aparece neles sem edição.

Fora desta spec
- Telas e fluxos de cadastro, confirmação, entrar, sair e recuperação de senha (RF-001 a RF-005): a fundação só monta a biblioteca e a borda.
- Módulo E-mail, fila `email.send` e o callback de envio do Better Auth (RF-001).
- Rate limit por IP com armazenamento no Valkey e bloqueio por e-mail (RF-001, RF-003).
- Perfil em `/api/v1/me` (RF-006) e troca de senha (RF-007).
- Módulo Tarefas, o módulo de referência com domínio, casos de uso e repositório (RF-008 a RF-011).
- Módulo Usuários, situação anterior para reativação e trilha de auditoria (RF-012, RF-013).
- Suíte E2E versionada no repositório: decisão da entrevista, a verificação de tela fica no contrato.
- As métricas de negócio em si (bloqueios de login por hora, cadastros sem confirmação após 24 horas): cada uma pertence ao RF que gera o evento, sobre o `AppMetrics` da fundação.
- Telemetria da SPA no navegador: o HLD mede só a API.
- Painéis e alertas no ambiente de destino: os arquivos de `docker/observability/` servem de ponto de partida, e importá-los no destino é de quem implanta.

---

## Regras e fluxos

Regras
- Toda rota da API exige sessão, salvo as marcadas com `@AllowAnonymous()`; na fundação, só `GET /api/health` e as rotas do próprio Better Auth em `/api/auth` (HLD, Segurança).
- A API não sobe sem todas as variáveis obrigatórias, e a mensagem de erro nomeia a variável ausente sem imprimir o valor de nenhuma (HLD, Gestão de segredos).
- Nenhum log contém os campos `email`, `name`, `password`, `cookie` nem `authorization` em texto puro, nem a query string das requisições recebidas; o log de acesso registra só o caminho da URL, e o span de servidor do OpenTelemetry redige `url.query` (PRD, Compliance; ADR-0018; ADR-0019).
- O cadastro por e-mail e senha nasceu fechado na fundação (`disableSignUp`), e o RF-001 o abriu ao montar o fluxo; a fundação não promete mais nada sobre essa rota, e o item que provava o cadastro fechado saiu do contrato na revisão de 2026-10-31.
- O rate limit do Better Auth nasceu desligado na fundação (`rateLimit.enabled = false`), porque o padrão da biblioteca em produção é um balde em memória por processo, que não vale com réplicas (HLD, API sem estado); o RF-001 o ligou com armazenamento no Valkey e `trustedProxies` (HLD, Valkey).
- O `requestId` é único entre réplicas e processos, nunca o contador por processo do pino (ADR-0018).
- Sem `OTEL_EXPORTER_OTLP_ENDPOINT`, a API não exporta telemetria nem registra erro por isso (ADR-0019).
- O documento OpenAPI não é publicado com `NODE_ENV=production` (HLD, Interfaces públicas).
- O CORS da API aceita credenciais só da origem da SPA (`WEB_ORIGIN`), e o Better Auth usa a mesma origem em `trustedOrigins` (HLD, Segurança).
- O cookie de sessão é `httpOnly`; `secure` fora do ambiente local; o domínio do cookie vem de `COOKIE_DOMAIN` quando definido, para o `crossSubDomainCookies` do HLD (HLD, Segurança).
- O cookie cache do Better Auth fica desligado, para a revogação de sessão valer na próxima requisição (HLD, Sincronização e cache).
- O Valkey roda com `appendonly yes`, `appendfsync everysec` e `maxmemory-policy noeviction` (ADR-0014).
- O preparo do banco é idempotente: rodar `make db-setup` de novo não duplica o admin nem falha (PRD, Decisão primeiro admin criado na instalação).
- O primeiro admin nasce com papel admin, e-mail verificado, sem banimento, e a senha de `ADMIN_PASSWORD` gravada com o hash do Better Auth, nunca em texto puro (PRD, Segurança e autorização).
- `ADMIN_PASSWORD` segue a regra de senha do PRD (mínimo de 8 caracteres, com letra e número; PRD, Decisão regra de senha): o seed grava o hash por `ctx.password.hash`, que não passa pela validação do Better Auth, então confere a regra ele mesmo antes de tocar no banco.
- Se a conta de `ADMIN_EMAIL` já existe com papel admin, e-mail verificado e sem banimento em vigor, o seed não muda nada nela, nem a senha. Se existe com papel admin mas banida (`banned` verdadeiro e `banExpires` nulo ou no futuro), o seed termina com código diferente de zero dizendo que a conta do admin está banida, e não a altera: desbanir em silêncio desfaria a decisão de um admin. Banimento com `banExpires` vencido não conta, porque o plugin admin o retira na próxima criação de sessão. Se existe sem papel admin ou sem e-mail verificado, o seed termina com código diferente de zero dizendo que já há conta com esse e-mail sem papel admin, e não altera a conta: promover em silêncio uma conta criada antes do `make db-setup` entregaria o admin a quem registrou o e-mail primeiro.
- `prisma` e `@prisma/client` ficam em `^7` e o `ioredis` em `^5`, e o TypeScript na major 6 em todo o monorepo (ADR-0008, ADR-0014, ADR-0020).
- O pnpm é instalado na versão do `packageManager` do `package.json` raiz em Compose, imagens e CI, nunca por `corepack enable` (ADR-0012, ADR-0013).

Observabilidade (HLD, Observabilidade; ADR-0018, ADR-0019)
- Sem `OTEL_EXPORTER_OTLP_ENDPOINT` nada desta seção roda: sem SDK, sem `trace_id` no log, sem métricas e sem leitura periódica do health check ou do Valkey (ADR-0019; HLD, risco de excesso de infraestrutura).
- Com a exportação ligada, toda linha de log escrita dentro de um span traz `trace_id`, `span_id` e `trace_flags`, pela instrumentação do pino que o pacote de auto-instrumentação já liga; a redação da fundação continua valendo sobre essas linhas.
- Toda fila do BullMQ registrada por qualquer módulo propaga o contexto W3C do `add` ao processamento, e o span do processamento é filho do span que enfileirou (docs.bullmq.io, Telemetry, Traces).
- Nenhum atributo de span, de métrica ou de log exportado traz o conteúdo do job nem dado pessoal; os atributos de fila são só o nome da fila, o estado e o número da tentativa.
- O nome de toda métrica criada pela aplicação começa com `app.`, segue `app.<domínio>.<medida>` em minúsculas com ponto e usa unidade da UCUM (`s`, `By`, `{job}`); métrica que vem de instrumentação mantém o nome da convenção semântica do OpenTelemetry.
- O backend local recebe 100 por cento dos traces. A regra do HLD, 10 por cento dos traces e 100 por cento dos com erro, decidida no coletor por amostragem de cauda, vale no destino e fica em `docker/observability/collector-destino.yaml`, sem rodar no local.
- O backend local só sobe com `--profile observability`: o `docker compose up` sem perfil continua com os cinco serviços da fundação e o tempo de subida da meta de 15 minutos não muda (PRD, Objetivos e métricas).
- Os quatro alertas do HLD avaliam a cada minuto: taxa de 5xx acima de 1 por cento por 5 minutos; p95 acima de 300 ms por 5 minutos nas rotas `/api/v1`; job pendente há mais de 2 minutos ou qualquer job falho, por fila; health check do PostgreSQL ou do Valkey falhando por 1 minuto.
- A fila de diagnóstico e a rota `POST /api/diagnostics/jobs` só existem com `DIAGNOSTICS_ENABLED=true` e `NODE_ENV` diferente de `production`; sem isso a rota responde 404 e a fila não é registrada.

Fluxo técnico do trace de um job
1. A requisição chega à API NestJS e a instrumentação HTTP abre o span de servidor.
2. Um módulo chama `queue.add`; o `BullMQOtel` do `platform/queue/` grava o contexto do trace nos metadados do job e abre o span de produtor.
3. O worker do mesmo processo pega o job no Redis, extrai o contexto e abre o span de consumidor como filho do span de produtor.
4. O SDK exporta os spans por OTLP; o backend local (ou o coletor do destino) os junta num trace só.
5. Na leitura periódica das métricas, o `QueueMetrics` pede ao Redis as contagens de cada fila registrada e a idade do job pendente mais antigo, e o `AppMetrics` exporta junto as métricas de negócio.

Regra de dependência na API (ADR-0025, ADR-0026)
- Todo módulo em `apps/api/src/modules/<funcionalidade>/` tem só as pastas de camada `domain/`, `application/`, `infra/` e `presentation/`, cada uma criada quando o módulo precisa dela, e na raiz o `<funcionalidade>.module.ts` e os arquivos de composição de biblioteca que ele monta (no Módulo Contas, `auth.ts`).
- `domain/` não importa nada fora do próprio `domain/` (ADR-0025).
- `application/` importa só o `domain/` do próprio módulo e, do framework, `@nestjs/common` para o `@Injectable()` (ADR-0025).
- `presentation/` não importa `infra/` de módulo nenhum; pode importar o `domain/` e o `application/` do próprio módulo, os arquivos da raiz do próprio módulo, `platform/` e Contratos.
- Nenhum arquivo de um módulo importa as pastas de camada de outro módulo; a fronteira pública de um módulo é o `<funcionalidade>.module.ts`.
- `platform/` é infraestrutura transversal: `infra/`, `presentation/` e a raiz dos módulos podem importá-la; `domain/` e `application/` não; `platform/` nunca importa `modules/`.
- O cliente gerado do Prisma (`apps/api/src/generated/`) só é importado por `infra/` e `platform/`.
- Nenhum ciclo de import em `apps/api/src/`.
- Import só de tipo conta como import: a análise roda com `tsPreCompilationDeps` ligado, para um `import type` do Prisma em `domain/` também falhar.
- Os arquivos `*.spec.ts` ao lado do código seguem as mesmas regras do arquivo que testam. (hipótese)
- Violação faz `make lint` terminar com código diferente de zero, com o nome da regra e o par de arquivos na saída (ADR-0026).

Fluxo técnico da subida local
1. `make setup` e `cp .env.example .env`; o dev ajusta `ADMIN_EMAIL` e `ADMIN_PASSWORD` se quiser.
2. `docker compose up -d` sobe postgres, valkey, mailpit, api e web; api e web montam o código e rodam em watch.
3. `make db-setup` chama `scripts/db-setup.sh`, que espera o postgres, aplica `prisma migrate deploy` no container da api e roda o seed do primeiro admin.
4. A api carrega a instrumentação do OpenTelemetry por `--import`, valida as variáveis, monta o Better Auth em `/api/auth` com `bodyParser: false`, aplica o prefixo `/api`, o versionamento `/v1`, o CORS e o logger pino, e só depois monta o documento OpenAPI.
5. A SPA em `http://localhost:5173` chama `GET http://localhost:3000/api/v1/session` com `credentials: "include"`; sem sessão recebe 401 e mostra o estado anônimo.
6. `GET /api/health` responde se PostgreSQL e Valkey estão de pé.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| API NestJS | `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/platform/`, `apps/api/.dependency-cruiser.cjs`, `apps/api/package.json` | Bootstrap ESM gerado por `nest new --type esm --skip-git`, com config validada, logger, health, CORS, versionamento e OpenAPI em `platform/`. Na revisão de 2026-10-30, o dependency-cruiser entra como devDependency, com a configuração das regras de dependência e a chamada no script `lint`. |
| Módulo Contas | `apps/api/src/modules/accounts/accounts.module.ts`, `apps/api/src/modules/accounts/auth.ts`, `apps/api/src/modules/accounts/presentation/get-session/` | `auth.ts` na raiz do módulo com a instância do Better Auth (adapter Prisma, plugin admin, `trustedOrigins`, cookie), o módulo Nest que a registra com o guard global e, em `presentation/get-session/`, o controller e o DTO de `GET /api/v1/session`, sem `application/` (ADR-0025). Na revisão de 2026-10-30, `get-session/` sai da raiz do módulo para `presentation/`. |
| PostgreSQL | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/prisma.config.ts`, `apps/api/prisma/seed.ts`, `apps/api/src/platform/prisma/` | Novo. Schema com `user`, `session`, `account` e `verification` gerados pela CLI do Better Auth, migração inicial, seed do primeiro admin e o `PrismaService` com `@prisma/adapter-pg`. |
| Redis | `compose.yaml` (serviço `valkey`), `apps/api/src/platform/redis/` | Novo. Serviço Valkey 9 com AOF e `noeviction`, e o provider `ioredis` 5 compartilhado. |
| Contratos | `packages/contracts/src/` | Novo. Pacote ESM com o esquema da resposta de sessão e o esquema das variáveis de ambiente públicas da SPA. |
| SPA Web | `apps/web/src/` | Novo. `main.tsx` com `createBrowserRouter`, rota raiz com `loader` que lê a sessão, página de erro em pt-BR e o cliente HTTP com `credentials: "include"`. |
| API NestJS | `apps/api/src/platform/telemetry/`, `apps/api/src/platform/queue/queue.module.ts`, `apps/api/src/platform/health/`, `apps/api/src/platform/config/env.ts`, `apps/api/package.json` | Revisão de 2026-10-31. Novo `platform/telemetry/` com o `AppMetrics` (Meter `app`), o `QueueMetrics` (descobre as filas registradas pelo `DiscoveryService` do Nest e lê contagens e idade na coleta) e o `ComponentMetrics` (memória do Valkey e estado do health check na coleta), todos inertes sem endpoint. O `queue.module.ts` passa o `BullMQOtel` como `telemetry` das filas e dos workers. Os indicadores do health check passam a ser lidos também pelo `ComponentMetrics`. O esquema de config ganha `DIAGNOSTICS_ENABLED` e `DIAGNOSTICS_WORKER_ENABLED`. Dependência nova: `bullmq-otel` 2. |
| API NestJS | `apps/api/src/platform/diagnostics/` | Revisão de 2026-10-31. Novo. Módulo carregado só com `DIAGNOSTICS_ENABLED=true` fora de produção: fila `diagnostics`, processor que conclui ou falha conforme o pedido e incrementa `app.diagnostics.jobs.processed`, e o controller anônimo de `POST /api/diagnostics/jobs`. |
| Backend de observabilidade local | `compose.yaml` (serviço `observability`, perfil `observability`), `docker/observability/` | Revisão de 2026-10-31. Novo, `grafana/otel-lgtm` com a tag fixada (ADR-0029). Serviço que recebe OTLP em 4318 na rede do Compose e expõe a interface web em `localhost:8001`, publicada só no loopback do host (`127.0.0.1:8001`); em `docker/observability/` ficam o provisionamento dos painéis (`dashboards/api-interfaces.json`, `dashboards/queues.json`), as regras de alerta (`alerting/rules.yaml`) e o `collector-destino.yaml` de referência. O HLD ainda não tem este componente. |

---

## Contratos de interface

`GET /api/health` (anônima)
- 200 quando as duas dependências respondem; 503 quando alguma não responde.

```json
{ "status": "ok", "checks": { "postgres": "up", "valkey": "up" } }
```

```json
{ "status": "error", "checks": { "postgres": "up", "valkey": "down" } }
```

`GET /api/v1/session` (exige sessão)
- 200 com o id e o papel da conta da sessão; 401 sem sessão válida.
- O esquema da resposta mora em Contratos (`sessionResponseSchema`), e a SPA o usa para validar o corpo.

```json
{ "userId": "Yp3m2...", "role": "admin" }
```

`/api/auth/*` (Better Auth, formato da biblioteca)
- Montado pelo `@thallesp/nestjs-better-auth`; na fundação, nenhuma opção de produto (envio de e-mail, bloqueio) é configurada, e duas opções de borda ficam fixadas até o RF-001: `emailAndPassword.disableSignUp = true` e `rateLimit.enabled = false`.
- `GET /api/auth/ok` responde 200 `{ "ok": true }` (rota do better-auth 1.7.14).
- `POST /api/auth/sign-up/email` responde 400 com `code` igual a `EMAIL_PASSWORD_SIGN_UP_DISABLED` e não cria conta (better-auth 1.7, `routes/sign-up.ts`).
- `POST /api/auth/sign-in/email` com `{ "email": "...", "password": "..." }` abre sessão e devolve o cookie `httpOnly`; a fundação o usa só para provar o seed do admin.

`GET /api/docs` e `GET /api/docs-json` (anônimas, fora de produção)
- Interface Swagger e documento OpenAPI 3; o JSON fica em `<caminho>-json`, padrão do `@nestjs/swagger` 12.0.5 (`swagger-module.js`).

`POST /api/diagnostics/jobs` (anônima, só com `DIAGNOSTICS_ENABLED=true` fora de produção)
- Enfileira um job na fila `diagnostics`; responde 202 com o id do job. Sem a flag, ou com `NODE_ENV=production`, responde 404. Corpo fora do esquema responde 400 sem enfileirar.
- `outcome`: `succeed` conclui o job; `fail` lança erro em toda tentativa. A fila usa 2 tentativas com backoff fixo de 1 segundo (hipótese).

```json
{ "outcome": "fail" }
```

```json
{ "jobId": "1" }
```

Métricas exportadas por OTLP (com endpoint)

| Métrica | Tipo e unidade | Atributos | Origem |
| --- | --- | --- | --- |
| `http.server.request.duration` | histograma, `s` | `http.request.method`, `http.route`, `http.response.status_code` | `@opentelemetry/instrumentation-http` 0.300, com a rota preenchida pela `instrumentation-express` 0.72; nas rotas do Better Auth, montado sem caminho, `http.route` igual a `/api/auth/*`, gravado no metadado RPC do contexto ativo (`getRPCMetadata` do `@opentelemetry/core`) pelo `middleware` do `AuthModule`; baldes padrão da instrumentação |
| `db.client.connection.count` | contador ascendente e descendente, `{connection}` | `db.client.connection.state` (`idle`, `used`), `db.client.connection.pool.name` | `@opentelemetry/instrumentation-pg` 0.77, sobre o `pg.Pool` do `@prisma/adapter-pg` |
| `app.valkey.memory.used` | gauge, `By` | nenhum | `ComponentMetrics`, `INFO memory` |
| `app.valkey.memory.max` | gauge, `By` (0 sem `maxmemory`) | nenhum | `ComponentMetrics`, `INFO memory` |
| `app.health.status` | gauge, 1 de pé e 0 fora | `dependency` (`postgres`, `valkey`) | `ComponentMetrics`, os mesmos indicadores de `GET /api/health` |
| `app.queue.jobs` | gauge, `{job}` | `queue`, `state` (`waiting`, `active`, `delayed`, `failed`) | `QueueMetrics`, contagens do BullMQ |
| `app.queue.oldest_job.age` | gauge, `s` (0 sem job pendente) | `queue` | `QueueMetrics`, job em `waiting` mais antigo |
| `app.queue.job.failures` | contador, `{failure}` | `queue`, `attempt` | `QueueMetrics`, evento de falha de cada fila |
| `app.diagnostics.jobs.processed` | contador, `{job}` | `outcome` | Fila de diagnóstico, pelo `AppMetrics` |

Painéis e alertas (`docker/observability/`)
- Painel "API por interface": vazão, taxa de 5xx e p95 por `http.route`, com as rotas agrupadas em API de autenticação (`/api/auth/*`) e API REST v1 (`/api/v1`). A taxa de 5xx conta todas as rotas, `GET /api/health` inclusive. A legenda das séries mostra o último valor e a média, sem o máximo; a linha de limiar de 0,3 s aparece só no p95 de `/api/v1`, a única seção que o alerta `api-v1-p95` vigia.
- Painel "Filas": jobs por estado, idade do job pendente mais antigo e falhas por tentativa, por `queue`, e memória do Valkey contra o máximo.
- Regras de alerta, avaliadas a cada minuto: `api-5xx-rate` (5xx sobre o total acima de 0,01 por 5 minutos), `api-v1-p95` (p95 de `/api/v1` acima de 0,3 s por 5 minutos), `queue-stalled` (por `queue`, idade do mais antigo acima de 120 s ou jobs `failed` acima de 0), `dependency-down` (por `dependency`, `app.health.status` igual a 0 por 1 minuto).

Erros
- Formato padrão do Nest: `{ "statusCode": 401, "message": "Unauthorized" }`; 500 sem stack trace com `NODE_ENV=production`. (hipótese)

Variáveis de ambiente (`.env.example`)

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `NODE_ENV` | sim | `development`, `test` ou `production` |
| `DATABASE_URL` | sim | PostgreSQL, lida pelo `prisma.config.ts` e pelo `PrismaService` |
| `REDIS_URL` | sim | Valkey, pelo `ioredis` |
| `BETTER_AUTH_SECRET` | sim | Segredo do Better Auth |
| `BETTER_AUTH_URL` | sim | URL base da API |
| `WEB_ORIGIN` | sim | Origem da SPA, para CORS e `trustedOrigins` |
| `COOKIE_DOMAIN` | não | Domínio pai do cookie fora do local |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | sim | Transporte SMTP; validados já na fundação para o Módulo E-mail do RF-001 |
| `SMTP_USER`, `SMTP_PASSWORD` | não | Credenciais SMTP; o Mailpit local não pede |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | sim no `make db-setup` | Primeiro admin; a API não as lê |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | não | Liga a exportação OTLP; com o perfil `observability`, `http://observability:4318` |
| `DIAGNOSTICS_ENABLED` | não | `true` registra a fila e a rota de diagnóstico fora de produção; padrão falso |
| `DIAGNOSTICS_WORKER_ENABLED` | não | `false` registra a fila de diagnóstico sem worker, para os jobs ficarem pendentes; padrão verdadeiro |
| `LOG_LEVEL` | não | Nível do pino, padrão `info` |
| `PORT` | não | Porta HTTP da API, inteiro de 1 a 65535, padrão 3000; o health check da imagem lê a mesma variável |
| `VITE_API_URL` | sim na SPA | URL da API vista pelo navegador |

Nomes das variáveis (hipótese)

---

## Modelo de dados

Migração inicial `apps/api/prisma/migrations/<timestamp>_init/`, com o schema gerado pela CLI do Better Auth para Prisma e conferido à mão:

- `user`: `id` texto PK, `name` texto, `email` texto único, `emailVerified` booleano padrão falso, `image` texto nulo, `createdAt`, `updatedAt`, e do plugin admin `role` texto nulo, `banned` booleano nulo, `banReason` texto nulo, `banExpires` timestamp nulo.
- `session`: `id` PK, `token` único, `userId` FK para `user` com exclusão em cascata, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`, e `impersonatedBy` do plugin admin.
- `account`: `id` PK, `accountId`, `providerId`, `userId` FK para `user` em cascata, `password` (hash) nulo, campos de token OAuth nulos, `createdAt`, `updatedAt`.
- `verification`: `id` PK, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`.

A revisão de observabilidade de 2026-10-31 não muda o banco: métricas e traces vão para o backend por OTLP, e a fila de diagnóstico vive só no Redis.

O e-mail em minúsculas e a situação pendente/ativa/desativada do HLD se expressam por `email` normalizado no cadastro (RF-001), `emailVerified` e `banned`; a coluna de situação anterior para a reativação é do RF-013.

O seed procura a conta de `ADMIN_EMAIL` em `user`. Sem conta, cria em `user` e `account` (provider `credential`) com `role = "admin"`, `emailVerified = true` e `banned = false`, usando o hasher do Better Auth (`ctx.password.hash` da instância). Com conta já admin, verificada e sem banimento em vigor, não grava nada. Com conta sem papel admin ou sem e-mail verificado, ou admin com banimento em vigor, termina com código diferente de zero sem gravar.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| Variável obrigatória ausente, ou qualquer variável inválida (inclusive `PORT` fora de 1 a 65535) | API NestJS, validação da config na subida | Processo termina com código diferente de zero antes de abrir a porta | Mensagem no log com o nome da variável, sem valores |
| PostgreSQL fora do ar | API NestJS, health check | `GET /api/health` responde 503 com `postgres: down` | Corpo JSON com o estado de cada dependência |
| Valkey fora do ar | API NestJS, health check | `GET /api/health` responde 503 com `valkey: down`; a API continua no ar | Corpo JSON com o estado de cada dependência |
| Requisição sem sessão a rota protegida | Módulo Contas, guard global | 401 | SPA mostra o estado anônimo |
| `ADMIN_EMAIL` ou `ADMIN_PASSWORD` ausente | PostgreSQL, seed do `make db-setup` | Seed termina com código diferente de zero, sem gravar nada | Mensagem nomeando a variável |
| `ADMIN_PASSWORD` fora da regra de senha (menos de 8 caracteres, sem letra ou sem número) | Seed do `make db-setup`, antes de abrir o banco | Seed termina com código diferente de zero, sem gravar nada | Mensagem nomeando `ADMIN_PASSWORD`, sem o valor |
| Conta de `ADMIN_EMAIL` já existe sem papel admin ou sem e-mail verificado | PostgreSQL, seed do `make db-setup` | Seed termina com código diferente de zero, sem alterar a conta | Mensagem dizendo que já existe conta com esse e-mail sem papel admin |
| Conta admin de `ADMIN_EMAIL` com banimento em vigor | PostgreSQL, seed do `make db-setup` | Seed termina com código diferente de zero, sem alterar a conta | Mensagem dizendo que a conta do admin está banida, sem o e-mail |
| Cadastro por e-mail e senha em `/api/auth/sign-up/email` | Módulo Contas, Better Auth | 400 com código `EMAIL_PASSWORD_SIGN_UP_DISABLED`, sem criar conta | Nada na fundação; o RF-001 monta a tela |
| Migração falha | PostgreSQL, `prisma migrate deploy` | `make db-setup` termina com código diferente de zero | Saída do Prisma |
| Coletor OTLP inacessível | API NestJS, exportador OTLP | Exportação descartada com aviso no log; requisições seguem | nada |
| Valkey fora na leitura das métricas | API NestJS, `QueueMetrics` e `ComponentMetrics` | A coleta daquela rodada omite as métricas de fila e de memória, `app.health.status` de `valkey` sai 0, e um aviso no log por rodada; a exportação das demais segue | nada |
| Leitura de métrica que passa de 2 segundos | API NestJS, `platform/telemetry/` | A leitura é abandonada pelo `withTimeout` da plataforma e a métrica sai omitida naquela rodada | nada |
| `POST /api/diagnostics/jobs` sem a flag ou em produção | API NestJS, módulo de diagnóstico não carregado | 404 | Formato padrão do Nest |
| Corpo inválido em `POST /api/diagnostics/jobs` | API NestJS, validação Zod | 400 sem enfileirar | Formato padrão do Nest |
| Backend local fora com o endpoint apontado para ele | API NestJS, exportador OTLP | Mesmo caso do coletor inacessível | nada |
| Rota inexistente na SPA | SPA Web, `errorElement` da rota raiz | Página de erro | "Página não encontrada" em pt-BR |
| API inacessível no `loader` da rota raiz | SPA Web | Página de erro | Mensagem em pt-BR de que o servidor não respondeu |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `apps/api/src/platform/config/env.spec.ts`: esquema de variáveis recusa ausente e aceita o `.env.example`; mensagem sem valores.
- `apps/api/src/platform/logging/logger.spec.ts`: a redação remove `email`, `name`, `password`, `cookie` e `authorization`; a linha de acesso registra a URL sem a query string; `genReqId` gera ids distintos.
- `apps/api/src/platform/health/health.controller.spec.ts`: 200 e 503 com os checks trocados por dublês via `overrideProvider()`.
- `packages/contracts/src/session.spec.ts`: o esquema aceita `user` e `admin` e recusa outros papéis.
- `apps/web/src/routes/root.spec.ts`: o `loader` devolve o estado anônimo com 401 e o estado da sessão com 200, com `fetch` trocado por dublê.
- `apps/api/src/modules/accounts/presentation/get-session/get-session.controller.spec.ts`: o controller devolve id e papel da sessão e cai em `user` com papel nulo.

Observabilidade (revisão de 2026-10-31)
- `apps/api/src/platform/telemetry/queue-metrics.spec.ts`: com filas dubladas, as contagens viram `app.queue.jobs` por estado, a idade do mais antigo sai em segundos e 0 sem pendente, e a falha de uma fila não derruba a coleta das outras; leitor de métricas em memória do SDK (`InMemoryMetricExporter`).
- `apps/api/src/platform/telemetry/component-metrics.spec.ts`: `INFO memory` dublado vira os dois gauges; indicador fora vira `app.health.status` 0; leitura acima do limite sai omitida.
- `apps/api/src/platform/telemetry/app-metrics.spec.ts`: o `Meter` se chama `app` e recusa nome de métrica fora de `app.<domínio>.<medida>`.
- `apps/api/src/platform/diagnostics/diagnostics.controller.spec.ts`: 202 com `jobId`, 400 com `outcome` desconhecido.
- `apps/api/test/integration/diagnostics.int-spec.ts`: sem a flag a rota responde 404; com a flag o job `succeed` conclui e o `fail` termina falho depois de 2 tentativas, contra o Valkey do Compose.
- `apps/api/test/integration/queue-tracing.int-spec.ts`: com um `InMemorySpanExporter` registrado no teste, o span de consumidor da fila de diagnóstico tem o mesmo `traceId` do span de produtor.
- Painéis, alertas e configuração do coletor: sem teste versionado; o contrato os exercita contra o backend local.

Regra de dependência (dependency-cruiser no `make lint`)
- Sem teste próprio: a configuração roda sobre `apps/api/src/` em todo `make lint`, e a árvore da fundação passa sem violação. A prova de que cada regra barra o import errado é de quem exercita o contrato, com arquivos de violação temporários.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test` no PostgreSQL do Compose)
- `app.int-spec.ts`: a aplicação inteira sobe com `createNestApplication()` e Supertest; rota protegida responde 401; `GET /api/auth/ok` responde 200; `/api/docs-json` tem `/api/v1/session`.
- `seed.int-spec.ts`: o seed cria o admin, roda duas vezes sem duplicar nem mudar o hash, recusa conta pré-existente sem papel admin sem alterá-la, e o login por `POST /api/auth/sign-in/email` funciona com a senha do seed.
- `sign-up.int-spec.ts`: `POST /api/auth/sign-up/email` responde 400 com `EMAIL_PASSWORD_SIGN_UP_DISABLED` e não cria conta.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose | não precisa |
| CLI | comandos na raiz do repositório e no Compose, inspecionando código de saída, saída e estado resultante; leitura do receptor HTTP local e consultas HTTP à API de consulta do backend local de observabilidade | não precisa |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução | ADR-0024 |

---

## Convenções para as features

- Estrutura de pastas: API em `apps/api/src/modules/<funcionalidade>/`, com `domain/` (entidades, value objects, erros e portas como classe abstrata), `application/<caso>/` (`create-task/create-task.use-case.ts` e `*.spec.ts`), `infra/` (implementações Prisma) e `presentation/<caso>/` (controller e DTO), e na raiz o `<funcionalidade>.module.ts` que liga cada porta por `useClass`, na regra de dependência do ADR-0025 fiscalizada pelo ADR-0026 (regras em "Regra de dependência na API"); caso de uso sem regra de domínio nem porta, como `GET /api/v1/session`, fica só em `presentation/<caso>/`; handler de fila em `apps/api/src/modules/<funcionalidade>/infra/queue/<fila>.processor.ts`; infraestrutura transversal em `apps/api/src/platform/`; tela em `apps/web/src/routes/<rota>/` com `route.tsx`, `loader.ts` e `action.ts`; esquemas compartilhados em `packages/contracts/src/<funcionalidade>.ts`.
- Testes: Vitest em todo o monorepo; unidade em `*.spec.ts` ao lado do código; integração da API em `apps/api/test/integration/**/*.int-spec.ts` com `apps/api/vitest.integration.config.ts`; sem suíte E2E de navegador versionada.
- Estado persistido: factories em `apps/api/test/factories/<entidade>.factory.ts` gravando pelo Prisma Client no banco `app_test`, que o `scripts/test.sh` recria e migra a cada execução; o estado que o contrato pede no ambiente local sai do seed `apps/api/prisma/seed.ts` (configurado em `migrations.seed` do `prisma.config.ts`), que cada RF estende com funções idempotentes.
- Entradas estáticas: `apps/api/test/fixtures/` e `apps/web/test/fixtures/`, caminhos reservados que o primeiro RF com fixture cria; a fundação não versiona pasta vazia.
- Configuração de teste: `apps/api/.env.test` versionado, só com valores falsos e de baixa entropia, lido pelos dois `vitest.config.ts` da API; o modo de teste que um RF precisar entra como variável nesse arquivo e no esquema de config.
- Métricas e traces: métrica de negócio nova se registra pelo `AppMetrics` de `apps/api/src/platform/telemetry/`, com nome `app.<domínio>.<medida>`, unidade UCUM e atributos sem dado pessoal; fila nova se registra com `BullModule.registerQueue` e herda trace e métricas sem código; o teste de unidade lê a métrica pelo `InMemoryMetricExporter` do SDK, e o contrato a lê no receptor HTTP local ou no backend local.
- Dependências externas: dublês em `apps/api/test/doubles/` (caminho reservado, criado pelo primeiro RF com dublê), ligados por `overrideProvider()` do `@nestjs/testing`; o SMTP (DEP-1) é o Mailpit do Compose na integração e no ambiente local, lido pela API REST dele (ADR-0016).

---

## Decisões e hipóteses

Decisões
- API, SPA e Contratos em ESM, com Vitest como runner único (ADR-0021); é o padrão do `nest new` 12 (`@nestjs/schematics` 12, `schema.json` com `type` padrão `esm` e template `ts-esm` com Vitest), e o `@nestjs/core` 12.3.2 é `"type": "module"`.
- oxlint sem `--type-aware` e Prettier para lint e formatação (ADR-0022); o lint de tipos fica de fora porque o `oxlint-tsgolint` traz o compilador do TypeScript 7, contra o ADR-0020.
- Zod 4 nos esquemas de Contratos e na validação das variáveis de ambiente (ADR-0023).
- `@playwright/cli` (0.1.22, Microsoft, motor Playwright 1.64) dirige o navegador na verificação de UI do contrato, sem suíte E2E versionada (ADR-0024).
- `scripts/test.sh` sobe `postgres` e `valkey` do Compose com `docker compose up -d --wait`, recria o banco `app_test`, aplica as migrações e roda unidade e integração: escolhido na entrevista; o `make check` local e a CI passam a exigir Docker.
- Preparo do banco por alvo `make db-setup`: escolhido na entrevista. Para o Makefile seguir agnóstico de stack, o alvo entra na lista do contrato (`lint format test build db-setup`) e despacha para `scripts/db-setup.sh` via `scripts/contract.sh`; isso diverge da regra "Makefile e CLAUDE.md não mudam" do CLAUDE.md, que precisa citar o alvo novo.
- Primeiro admin criado pelo seed com `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`: escolhido na entrevista.
- Compatibilidade da stack conferida em 2026-10-29 no registro npm: Node 26 atende todos os `engines` (o mais alto é `>=22.22.1` do `@thallesp/nestjs-better-auth` 2.8.0); TypeScript 6.0.3 atende `@nestjs/cli` 12.0.11 (`~6.0.2`), `@nestjs/swagger` 12.0.5 (`^5.5 || ^6`) e o Better Auth Nest (`^5.9.2 || ^6`); React 19.3.1 atende o `>=19.2.7` do react-router 8.5.1; Express 5.3.0 do `@nestjs/platform-express` 12 atende o `^5.1.0` do Better Auth Nest; Vitest 5.0.5 aceita Vite 8 e Node 26. Sem conflito.
- `GET /api/auth/ok` existe no better-auth 1.7.14 (`dist/api/routes/ok.mjs`) e `migrations.seed` existe no `@prisma/config` 7.10.1: conferidos no pacote publicado.
- O plugin CLI do `@nestjs/swagger` roda só no `nest build`; nos testes Vitest os decorators de propriedade não são gerados, então nenhum teste de unidade depende do documento (ADR-0020).
- Prisma com o `moduleFormat` padrão `esm`, já que a API é ESM (ADR-0008 só exige `cjs` para API CommonJS).
- Revisão de 2026-10-29, após a primeira avaliação: a SPA anônima continua lendo `GET /api/v1/session` e recebendo 401; o item de UI passa a tolerar só a mensagem de rede que o navegador registra para esse 401, porque o Chromium registra todo 4xx de `fetch` como erro de console e a SPA não tem como suprimir isso. Alternativa descartada: responder 200 com sessão nula ao anônimo, que esconderia a borda que API-BORDA-02 prova.
- Revisão de 2026-10-29, achados da revisão de segurança: cadastro fechado com `emailAndPassword.disableSignUp` (doc do Better Auth, Options, `emailAndPassword`: bloqueia só a rota pública de sign-up; `createUser` do plugin admin segue); seed que recusa conta pré-existente sem papel admin, em vez de promovê-la (regra do projeto; a doc do Better Auth não cobre seed); query string fora do log de acesso (`serializers.req` do pino-http) e `url.query` redigido no span de servidor (`startIncomingSpanHook` da `@opentelemetry/instrumentation-http`; a versão 0.300 emite só `url.path` e `url.query` no span de servidor, conferido no código da instrumentação).
- Revisão de 2026-10-29, rate limit: desligado na fundação. Doc do Better Auth, Options, `rateLimit`: `enabled` padrão `true` em produção, `window` 10 s, `max` 100, `storage` padrão `memory`; sem `advanced.ipAddress.trustedProxies` a biblioteca cai num balde único por caminho e avisa no stderr. O RF-001 liga com `storage: "secondary-storage"` no Valkey (HLD) e `trustedProxies`. Alternativa descartada: manter o padrão, que não funciona com réplicas e suja o log JSON.
- Revisão de 2026-10-29, achados da revisão de código do PR 4: o seed recusa admin com banimento em vigor sem alterá-lo (plugin admin do better-auth 1.7.14, `dist/plugins/admin/admin.mjs`: na criação de sessão, `banned` com `banExpires` vencido é retirado; sem `banExpires`, o banimento não vence); alternativa descartada: desbanir em silêncio. O seed exige a regra de senha do PRD em `ADMIN_PASSWORD`; alternativa descartada: só o tamanho, deixando o primeiro admin fora da regra das outras contas. `PORT` entra no esquema de config (ADR-0023), opcional com padrão 3000; alternativa descartada: porta fixa, que tira o ajuste do Compose e de plataformas que definem a porta. As pastas de fixtures e dublês ficam reservadas, sem `.gitkeep`. Os decorators `@Session()` e `@AllowAnonymous()` são importados direto do `@thallesp/nestjs-better-auth`, como a biblioteca documenta; o Módulo Contas não os reexporta.

- Revisão de 2026-10-30, ADR-0025, que substitui o vertical slice, e ADR-0026: a fundação passa a entregar a regra de dependência, escolhido na revisão; alternativa descartada: só atualizar a documentação e deixar a ferramenta para o primeiro RF, que herdaria a mudança de estrutura junto com o produto.
- Revisão de 2026-10-30, `auth.ts` na raiz do Módulo Contas, como arquivo de composição ao lado do `accounts.module.ts`: escolhido na revisão, porque o controller de `presentation/` importa dele o tipo da sessão com o papel do plugin admin. Alternativas descartadas: `infra/` com a regra presentation para infra ignorando import só de tipo (`dependencyTypesNot: ["type-only"]`, dependency-cruiser, rules-reference), exceção que valeria para todo módulo; e `infra/` com um tipo de sessão escrito à mão, que duplica o que a biblioteca infere.
- Revisão de 2026-10-30, `GET /api/v1/session` só em `presentation/get-session/`, sem caso de uso: escolhido na revisão; não há regra de domínio nem porta, e o caso de uso só repassaria a sessão. Alternativa descartada: `application/get-session/` por uniformidade.
- Revisão de 2026-10-30, `platform/` como infraestrutura transversal nas regras do dependency-cruiser: escolhido na revisão. Alternativas descartadas: deixar `platform/` fora das regras, que deixaria um caso de uso importar o `PrismaService`; e dar camadas a `platform/`, que forçaria a estrutura em código só de infraestrutura.
- Compatibilidade do dependency-cruiser conferida em 2026-10-30 no registro npm: a 18.7.0 declara `engines.node` `^22||^24||>=26` (Node 26.13 local) e `supportedTranspilers.typescript` `>=2.0.0 <7.0.0` (catálogo `~6.0.3`, ADR-0020). Sem conflito. `tsPreCompilationDeps` diferente de `false` é o que faz o import `type-only` aparecer no grafo (dependency-cruiser, rules-reference, `dependencyTypes`).

- Revisão de 2026-10-30, cookie de API-BORDA-03 fixado em `sessao-inventada`: escolhido na revisão. O contrato não fixava o valor, cada avaliação gravava um cookie diferente na evidência e o gitleaks 8.30.1 acusava como `generic-api-key` valores como `inventado123.abcdef`; `sessao-inventada` tem baixa entropia e não é acusado (testado com `gitleaks dir`), e para o Better Auth é um cookie sem sessão como qualquer outro, então o 401 continua provado. Alternativa descartada: fixar `inventado123.abcdef`, que dependeria para sempre da allowlist do `.gitleaks.toml`.

- Revisão de 2026-10-31, observabilidade: a fundação, e não um RF novo, entrega o que o HLD pede em Observabilidade e a primeira versão deixou de fora, escolhido na entrevista. Alternativas descartadas: um RF de operação no PRD, que não fala de stack, e um plano avulso fora do fluxo de contrato.
- Revisão de 2026-10-31, API-BORDA-05 removido do contrato: o RF-001 abriu o cadastro, como a própria spec da fundação previa, e a spec do RF-001 pediu esta revisão. A fundação não pode exigir o comportamento do RF-001 (fecho vazio), então a rota de cadastro sai da promessa da fundação.
- Revisão de 2026-10-31, porta da interface web do backend local trocada de 3001 para 8001, por decisão da pessoa: a 3001 do host Windows está ocupada por um `portproxy` que ela usa, e o Docker recusa publicar nela. O bind fica em `127.0.0.1`, porque a imagem `grafana/otel-lgtm` entra com admin anônimo (doc da imagem, README do grafana/docker-otel-lgtm) e publicar em todas as interfaces daria edição de painéis e alertas a qualquer máquina da rede; achado da revisão de segurança automática. Alternativa descartada: manter a 3001 e remover o `portproxy`.
- Revisão de 2026-10-31, CLI-IMAGEM-02 passa a definir TRUSTED_PROXIES ao subir a imagem: a API exige a variável com NODE_ENV=production (spec do RF-001, Decisões) e o `.env.example` a deixa vazia, então o item como estava não passava com a configuração dos Pré-requisitos. A regra da API fica; o item usa a faixa privada que contém a rede do Compose, `172.16.0.0/12`.
- Revisão de 2026-10-31, investigação dos 5xx e do p95 altos no painel "API por interface": os números vinham de incidentes reais (Valkey parado nas avaliações, com `GET /api/health` e `POST /api/diagnostics/jobs` em 503), não de erro de consulta. Decisões da pessoa: a taxa de 5xx e o alerta `api-5xx-rate` continuam contando `GET /api/health` e a rota de diagnóstico, sem piso de tráfego, aceitando que um incidente de dependência dispare também `dependency-down` (alternativa descartada: excluir as duas rotas e exigir tráfego mínimo); as rotas do Better Auth ganham `http.route` igual a `/api/auth/*`, para o painel separar a autenticação das requisições sem rota (alternativa descartada: assumir a mistura com os 404 fora de `/api`); o histograma fica com os baldes padrão, aceitando que o p95 entre 0,25 e 0,5 s e entre 1 e 2,5 s saia interpolado (alternativa descartada: uma View com baldes finos); a legenda deixa de mostrar o máximo da janela e o limiar visual de 0,3 s fica só na seção `/api/v1`.
- Telemetria de filas por mecanismo genérico em `platform/queue/` e prova pela fila de diagnóstico, escolhido na entrevista: a fila `email.send` é do RF-001, fora do fecho da fundação. Alternativas descartadas: provar pela fila de e-mail, que faria a fundação depender de RF, e deixar a prova para uma revisão do RF-001.
- `BullMQOtel` do pacote `bullmq-otel` 2.0.1 como `telemetry` das filas e workers: é a integração com OpenTelemetry que a doc do BullMQ indica (docs.bullmq.io, guide/telemetry/traces: "Pass a telemetry instance to Queue, Worker, or FlowProducer"; a propagação vem por padrão, `omitContext` falso). Conferido no registro npm em 2026-10-31: peer `bullmq >=6.0.0` (instalado 6.5.1) e dependência só de `@opentelemetry/api ^1.9.1`. Coberta pelo ADR-0015 e pelo ADR-0019, como o `@prisma/instrumentation` da primeira versão.
- Métricas de negócio nos RFs donos, sobre o `AppMetrics` da fundação, escolhido na entrevista. Alternativa descartada: criar as duas métricas agora, com o RF-003 pendente e a fundação dependendo de RF.
- Backend local com 100 por cento dos traces e a regra do HLD versionada como configuração de referência do destino, escolhido na entrevista. Alternativa descartada: amostragem de cauda também no local, que esconderia 9 de cada 10 traces sem erro de quem desenvolve.
- Backend local incluído no Compose, escolhido na entrevista, com o `grafana/otel-lgtm` (ADR-0029): Grafana na porta 3000 do container, OTLP HTTP em 4318, `otelcol-contrib` embutido para validar o `collector-destino.yaml`, painéis em `/otel-lgtm/grafana/conf/provisioning/dashboards/custom` e regras de alerta na pasta `provisioning/alerting` do Grafana.
- Painéis e alertas versionados como código e provisionados no backend local, escolhido na entrevista, contra a recomendação de deixá-los com o destino. O custo aceito é o risco de excesso de infraestrutura do HLD; a mitigação é o perfil `observability`, que deixa a subida padrão como estava.
- Nomes das métricas de instrumentação conferidos no código instalado em 2026-10-31: `http.server.request.duration` na `@opentelemetry/instrumentation-http` 0.300; a rota vem do `rpcMetadata.route` que a `@opentelemetry/instrumentation-express` 0.72 preenche; `db.client.connection.count` com `db.client.connection.state` na `@opentelemetry/instrumentation-pg` 0.77.
- `trace_id` e `span_id` no log pela `@opentelemetry/instrumentation-pino`, que o `getNodeAutoInstrumentations` já liga e o `instrumentation.ts` já carrega antes do pino.
- Painéis provisionados por arquivo montado no container do backend, como o README do `grafana/docker-otel-lgtm` documenta (pasta `/otel-lgtm/grafana/conf/provisioning/dashboards/custom`), caso o ADR escolha essa imagem; o mesmo projeto avisa que não é solução para produção, por isso o backend existe só no local.

Hipóteses
- Pacotes `@app/api`, `@app/web` e `@app/contracts` (hipótese)
- Portas locais: api 3000, web 5173, postgres 5432, valkey 6379, mailpit 1025 (SMTP) e 8025 (web), com SPA e API em `localhost`, o mesmo site para o cookie (hipótese)
- `GET /api/v1/session` como rota protegida da fundação e fonte da sessão para a SPA; alternativa descartada: a SPA ler a sessão pelo cliente do Better Auth em `/api/auth/get-session`, que não prova o guard global do Nest (hipótese)
- Health check em controller próprio com `SELECT 1` e `PING`, sem `@nestjs/terminus`, para não somar dependência sem ADR (hipótese)
- Retenção de jobs do BullMQ, que o HLD deixou para a fundação: `removeOnComplete` por 24 horas e `removeOnFail` por 7 dias, aplicada por quem registrar a primeira fila (hipótese)
- Hot reload com o código em bind mount e `node_modules` em volume do container, com polling ligado por variável para o WSL2 (hipótese)
- A imagem da API roda `node --import ./dist/instrumentation.js dist/main.js` (hipótese)
- Cookie sem domínio no local (host-only) e `COOKIE_DOMAIN` só fora dele (hipótese)
- Servidor estático da imagem da SPA: nginx oficial com fallback para `index.html` (hipótese)
- Configuração do dependency-cruiser em `apps/api/.dependency-cruiser.cjs`, o nome que o `depcruise --init` gera, em CommonJS por o pacote ser ESM (hipótese)
- Nomes das métricas próprias (`app.queue.jobs`, `app.queue.oldest_job.age`, `app.queue.job.failures`, `app.valkey.memory.used`, `app.valkey.memory.max`, `app.health.status`, `app.diagnostics.jobs.processed`) e o padrão `app.<domínio>.<medida>`; alternativa descartada: prefixo com o nome do serviço, que o `service.name` do recurso já traz (hipótese)
- Filas descobertas pelo `DiscoveryService` do Nest procurando instâncias de `Queue` do BullMQ; alternativa descartada: registro manual de cada fila em `platform/`, que cada RF esqueceria (hipótese)
- Falhas por tentativa contadas pelo evento `failed` de cada fila, com a tentativa lida de `attemptsMade` do job (hipótese)
- Fila de diagnóstico com 2 tentativas e backoff fixo de 1 segundo, para o contrato ver duas tentativas em poucos segundos (hipótese)
- Variáveis `DIAGNOSTICS_ENABLED` e `DIAGNOSTICS_WORKER_ENABLED`, a rota `POST /api/diagnostics/jobs` e o módulo em `platform/diagnostics/` (hipótese)
- Serviço `observability` no perfil `observability` e OTLP HTTP em 4318 só na rede do Compose (hipótese)
- Interface web do backend local em `localhost:8001`, publicada só em `127.0.0.1` do host
- Arquivos em `docker/observability/`: `dashboards/api-interfaces.json`, `dashboards/queues.json`, `alerting/rules.yaml` e `collector-destino.yaml` (hipótese)
- Nomes das regras de alerta `api-5xx-rate`, `api-v1-p95`, `queue-stalled` e `dependency-down`, agrupadas por fila e por dependência, em vez de uma regra fixa para `email.send` (hipótese)
- Limite de 2 segundos por leitura de métrica, abaixo do intervalo de exportação de 60 segundos do SDK (hipótese)

Pendentes de ADR
- Servidor estático da imagem da SPA, que o ADR-0005 deixou de fora: nginx oficial em Alpine com fallback para `index.html` (hipótese desta spec, já implementada em `apps/web/Dockerfile` e `apps/web/nginx.conf` por decisão explícita da pessoa), Caddy, ou `serve` em Node; critério, imagem pequena sem runtime Node. ESM com Vitest, oxlint com Prettier, `@playwright/cli` e Zod 4, pendentes na primeira versão desta spec, estão registrados nos ADR-0021 a ADR-0024.

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| HLD, Arquitetura geral e Ambiente de implantação | Escopo, Regras e fluxos |
| HLD, Componentes e responsabilidades | Componentes |
| HLD, Modelo de dados (Usuário, Sessão, Credencial, Verificação) | Modelo de dados |
| HLD, Interfaces públicas (API de autenticação, API REST v1, Documento OpenAPI) | Contratos de interface |
| HLD, Segurança (autenticação, gestão de segredos) | Regras e fluxos, Contratos de interface |
| HLD, Observabilidade (logs, tracing, health check) | Regras e fluxos, Tratamento de erros |
| HLD, Observabilidade (métricas, amostragem, dashboards e alertas) | Escopo, Regras e fluxos (Observabilidade), Contratos de interface, Decisões e hipóteses |
| HLD, Versionamento e retenção (jobs do BullMQ) | Decisões e hipóteses |
| PRD, Decisão primeiro admin criado na instalação | Modelo de dados, Regras e fluxos |
| PRD, Compliance (LGPD nos logs) | Regras e fluxos |
| HLD, Padrões adotados (Clean Architecture com casos de uso por pasta) | Regras e fluxos, Componentes, Convenções para as features |
| ADRs 0002 a 0010, 0012 a 0026 e 0029 | Escopo, Decisões e hipóteses |
