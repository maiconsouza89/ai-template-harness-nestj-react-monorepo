---
status: accepted
date: 2026-10-29
title: "Usar Node.js 26 LTS como runtime"
description: "Por que Node.js 26 em vez de 24 ou 22: é a linha Active LTS na data do template, acima do piso de 22.22, com suporte até 2029-04."
supersedes:
superseded-by:
---

# 0013. Usar Node.js 26 LTS como runtime

## Contexto e problema

A versão major do Node define a imagem base das duas imagens (ADR-0005), o container de dev do
Compose (ADR-0006) e o campo `engines` do monorepo, e trocá-la depois mexe em todos eles de uma
vez. O ADR-0004 fixou o piso de 22.22, e as dependências escolhidas exigem no máximo 22.15
(OpenTelemetry). O HLD propôs o Node 24, mas o Node 26 entrou em Active LTS em 2026-10-28, e o 24
passou para manutenção em 2026-10-20.

## Opções consideradas

- **Node.js 26**: Active LTS desde 2026-10-28, manutenção a partir de 2027-10-20, fim de vida em 2029-04-30.
- **Node.js 24**: a escolha da versão 0.2.1 do HLD; perdeu porque já está em manutenção e chega ao fim de vida em 2028-04-30, um ano antes.
- **Node.js 22**: o piso mínimo; perdeu porque está em manutenção desde 2025-10 e chega ao fim de vida em 2027-04-30.

## Decisão

Escolhido o **Node.js 26 LTS**, fixado na imagem base, no Compose e em `engines.node` do
`package.json` raiz, porque o template nasce na linha que recebe correções ativas e ganha um ano
de suporte sobre o 24 sem quebrar nenhum piso declarado nos ADRs aceitos.

## Consequências

- Bom: o projeto gerado hoje só precisa trocar de major em 2029-04, e não em 2028-04.
- Bom: cumpre todos os pisos registrados: 22.22 (React Router, ADR-0004), 22.15 (OpenTelemetry, ADR-0019) e 22.12 (`require(esm)` do ADR-0010 e nestjs-pino).
- Ruim: a linha 26 tem um dia de LTS; uma dependência nativa sem binário pré-compilado para o 26 falha na instalação, e o remédio é esperar o binário, não descer de major.
- Ruim: o Corepack não vem no Node 26; o pnpm continua instalado explicitamente, como o ADR-0012 já previa.

## Referências

Consultado em 2026-10-29.

- [nodejs/Release: schedule.json](https://github.com/nodejs/Release/blob/main/schedule.json): datas de LTS, manutenção e fim de vida das linhas 22, 24 e 26.
- [Node.js: distribuições](https://nodejs.org/dist/index.json): v26.13.0 publicada em 2026-10-28 com LTS `Lithium`, e v24.22.2 como `Krypton`.
- [@opentelemetry/sdk-node no npm](https://www.npmjs.com/package/@opentelemetry/sdk-node): 0.300.0 com `engines.node >= 22.15.0`, o piso mais alto entre as dependências novas.
- [nestjs-pino no npm](https://www.npmjs.com/package/nestjs-pino): 5.3.1 com `engines.node >= 22.12.0`.
