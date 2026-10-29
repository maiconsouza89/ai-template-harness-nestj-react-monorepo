# Plano: fundação

Spec: spec.md. Contrato: contract.md.

---

## Pré-requisitos

- ADR do servidor estático da imagem da SPA, registrado pela `/adr-writer`; só o passo 20 depende dele. As demais decisões de ferramenta estão nos ADR-0021 a ADR-0024.
- Docker com Compose v2 na máquina de quem implementa e no runner da CI.
- Nenhum RF: a fundação não depende de requisito.

---

## Fase 1: Monorepo que compila, testa e passa no lint

1. **Monorepo:** criar o `package.json` raiz com `packageManager` no pnpm 12, `engines.node` na 26 e TypeScript 6, o `pnpm-workspace.yaml` com `apps/*` e `packages/*`, o `turbo.json` com as tarefas `lint`, `format`, `test`, `build` e `generate`, e a configuração base de TypeScript, oxlint e Prettier.
2. **API NestJS:** gerar `apps/api` com o Nest CLI do lockfile em modo ESM e sem git, e ajustar o bootstrap para o prefixo `/api` e o versionamento `/v1` (spec, Componentes).
3. **Contratos:** criar `packages/contracts` como pacote ESM com Zod 4 e o esquema da resposta de sessão, consumido pela API e pela SPA por `workspace:*`.
4. **SPA Web:** criar `apps/web` com Vite e React Router em modo data, a rota raiz com `loader`, a página de erro em pt-BR e o cliente HTTP que envia o cookie.
5. **Scripts da stack:** escrever `scripts/lint.sh`, `scripts/format.sh`, `scripts/test.sh` e `scripts/build.sh` em POSIX sh delegando ao Turborepo, para `make lint`, `make format`, `make test` e `make build` deixarem de avisar.

## Fase 2: Ambiente local no Compose

6. **Ambiente local:** escrever o `compose.yaml` com api, web, postgres 18, valkey 9 e mailpit, com o volume do postgres em `/var/lib/postgresql`, o Valkey com AOF e `noeviction`, health checks e hot reload por bind mount.
7. **Configuração e segredos:** criar o `.env.example` com todas as variáveis da spec e a validação na subida da API que falha nomeando a variável ausente.
8. **Redis:** registrar o provider `ioredis` 5 compartilhado, apontado para `REDIS_URL`.
9. **Saúde:** criar `GET /api/health` anônima com o estado do PostgreSQL e do Valkey (spec, Contratos de interface).
10. **README:** documentar o setup local (`make setup`, `.env`, `docker compose up -d`, `make db-setup`) e as URLs da SPA, da API, do documento OpenAPI e do Mailpit.

## Fase 3: Banco e autenticação na borda

11. **PostgreSQL:** configurar o Prisma 7 com `prisma.config.ts` que carrega o `.env`, o generator com `output` fora do `node_modules`, o `PrismaService` com `@prisma/adapter-pg` e a tarefa `generate` antes de `build` e `test`.
12. **Módulo Contas:** criar a instância do Better Auth com adapter Prisma, plugin admin, cookie cache desligado, `trustedOrigins` e cookie da spec, montá-la em `/api/auth` com `bodyParser: false` e ligar o guard global.
13. **PostgreSQL:** gerar com a CLI do Better Auth as tabelas no `schema.prisma` e criar a migração inicial.
14. **Preparo do banco:** escrever `scripts/db-setup.sh` e o seed idempotente do primeiro admin, e acrescentar `db-setup` à lista de alvos do contrato no `Makefile`, com a linha correspondente no `CLAUDE.md`.
15. **Módulo Contas:** criar `GET /api/v1/session` protegida, com a resposta validada pelo esquema de Contratos, e fazer a rota raiz da SPA mostrar o estado anônimo ou o papel da sessão.
16. **API NestJS:** ligar o CORS com credenciais só para `WEB_ORIGIN`.

## Fase 4: Observabilidade e documento da API

17. **API NestJS:** registrar o nestjs-pino no módulo raiz com `bufferLogs`, `genReqId` com id único e redação de `email`, `name`, `password`, `cookie` e `authorization`.
18. **API NestJS:** criar o arquivo de instrumentação do OpenTelemetry com auto-instrumentação de HTTP, Nest e Prisma, carregado por `--import` no Compose e na imagem, exportando só com `OTEL_EXPORTER_OTLP_ENDPOINT`.
19. **API NestJS:** montar o documento OpenAPI em `/api/docs` depois do versionamento, com o plugin CLI do `@nestjs/swagger` no `nest-cli.json`, publicado só fora de produção.

## Fase 5: Imagens e CI

20. **Imagens:** escrever os Dockerfiles multi-stage da API e da SPA com `turbo prune --docker`, pnpm na versão do `packageManager` e Node 26, a da SPA servindo os estáticos pelo servidor que o ADR pendente escolher.
21. **CI:** acrescentar ao `ci.yml` a instalação de Node 26 e do pnpm antes do `make check`, com actions fixadas por SHA e comentário da versão, e conferir que `CI=true make check` passa local.
