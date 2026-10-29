---
status: accepted
date: 2026-10-23
title: "Usar TypeScript com NestJS no backend"
description: "Por que TypeScript com NestJS em vez de Express, Fastify, Python ou Go: o time já domina, o painel compartilha tipos e o Nest traz estrutura e recursos prontos."
supersedes:
superseded-by:
---

# 0002. Usar TypeScript com NestJS no backend

## Contexto e problema

O viewstore precisa de um backend que sirva o painel, o mapa e a contratação, faça permissão por papel (exibidor, anunciante, operador), movimente dinheiro com saldo nunca negativo e venda atômica, e processe tarefas fora da requisição, como o fechamento mensal e a renovação de assinaturas. A escala inicial é pequena (100 telas em 6 meses) e o time é enxuto, então velocidade de entrega e padrão de código pesam mais que desempenho bruto. O painel web será em TypeScript. O time já colocou TypeScript, NestJS e Python em produção, e Go não.

## Opções consideradas

- **TypeScript com NestJS**: framework opinativo, com módulos e injeção de dependência, que o time já usou em produção.
- **TypeScript com Express ou Fastify**: mesma linguagem, mas framework mínimo, então estrutura, validação, autorização e filas ficam para o time montar e padronizar.
- **Python**: o time domina, mas os contratos da API viram duas definições (Python e TypeScript), mantidas em sincronia.
- **Go**: barato de operar, mas ninguém do time o colocou em produção, e aprender atrasaria o piloto.

## Decisão

Escolhido **TypeScript com NestJS**, porque o time já o domina, o painel compartilha tipos com a API e o framework já traz pronto o que o PRD pede: guards para permissão por papel, filas, agendamento e OpenAPI. A consistência financeira fica com as transações do banco, decididas em um ADR à parte.

## Consequências

- Bom: um contrato de API alterado no backend quebra a compilação do painel, e não em produção.
- Bom: permissão por papel fica em guards declarados por rota, então uma rota sem `@Roles` aparece na revisão de código.
- Ruim: decorators e injeção de dependência deixam o fluxo menos explícito que em Express, e quem entra no time precisa aprender as convenções do Nest.
- Ruim: TypeScript não protege valor monetário, então dinheiro vai em centavos inteiros ou tipo decimal, nunca em `number` de ponto flutuante.
- Ruim: CPU pesada no processo da API, como transcodificar um criativo, trava o event loop, então vai para um worker via fila.

## Referências

Consultado em 2026-10-23.

- [NestJS: Guards](https://docs.nestjs.com/guards): documenta o `RolesGuard` com `@Roles`, que sustenta a permissão por papel por rota.
- [NestJS: Queues](https://docs.nestjs.com/techniques/queues): `@nestjs/bullmq` integra filas BullMQ (sobre Redis) para tarefas fora da requisição.
- [NestJS: Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling): `@nestjs/schedule` cobre tarefas recorrentes como o fechamento mensal.
- [NestJS: OpenAPI](https://docs.nestjs.com/openapi/introduction): `@nestjs/swagger` gera a especificação a partir dos decorators.
- [NestJS: Performance (Fastify)](https://docs.nestjs.com/techniques/performance): o Nest usa Express por padrão e aceita Fastify como adaptador, então escolher o Nest não descarta o Fastify como camada HTTP.
