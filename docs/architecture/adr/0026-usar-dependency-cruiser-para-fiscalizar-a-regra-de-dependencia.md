---
status: accepted
date: 2026-10-30
title: "Usar dependency-cruiser para fiscalizar a regra de dependência"
description: "Por que dependency-cruiser em vez de no-restricted-imports do oxlint: ele resolve o caminho real do import, isola módulos com grupo de captura e detecta ciclo."
supersedes:
superseded-by:
---

# 0026. Usar dependency-cruiser para fiscalizar a regra de dependência

## Contexto e problema

O ADR-0025 fixa quais camadas da API podem importar quais, e só vale se o import errado quebrar
o build. O oxlint do ADR-0022 já roda no `make lint`, mas a regra de import dele olha o texto do
especificador, e o mesmo arquivo de `infra/` aparece como `../infra/x.js` ou `../../infra/x.js`
conforme a profundidade de quem importa. Falta também barrar um módulo importando os internos de
outro e ciclos entre arquivos.

## Opções consideradas

- **dependency-cruiser**: analisa o grafo com os caminhos resolvidos e regras `forbidden` por regex de origem e destino.
- **oxlint `no-restricted-imports` em `overrides`**: sem dependência nova; perdeu porque casa o especificador e não o caminho, não captura o módulo de origem para comparar com o de destino e não detecta ciclo.
- **Só convenção, revisada no PR**: perdeu porque a regra se repete em todo módulo e a revisão deixa passar o import que a ferramenta pegaria.

## Decisão

Escolhido o **dependency-cruiser**, como devDependency de `apps/api` com a configuração versionada
no pacote e chamado no script `lint` dele, para entrar no `make lint` e na CI pelo Turborepo
(ADR-0002); as regras proíbem os imports que o ADR-0025 proíbe, o acesso de um módulo aos
internos de outro e ciclos.

## Consequências

- Bom: `domain/` importando Prisma, ou `presentation/` importando `infra/`, falha o `make lint` com o nome da regra e o par de arquivos.
- Bom: a regra entre módulos usa o grupo de captura (`$1`) no `pathNot`, então módulo novo entra coberto sem editar a configuração.
- Ruim: pasta de camada nova ou exceção à regra exige editar a configuração junto com o ADR que a justifica.
- Ruim: a versão 18.7.0 declara suporte a TypeScript `>=2.0.0 <7.0.0`; casa com o TypeScript 6 do ADR-0020, mas a entrada do TypeScript 7 obriga a rever esta ferramenta.

## Referências

Consultado em 2026-10-30.

- [dependency-cruiser: rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md): regras `forbidden` com `from.path`, `to.path` e `to.pathNot` aceitando `$1`, o mecanismo do isolamento entre módulos.
- [dependency-cruiser no npm](https://www.npmjs.com/package/dependency-cruiser): versão 18.7.0, `engines.node` `^22||^24||>=26` (compatível com o Node 26 do ADR-0013) e `supportedTranspilers.typescript` `>=2.0.0 <7.0.0`, lidos com `npm view`.
- [oxlint: no-restricted-imports](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html): `paths` e `patterns` por `group` ou `regex` sobre o especificador do import, o limite que fez a opção perder.
