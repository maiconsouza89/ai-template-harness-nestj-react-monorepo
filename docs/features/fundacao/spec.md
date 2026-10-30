# Spec: fundação

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.2.3
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

Entradas
- nenhuma: a fundação não depende de RF.

Saídas
- `PrismaService` e o `schema.prisma` com as tabelas do Better Auth, que todos os RFs estendem com migrações novas.
- A instância do Better Auth no Módulo Contas, com o guard global e os decorators `@Session()` e `@AllowAnonymous()`, que RF-001 a RF-007 configuram (envio de e-mail, bloqueio, rate limit).
- A conexão com o Valkey (`ioredis` 5) exposta como provider, que o Módulo E-mail (BullMQ) e o rate limit do Better Auth usam a partir do RF-001.
- `GET /api/v1/session` e o esquema da resposta em Contratos, que a SPA usa nas rotas protegidas de todos os RFs com tela.
- O pacote Contratos (`@app/contracts`), onde cada RF acrescenta os próprios esquemas.
- O roteador da SPA com a rota raiz e a página de erro, onde cada RF pendura as próprias rotas.
- As convenções de pastas, testes, seed, fixtures, configuração de teste e dublês da seção "Convenções para as features".

Fora desta spec
- Telas e fluxos de cadastro, confirmação, entrar, sair e recuperação de senha (RF-001 a RF-005): a fundação só monta a biblioteca e a borda.
- Módulo E-mail, fila `email.send` e o callback de envio do Better Auth (RF-001).
- Rate limit por IP com armazenamento no Valkey e bloqueio por e-mail (RF-001, RF-003).
- Perfil em `/api/v1/me` (RF-006) e troca de senha (RF-007).
- Módulo Tarefas e o padrão de vertical slice com domínio e repositório (RF-008 a RF-011).
- Módulo Usuários, situação anterior para reativação e trilha de auditoria (RF-012, RF-013).
- Suíte E2E versionada no repositório: decisão da entrevista, a verificação de tela fica no contrato.

---

## Regras e fluxos

Regras
- Toda rota da API exige sessão, salvo as marcadas com `@AllowAnonymous()`; na fundação, só `GET /api/health` e as rotas do próprio Better Auth em `/api/auth` (HLD, Segurança).
- A API não sobe sem todas as variáveis obrigatórias, e a mensagem de erro nomeia a variável ausente sem imprimir o valor de nenhuma (HLD, Gestão de segredos).
- Nenhum log contém os campos `email`, `name`, `password`, `cookie` nem `authorization` em texto puro, nem a query string das requisições recebidas; o log de acesso registra só o caminho da URL, e o span de servidor do OpenTelemetry redige `url.query` (PRD, Compliance; ADR-0018; ADR-0019).
- O cadastro por e-mail e senha fica fechado na fundação (`disableSignUp`): só o seed cria conta, e o RF-001 abre o cadastro quando montar o fluxo. A rota recusa com 400 e código `EMAIL_PASSWORD_SIGN_UP_DISABLED`; o `createUser` do plugin admin não é afetado.
- O rate limit do Better Auth fica desligado na fundação (`rateLimit.enabled = false`), porque o padrão da biblioteca em produção é um balde em memória por processo, que não vale com réplicas (HLD, API sem estado) e escreve aviso fora do JSON no log; o RF-001 liga com armazenamento no Valkey e `trustedProxies` (HLD, Valkey).
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
| API NestJS | `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/platform/` | Novo. Bootstrap ESM gerado por `nest new --type esm --skip-git`, com config validada, logger, health, CORS, versionamento e OpenAPI em `platform/`. |
| Módulo Contas | `apps/api/src/modules/accounts/` | Novo. `auth.ts` com a instância do Better Auth (adapter Prisma, plugin admin, `trustedOrigins`, cookie), o módulo Nest que a registra com o guard global e o controller de `GET /api/v1/session`. |
| PostgreSQL | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/prisma.config.ts`, `apps/api/prisma/seed.ts`, `apps/api/src/platform/prisma/` | Novo. Schema com `user`, `session`, `account` e `verification` gerados pela CLI do Better Auth, migração inicial, seed do primeiro admin e o `PrismaService` com `@prisma/adapter-pg`. |
| Redis | `compose.yaml` (serviço `valkey`), `apps/api/src/platform/redis/` | Novo. Serviço Valkey 9 com AOF e `noeviction`, e o provider `ioredis` 5 compartilhado. |
| Contratos | `packages/contracts/src/` | Novo. Pacote ESM com o esquema da resposta de sessão e o esquema das variáveis de ambiente públicas da SPA. |
| SPA Web | `apps/web/src/` | Novo. `main.tsx` com `createBrowserRouter`, rota raiz com `loader` que lê a sessão, página de erro em pt-BR e o cliente HTTP com `credentials: "include"`. |

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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | não | Liga a exportação OTLP |
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

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test` no PostgreSQL do Compose)
- `app.int-spec.ts`: a aplicação inteira sobe com `createNestApplication()` e Supertest; rota protegida responde 401; `GET /api/auth/ok` responde 200; `/api/docs-json` tem `/api/v1/session`.
- `seed.int-spec.ts`: o seed cria o admin, roda duas vezes sem duplicar nem mudar o hash, recusa conta pré-existente sem papel admin sem alterá-la, e o login por `POST /api/auth/sign-in/email` funciona com a senha do seed.
- `sign-up.int-spec.ts`: `POST /api/auth/sign-up/email` responde 400 com `EMAIL_PASSWORD_SIGN_UP_DISABLED` e não cria conta.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose | não precisa |
| CLI | comandos na raiz do repositório e no Compose, inspecionando código de saída, saída e estado resultante | não precisa |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução | ADR-0024 |

---

## Convenções para as features

- Estrutura de pastas: API em `apps/api/src/modules/<funcionalidade>/`, com `domain/` (entidades, value objects, erros e portas como classe abstrata), `application/<caso>/` (`create-task/create-task.use-case.ts` e `*.spec.ts`), `infra/` (implementações Prisma) e `presentation/<caso>/` (controller e DTO), na regra de dependência do ADR-0025 fiscalizada pelo ADR-0026; handler de fila em `apps/api/src/modules/<funcionalidade>/infra/queue/<fila>.processor.ts`; infraestrutura transversal em `apps/api/src/platform/`; tela em `apps/web/src/routes/<rota>/` com `route.tsx`, `loader.ts` e `action.ts`; esquemas compartilhados em `packages/contracts/src/<funcionalidade>.ts`.
- Testes: Vitest em todo o monorepo; unidade em `*.spec.ts` ao lado do código; integração da API em `apps/api/test/integration/**/*.int-spec.ts` com `apps/api/vitest.integration.config.ts`; sem suíte E2E de navegador versionada.
- Estado persistido: factories em `apps/api/test/factories/<entidade>.factory.ts` gravando pelo Prisma Client no banco `app_test`, que o `scripts/test.sh` recria e migra a cada execução; o estado que o contrato pede no ambiente local sai do seed `apps/api/prisma/seed.ts` (configurado em `migrations.seed` do `prisma.config.ts`), que cada RF estende com funções idempotentes.
- Entradas estáticas: `apps/api/test/fixtures/` e `apps/web/test/fixtures/`, caminhos reservados que o primeiro RF com fixture cria; a fundação não versiona pasta vazia.
- Configuração de teste: `apps/api/.env.test` versionado, só com valores falsos e de baixa entropia, lido pelos dois `vitest.config.ts` da API; o modo de teste que um RF precisar entra como variável nesse arquivo e no esquema de config.
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
| HLD, Versionamento e retenção (jobs do BullMQ) | Decisões e hipóteses |
| PRD, Decisão primeiro admin criado na instalação | Modelo de dados, Regras e fluxos |
| PRD, Compliance (LGPD nos logs) | Regras e fluxos |
| ADRs 0002 a 0020 | Escopo, Decisões e hipóteses |
