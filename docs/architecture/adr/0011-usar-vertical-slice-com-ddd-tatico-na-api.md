---
status: superseded
date: 2026-10-30
title: "Usar vertical slice com DDD tático na API"
description: "Por que um slice por caso de uso dentro do módulo da funcionalidade, com domínio e infraestrutura separados, em vez de módulo por entidade, camadas horizontais ou Clean/hexagonal: o caso de uso novo fica numa pasta só e o Prisma não entra na regra."
supersedes:
superseded-by: "0025"
---

# 0011. Usar vertical slice com DDD tático na API

## Contexto e problema

O PRD pede que um dev crie uma entidade nova copiando o padrão de tarefas em até 2 horas, o que
exige que o padrão diga onde fica cada rota, regra, acesso a dados e teste. O NestJS (ADR-0003)
fixa o módulo como fronteira, mas não o que vai dentro dele, e o ADR-0009 deixou em aberto como o
código gerado pelo `nest generate` se encaixa no padrão. Com o Prisma (ADR-0008) gerando o
cliente a partir do schema, falta também decidir se a regra de negócio enxerga o Prisma. Essa
organização se repete em toda entidade e é cara de trocar depois que elas existem.

## Opções consideradas

- **Vertical slice com DDD tático**: módulo por funcionalidade, uma pasta por caso de uso (controller, handler, DTO, teste), e `domain/` e `infra/` compartilhados pelos slices da funcionalidade.
- **Módulo por entidade**: o padrão do `nest g resource`, um controller e um service com todos os casos de uso; perdeu porque o service cresce a cada caso de uso e mudar um mexe no arquivo de todos.
- **Camadas horizontais**: pastas globais `controllers/`, `services/` e `repositories/`; perdeu porque um caso de uso novo se espalha por várias pastas e a fronteira de módulo do ADR-0003 deixa de casar com a funcionalidade.
- **Clean/hexagonal**: camadas `domain`, `application` e `infrastructure` com portas e adaptadores em cada módulo; perdeu porque o caso de uso fica repartido entre camadas, enquanto no slice ele fica numa pasta só e a separação de camadas vale só para domínio e infraestrutura.

## Decisão

Escolhido o **vertical slice com DDD tático**: cada funcionalidade é um módulo Nest (`tasks/`)
com uma pasta por caso de uso (`create-task/`, `list-tasks/`...); o handler de cada slice depende
só de `domain/` (entidade, value objects e o repositório como classe abstrata), e `infra/` traz a
implementação com Prisma, ligada no módulo por `{ provide: TaskRepository, useClass: PrismaTaskRepository }`.

## Consequências

- Bom: caso de uso novo é uma pasta nova e uma linha no módulo; os slices existentes não são editados.
- Bom: teste de unidade do handler troca o repositório abstrato por dublê com `overrideProvider()`, sem banco e sem mock do cliente Prisma.
- Ruim: o repositório por funcionalidade contraria a recomendação original do vertical slice de evitar repositório compartilhado; uma consulta que só um slice usa ainda passa pela porta do domínio, e quem a escreve tem de decidir se ela entra no repositório ou vira consulta própria do slice.
- Ruim: o `nest g resource` do ADR-0009 gera o módulo por entidade; o padrão usa `nest g module` e cria slices, `domain/` e `infra/` à mão ou por um gerador próprio do template.
- Ruim: as tabelas e rotas de contas do Better Auth (ADR-0010) seguem a biblioteca e não este padrão; só o código do template sobre elas (bloqueio por e-mail, administração) vira slice.

## Referências

Consultado em 2026-10-29.

- [Jimmy Bogard: Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/): organizar por requisição e não por camada, "minimizar o acoplamento entre slices e maximizar dentro do slice", e evitar repositório e service compartilhados, recomendação de que esta decisão se afasta de propósito.
- [NestJS: Custom providers](https://docs.nestjs.com/fundamentals/custom-providers): classe abstrata como contrato TypeScript e token de injeção ao mesmo tempo, ligada à implementação por `useClass`; interface sozinha não serve de token.
