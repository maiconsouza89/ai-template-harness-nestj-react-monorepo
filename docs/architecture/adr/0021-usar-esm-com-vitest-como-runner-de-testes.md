---
status: accepted
date: 2026-10-29
title: "Usar ESM com Vitest como runner de testes"
description: "Por que API, SPA e Contratos em ES modules com Vitest como runner único em vez de CommonJS com Jest: o NestJS 12 já sai só como ESM e o Vitest roda sobre o mesmo Vite da SPA."
supersedes:
superseded-by:
---

# 0021. Usar ESM com Vitest como runner de testes

## Contexto e problema

A fundação precisa de um formato de módulo e de um runner de testes para a API NestJS (ADR-0003),
a SPA Vite (ADR-0004) e o pacote Contratos, e nenhum ADR os fixava. O `@nestjs/core` 12 publica só
ES modules, assim como o Better Auth, o `@nestjs/bullmq` e o Nodemailer (ADR-0010, ADR-0015,
ADR-0017). O `nest new` 12 oferece duas variantes: `esm`, a padrão, com Vitest, e `cjs`, com Jest
rodando sob `--experimental-vm-modules`. A escolha define a configuração de teste que todo RF copia.

## Opções consideradas

- **ESM com Vitest**: os três pacotes com `"type": "module"` e Vitest como runner único, a variante padrão do `nest new` 12.
- **CommonJS com Jest**: API compilada como CommonJS, Jest 30 com ts-jest e `--experimental-vm-modules`; perdeu porque depende do `require(esm)` para cada dependência do Nest e deixa a SPA com um segundo runner.

## Decisão

Escolhido **ESM com Vitest 5** nos três pacotes, porque segue o padrão do `nest new` 12, consome
as dependências ESM sem `require(esm)` e usa o mesmo Vite 8 da SPA como base de transformação.

## Consequências

- Bom: um único `vitest.config.ts` por pacote e uma única sintaxe de teste para API, SPA e Contratos.
- Bom: o Prisma fica com o `moduleFormat` padrão `esm`, e a ressalva de CommonJS do ADR-0008 não se aplica.
- Ruim: o plugin CLI do `@nestjs/swagger` (ADR-0020) só roda no `nest build`; nos testes Vitest os decorators de propriedade não são gerados, então nenhum teste pode depender do documento OpenAPI montado em unidade.
- Ruim: o Vitest 5 exige Node 22.12, 24 ou 26 e Vite 6 a 8; subir o Vite para a 9 depende de uma versão do Vitest que a aceite.

## Referências

Consultado em 2026-10-29.

- [@nestjs/schematics no npm](https://www.npmjs.com/package/@nestjs/schematics): na 12, o `schema.json` da application tem `type` com padrão `esm`; o template `ts-esm` usa Vitest e o template `ts` usa Jest com `--experimental-vm-modules`.
- [@nestjs/core no npm](https://www.npmjs.com/package/@nestjs/core): 12.3.2 com `"type": "module"`.
- [vitest no npm](https://www.npmjs.com/package/vitest): 5.0.5, `engines.node ^22.12.0 || ^24.0.0 || >=26.0.0` e peer `vite ^6.4.0 || ^7.0.0 || ^8.0.0`.
- [jest no npm](https://www.npmjs.com/package/jest): 30.5.2; [ts-jest no npm](https://www.npmjs.com/package/ts-jest): 29.4.15 com peer `typescript >=4.3 <7`.
