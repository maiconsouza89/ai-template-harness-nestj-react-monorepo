---
status: accepted
date: 2026-10-29
title: "Usar oxlint sem lint de tipos e Prettier"
description: "Por que oxlint só sintático com Prettier em vez de ESLint com typescript-eslint ou Biome: é o par que o nest new 12 gera, e sem o tsgolint nenhum compilador TypeScript 7 entra no monorepo."
supersedes:
superseded-by:
---

# 0022. Usar oxlint sem lint de tipos e Prettier

## Contexto e problema

O `scripts/lint.sh` e o `scripts/format.sh` da fundação precisam de uma ferramenta de lint e uma
de formatação para API, SPA e Contratos, e nenhum ADR as fixava. O `nest new` 12 gera oxlint com
`--type-aware` e Prettier. O lint de tipos do oxlint exige o `oxlint-tsgolint`, que roda sobre o
typescript-go, o compilador do TypeScript 7, enquanto o ADR-0020 fixa o TypeScript na major 6 em
todo o monorepo.

## Opções consideradas

- **oxlint sem `--type-aware` e Prettier**: lint sintático com os plugins de TypeScript e React do oxlint, formatação pelo Prettier.
- **oxlint com `--type-aware`, como exceção ao ADR-0020**: mesmo par, com o tsgolint trazendo o TypeScript 7 só para o lint; perdeu porque o tsconfig teria de valer em dois compiladores de majors diferentes.
- **ESLint com typescript-eslint e Prettier**: aceita TypeScript `>=4.8.4 <6.1.0` e usa o TS 6 do monorepo nas regras de tipo; perdeu por divergir do que o Nest gera e pela configuração maior.
- **Biome**: lint e formatação num binário só; perdeu por divergir do que Nest e Vite geram.

## Decisão

Escolhido o **oxlint 1 sem `--type-aware`, com Prettier 3**, porque mantém o par que o `nest new`
12 gera sem trazer o compilador do TypeScript 7, e a checagem de tipos fica no `tsc` do TS 6,
que já roda no build.

## Consequências

- Bom: nenhuma ferramenta do monorepo depende do TypeScript 7, e o ADR-0020 continua valendo sem exceção.
- Ruim: regras que precisam de tipo (`no-floating-promises`, `no-misused-promises`) ficam de fora; promessa esquecida só aparece em teste ou em revisão.
- Ruim: o script `lint` gerado pelo `nest new` vem com `--type-aware` e o `oxlint-tsgolint`, que a fundação tira; copiar o template de novo traz os dois de volta.
- Ruim: ligar o lint de tipos depois exige supersede deste ADR, ou do ADR-0020 quando o TypeScript 7 entrar.

## Referências

Consultado em 2026-10-29.

- [@nestjs/schematics no npm](https://www.npmjs.com/package/@nestjs/schematics): na 12, o template da application usa `oxlint --type-aware` com `oxlint-tsgolint` e Prettier.
- [oxlint no npm](https://www.npmjs.com/package/oxlint): 1.90.0, peer `oxlint-tsgolint >=7.0.2005`.
- [oxlint-tsgolint no npm](https://www.npmjs.com/package/oxlint-tsgolint): 7.0.2005, "type-aware TypeScript linter powered by typescript-go".
- [typescript-eslint no npm](https://www.npmjs.com/package/typescript-eslint): 8.72.1, peer `typescript >=4.8.4 <6.1.0` e `eslint ^8.57 || ^9 || ^10`.
- [prettier no npm](https://www.npmjs.com/package/prettier): 3.9.10.
