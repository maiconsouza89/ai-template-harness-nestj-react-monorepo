---
status: accepted
date: 2026-10-29
title: "Usar Nest CLI para as operações com o Nest"
description: "Por que o Nest CLI como devDependency do pacote da API em vez de instalado global ou via npx: scaffold, geração, build e watch saem de uma versão fixada no lockfile."
supersedes:
superseded-by:
---

# 0009. Usar Nest CLI para as operações com o Nest

## Contexto e problema

A API é NestJS (ADR-0003) e o padrão de CRUD de tarefas tem de ser copiado para uma entidade nova
em até 2 horas (PRD). Criar o pacote da API, gerar module, controller e service, compilar e rodar
em modo watch são operações que todo dev repete e que precisam sair iguais em qualquer máquina e
no Compose (ADR-0006). Nenhuma ferramenta alternativa ao Nest CLI foi considerada; a decisão em
aberto era como ele entra no repositório e em que modo.

## Opções consideradas

- **Nest CLI como devDependency do pacote da API, em modo standard**: `@nestjs/cli` no `package.json` da API, chamado pelos scripts do pacote.
- **Nest CLI global ou via `npx @nestjs/cli@latest`**: forma que a documentação apresenta; perdeu porque a versão que gera e compila passa a depender da máquina ou do dia, e não do lockfile.

## Decisão

Escolhido o **Nest CLI como devDependency do pacote da API, em modo standard**: `nest new` cria o
pacote na fundação, `nest generate` gera o código das entidades, e os scripts `build` e de
desenvolvimento chamam `nest build` e `nest start --watch`, que o Turborepo (ADR-0002) orquestra.

## Consequências

- Bom: `nest build` e `nest start --watch` rodam a versão do CLI do lockfile no host, na CI e no Compose; não há instalação global a documentar.
- Bom: `nest generate` com `--dry-run` mostra os arquivos antes de escrevê-los, então o dev confere o padrão do módulo antes de criar a entidade.
- Ruim: `nest g resource` gera também uma classe de entidade, que com o Prisma (ADR-0008) não tem uso; o padrão do template tem de dizer se ela é apagada ou se a geração usa module, controller e service separados.
- Ruim: o modo monorepo do CLI (`nest-cli.json` com `projects`, dependências na raiz) sobrepõe o Turborepo do ADR-0002 e fica de fora; uma segunda aplicação Nest vira outro pacote do workspace, não um projeto do CLI.
- Ruim: `nest new` inicializa um repositório git e instala dependências por conta própria; dentro do monorepo ele roda com `--skip-git`, senão nasce um `.git` aninhado no pacote da API.

## Referências

Consultado em 2026-10-29.

- [NestJS: CLI Overview](https://docs.nestjs.com/cli/overview): comandos `new`, `generate`, `build` e `start`; instalação global ou `npx @nestjs/cli@latest`; modos standard e monorepo diferem só no build.
- [NestJS: CLI command reference](https://docs.nestjs.com/cli/usages): `nest new --skip-git` e `--skip-install`, `nest generate --dry-run` e `--no-spec`, `nest build --builder` (`tsc`, `swc` ou `rspack`), `nest start --watch`.
- [NestJS: Workspaces](https://docs.nestjs.com/cli/monorepo): modo monorepo com `projects` no `nest-cli.json`, aplicações sem `package.json` próprio e dependências do workspace inteiro; modo standard indicado para aplicações individuais.
- [NestJS: CRUD generator](https://docs.nestjs.com/recipes/crud-generator): `nest g resource` gera module, controller, service, classe de entidade, DTOs e specs, sem acoplamento a ORM.
- [@nestjs/cli no npm](https://www.npmjs.com/package/@nestjs/cli): versão 12.0.11 como `latest` na data da consulta, `engines.node >= 20.11`, abaixo do piso Node 22.22 do ADR-0004, e peer dependencies de builder todas opcionais.
