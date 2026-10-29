---
status: accepted
date: 2026-10-28
title: "Usar Prisma como ORM"
description: "Por que Prisma 7 em vez de TypeORM: o time já conhece o Prisma, e o padrão de CRUD que o dev copia segue a ferramenta que ele domina."
supersedes:
superseded-by:
---

# 0008. Usar Prisma como ORM

## Contexto e problema

A API NestJS (ADR-0003) grava no PostgreSQL 18 (ADR-0007), que deixou ORM e ferramenta de
migração para registros próprios. O acesso a dados faz parte do padrão de CRUD de tarefas que o
PRD pede que um dev copie para uma entidade nova em até 2 horas. Faltava escolher a camada entre a
API e o banco, que aparece em todo service e é cara de trocar depois que as entidades existem.

## Opções consideradas

- **Prisma ORM 7**: schema em `schema.prisma`, cliente TypeScript gerado a partir dele e conexão por driver adapter (`@prisma/adapter-pg`).
- **TypeORM**: entidades como classes com decorators e repositórios injetados por `@nestjs/typeorm`; perdeu porque o time já conhece o Prisma e o padrão do template deve seguir a ferramenta que ele domina.

## Decisão

Escolhido o **Prisma ORM na versão major 7**, porque é a ferramenta que o time já usa, o que
encurta a cópia do padrão de CRUD, e a 7 é a última major estável na data desta decisão.

## Consequências

- Bom: o modelo de dados vive num arquivo só (`schema.prisma`), e um campo usado no service que não existe no schema quebra a compilação, não a requisição.
- Ruim: não há pacote Nest oficial; o template expõe o cliente por um `PrismaService` próprio, e o `generate` tem de rodar antes de `build` e `test`, porque o cliente sai do schema para o `output` declarado e não vem do `node_modules`.
- Ruim: a 7 sai como ES module por padrão; API NestJS compilada como CommonJS precisa de `moduleFormat = "cjs"` no generator, senão o import do cliente falha.
- Ruim: a 7 não carrega o `.env` sozinha; o `prisma.config.ts` tem de carregar a URL do banco, ou a CLI roda sem ela dentro e fora do Compose.
- Ruim: a tag `latest` do npm aponta para a 8.0.0-rc.28; `npm install prisma` sem versão instala o release candidate, então `prisma` e `@prisma/client` ficam fixados em `^7`. A ferramenta de migração continua decisão separada.

## Referências

Consultado em 2026-10-28.

- [Prisma: Upgrade to Prisma ORM 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7): driver adapter obrigatório (`@prisma/adapter-pg` no PostgreSQL), `prisma.config.ts`, generator `prisma-client` com `output` obrigatório fora do `node_modules`, saída ESM, `.env` não carregado por padrão, Node 20.19 e TypeScript 5.4 como mínimos.
- [Prisma: Generators](https://www.prisma.io/docs/orm/prisma-schema/overview/generators): campo `moduleFormat` aceita `esm` ou `cjs`.
- [NestJS: Data](https://docs.nestjs.com/techniques/database): TypeORM com pacote `@nestjs/typeorm` mantido pelo time do Nest; Prisma sem pacote Nest, cliente exposto por um provider.
- [NestJS: TypeORM](https://docs.nestjs.com/data/typeorm): entidades com decorators, `forFeature()` e `@InjectRepository()` para repositórios.
- [prisma no npm](https://www.npmjs.com/package/prisma): `latest` em 8.0.0-rc.28 e 7.10.1 como última estável na data da consulta; a 7.10.1 declara `engines.node ^20.19 || ^22.12 || >=24.0` e peer dependency de `typescript >= 5.4.0`, compatíveis com o piso Node 22.22 do ADR-0004.
