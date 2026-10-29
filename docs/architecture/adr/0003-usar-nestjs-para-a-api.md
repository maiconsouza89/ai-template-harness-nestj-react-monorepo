---
status: accepted
date: 2026-10-28
title: "Usar NestJS para a API"
description: "Por que NestJS em vez de Express ou Fastify puros: módulos, injeção de dependência e utilitários de teste prontos dão ao template um padrão de CRUD que se copia, em vez de uma estrutura montada à mão."
supersedes:
superseded-by:
---

# 0003. Usar NestJS para a API

## Contexto e problema

O template entrega uma API com contas, papéis, envio de e-mail e um CRUD de tarefas, e o PRD pede
que um dev crie uma entidade nova copiando o padrão de tarefas em até 2 horas. Para isso o padrão
precisa ser uniforme: onde fica a rota, a regra, o acesso a dados e o teste de cada entidade.
Faltava escolher o framework HTTP do backend, que define essa estrutura em todo projeto gerado e
é caro de trocar depois que as entidades existem.

## Opções consideradas

- **NestJS**: framework em TypeScript sobre Express (padrão) ou Fastify, com módulos, injeção de dependência e utilitários de teste próprios.
- **Express puro**: framework HTTP minimalista; perdeu porque módulos, injeção de dependência e validação teriam de ser desenhados e mantidos pelo template.
- **Fastify puro**: framework HTTP com plugins e validação por JSON Schema; perdeu pelo mesmo motivo, sem convenção de módulo ou de injeção para o padrão de CRUD seguir.

## Decisão

Escolhido o **NestJS**, porque o módulo por funcionalidade (controller, service, providers) é a
própria convenção do framework, então o padrão de tarefas se copia sem um guia de estrutura feito
à mão, e `@nestjs/testing` permite trocar dependências por dublês nos testes sem código de apoio.

## Consequências

- Bom: cada entidade do exemplo é um módulo com fronteira explícita; um provider não exportado não é visível a outro módulo e a injeção falha no boot.
- Bom: teste de unidade sobe o módulo com `Test.createTestingModule()` e troca o repositório por dublê com `overrideProvider()`; teste e2e usa `createNestApplication()` com Supertest.
- Ruim: decorators e `reflect-metadata` são obrigatórios, e quem só conhece Express precisa aprender módulo, provider e escopo de injeção antes do primeiro endpoint.
- Ruim: a versão 12 exige Node 20 ou superior; a versão do Node e o adaptador HTTP (Express ou Fastify) ficam como decisões separadas, que este ADR não fixa.

## Referências

Consultado em 2026-10-28.

- [NestJS: introdução](https://docs.nestjs.com/): framework em TypeScript que usa Express por padrão e pode usar Fastify, expondo a API do servidor subjacente.
- [NestJS: Modules](https://docs.nestjs.com/modules): módulo com `@Module()` como forma recomendada de organizar; encapsula providers e só expõe os exportados.
- [NestJS: Testing](https://docs.nestjs.com/fundamentals/testing): `@nestjs/testing`, `Test.createTestingModule()`, `overrideProvider()`, e2e com Supertest; agnóstico de test runner.
- [@nestjs/core no npm](https://www.npmjs.com/package/@nestjs/core): versão 12.3.2 como a mais recente na data da consulta, `engines.node >= 20` e peer dependency de `reflect-metadata` e `rxjs`.
