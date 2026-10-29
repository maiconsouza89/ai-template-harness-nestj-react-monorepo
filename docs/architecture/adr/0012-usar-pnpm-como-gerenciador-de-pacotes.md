---
status: accepted
date: 2026-10-29
title: "Usar pnpm como gerenciador de pacotes"
description: "Por que pnpm em vez de npm para os workspaces do monorepo: node_modules estrito que barra dependência não declarada, protocolo workspace: e store compartilhado."
supersedes:
superseded-by:
---

# 0012. Usar pnpm como gerenciador de pacotes

## Contexto e problema

O ADR-0002 escolheu o Turborepo e deixou em aberto o gerenciador que fornece os workspaces sobre
os quais ele roda. A escolha define o arquivo de workspaces, o lockfile, a forma de declarar o
pacote Contratos que API e SPA compartilham (HLD) e os comandos de instalação no Compose e nas
imagens, então é cara de reverter. O HLD pôs na mesa pnpm e npm, com o critério de não aumentar o
setup de 15 minutos nem prender o projeto gerado a um destino.

## Opções consideradas

- **pnpm**: store endereçado por conteúdo e `node_modules` estrito, em que cada pacote só enxerga o que declarou; workspaces em `pnpm-workspace.yaml` e dependência interna por `workspace:`.
- **npm**: vem junto com o Node, sem instalação extra; perdeu porque o `node_modules` plano deixa um pacote importar dependência que não declarou, e o import passa local e quebra na imagem ou no projeto gerado.

## Decisão

Escolhido o **pnpm 12**, fixado no campo `packageManager` do `package.json` raiz, porque o
`node_modules` estrito e o protocolo `workspace:` fazem a fronteira entre `apps/` e `packages/`
falhar na instalação em vez de no deploy, e o Turborepo o suporta sem configuração a mais.

## Consequências

- Bom: um pacote que importa dependência só declarada em outro falha já no `pnpm install`/build local, não só na imagem de deploy.
- Bom: dependência `workspace:*` para Contratos nunca resolve do registro; se o pacote local sumir ou mudar de nome, a instalação falha.
- Ruim: o pnpm não vem com o Node e o Corepack sai da distribuição a partir do Node 25; Compose e imagens instalam o pnpm explicitamente na versão do `packageManager`, não por `corepack enable`.
- Ruim: ferramenta que assume `node_modules` plano pode não achar o que precisa; o remédio é `publicHoistPattern` pontual no `pnpm-workspace.yaml`, nunca `nodeLinker: hoisted` geral, que desfaz o ganho acima.
- Ruim: os comandos do README e dos `scripts/*.sh` são `pnpm`, e o dev sem pnpm instalado fora do Compose tem um passo a mais.

## Referências

Consultado em 2026-10-29.

- [pnpm: Motivation](https://pnpm.io/motivation): store único endereçado por conteúdo e `node_modules` não plano, com só as dependências diretas na raiz via symlink para `.pnpm`.
- [pnpm: Workspace](https://pnpm.io/workspaces): `pnpm-workspace.yaml` obrigatório na raiz e protocolo `workspace:` que recusa resolver para algo que não seja pacote local.
- [pnpm: Installation](https://pnpm.io/installation): instalação por script standalone ou `npm install -g pnpm`, e fixação da versão por projeto no campo `packageManager`.
- [pnpm: Working with Docker](https://pnpm.io/docker): `pnpm fetch` para cache de camada, `pnpm deploy --filter` para imagem só com as dependências de um app, e cópia do binário da imagem oficial.
- [pnpm no npm](https://www.npmjs.com/package/pnpm): 12.16.1 como `latest` na data da consulta, `engines.node >= 18`, abaixo do piso Node 22.22 do ADR-0004.
- [Node.js 24: Corepack](https://nodejs.org/docs/latest-v24.x/api/corepack.html): Corepack experimental e fora da distribuição a partir do Node 25.
- [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository): pnpm entre os gerenciadores suportados, workspaces em `pnpm-workspace.yaml` e lockfile obrigatório.
