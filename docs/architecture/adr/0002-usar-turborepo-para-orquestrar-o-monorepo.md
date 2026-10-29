---
status: accepted
date: 2026-10-28
title: "Usar Turborepo para orquestrar o monorepo"
description: "Por que Turborepo sobre os workspaces do gerenciador em vez de Nx, só workspaces ou repositórios separados: orquestração e cache com o mínimo de configuração."
supersedes:
superseded-by:
---

# 0002. Usar Turborepo para orquestrar o monorepo

## Contexto e problema

O template entrega um backend NestJS e um frontend React que evoluem juntos, e o dev que cria um
projeto a partir dele precisa ter o app rodando em até 15 minutos (PRD). Os alvos `lint`, `test` e
`build` do `Makefile` despacham para `scripts/<alvo>.sh`, que precisam rodar a tarefa em cada
pacote na ordem das dependências entre eles. Faltava decidir se o código fica num repositório só
e, se fica, o que orquestra as tarefas entre os pacotes. A escolha molda a estrutura de pastas e a
configuração de todo projeto gerado, então é cara de reverter.

## Opções consideradas

- **Turborepo**: roda os scripts de `package.json` que já existem, configurado por um `turbo.json`, com cache local por padrão e cache remoto opcional.
- **Nx**: build system com plugins, geradores, grafo de projetos e regras de fronteira; perdeu pelo volume de conceito e configuração a aprender antes do primeiro CRUD.
- **Só workspaces do gerenciador**: scripts recursivos sem orquestrador; perdeu por não ter cache nem ordenação por grafo de tarefas.
- **Repositórios separados**: back e front em repositórios distintos; perdeu porque mudança que atravessa API e tela vira dois PRs e o tipo compartilhado vira pacote publicado.

## Decisão

Escolhido o **Turborepo**, porque entrega ordenação por dependência e cache sobre os scripts que
cada pacote já tem, com um único arquivo de configuração e sem plugins ou geradores para aprender.

## Consequências

- Bom: `scripts/lint.sh`, `scripts/test.sh` e `scripts/build.sh` se reduzem a `turbo run <alvo>`; o contrato do `Makefile` não muda.
- Bom: rodar `make build` duas vezes sem alterar código faz a segunda execução sair do cache local, sem nenhuma conta ou serviço externo.
- Ruim: sem geradores, criar um pacote novo é copiar um existente à mão; o padrão de tarefas do PRD precisa ser documentado, não gerado.
- Ruim: sem regra de fronteira entre pacotes, um import indevido (front importando código do back) passa no build; se isso importar, vira lint próprio.
- Ruim: o gerenciador de pacotes que fornece os workspaces continua uma decisão separada, que este ADR não fixa.

## Referências

Consultado em 2026-10-28.

- [Turborepo: documentação](https://turborepo.dev/docs): roda os scripts de `package.json` existentes, configurado por `turbo.json`, com npm, yarn ou pnpm.
- [Turborepo: Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching): cache local por padrão; cache remoto opcional, gerenciado pela Vercel ou auto-hospedado.
- [Nx: introdução](https://nx.dev/docs/getting-started/intro): plugins com geradores, grafo de projetos, regras de fronteira entre módulos e cache remoto pelo Nx Cloud pago.
- [turbo no npm](https://www.npmjs.com/package/turbo): versão 2.11.10 como a mais recente na data da consulta.
