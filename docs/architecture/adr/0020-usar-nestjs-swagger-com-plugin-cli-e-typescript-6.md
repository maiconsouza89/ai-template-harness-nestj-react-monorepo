---
status: accepted
date: 2026-10-29
title: "Usar @nestjs/swagger com plugin CLI e TypeScript 6"
description: "Por que gerar o OpenAPI com @nestjs/swagger e o plugin CLI em vez de só compartilhar os tipos de Contratos, mantendo o TypeScript do monorepo na major 6 porque o plugin não aceita a 7."
supersedes:
superseded-by:
---

# 0020. Usar @nestjs/swagger com plugin CLI e TypeScript 6

## Contexto e problema

O HLD publica um documento OpenAPI 3 em `/api/docs` fora de produção, gerado dos controllers e
DTOs, para quem consome a API sem ler o código. O plugin CLI do `@nestjs/swagger` gera os
decorators a partir do AST do TypeScript, o que corta o boilerplate de cada DTO que o dev copia.
Ao conferir as peers, apareceu o conflito: o `@nestjs/swagger` 12.0.5 aceita `typescript ^5.5 || ^6`,
o `@nestjs/cli` 12 (ADR-0009) depende de `typescript ~6.0.2`, e o `latest` do TypeScript já é o
7.0.2. Nenhum ADR fixava a versão do TypeScript.

## Opções consideradas

- **@nestjs/swagger com plugin CLI, TypeScript 6**: documento gerado dos controllers, com os decorators de propriedade escritos pelo plugin no build do Nest CLI.
- **@nestjs/swagger sem plugin, esquemas Zod via Standard Schema**: o documento sai dos esquemas de Contratos, sem depender do compilador; perdeu porque cada rota passa a declarar `schema` à mão e o padrão de DTO copiado fica maior.
- **Só os tipos de Contratos, sem documento**: a SPA usa os tipos e ninguém mais consome a API; perdeu porque o projeto gerado que abrir a API para outro cliente fica sem contrato publicado.

## Decisão

Escolhido o **@nestjs/swagger 12 com o plugin CLI**, e o **TypeScript fixado na major 6** em todo o
monorepo enquanto o `@nestjs/swagger` e o `@nestjs/cli` não aceitarem a 7, porque o plugin mantém
o DTO de referência curto e o Nest CLI já exige o TypeScript 6 de qualquer forma.

## Consequências

- Bom: um DTO novo aparece no documento sem decorator de propriedade escrito à mão.
- Ruim: o TypeScript 7 fica de fora até as peers do `@nestjs/swagger` e a dependência do `@nestjs/cli` aceitarem a 7; subir antes disso é supersede deste ADR.
- Ruim: o plugin só roda no build do Nest CLI; testes com `ts-jest` registram o plugin como transformer, e o builder SWC exige `--type-check` ou o arquivo de metadados com `loadPluginMetadata()`.
- Ruim: o documento é montado depois de `app.enableVersioning()`; na ordem errada as rotas saem sem o prefixo `/api/v1`.

## Referências

Consultado em 2026-10-29.

- [NestJS: OpenAPI introduction](https://docs.nestjs.com/openapi/introduction): `DocumentBuilder`, `SwaggerModule.createDocument` e `setup`, aviso sobre `enableVersioning()` antes do documento, e suporte a Standard Schema e Zod 4.2 nos decorators de parâmetro.
- [NestJS: OpenAPI CLI plugin](https://docs.nestjs.com/openapi/cli-plugin): plugin que adiciona decorators a partir do AST do TypeScript; `ts-jest` precisa do transformer, e o builder SWC precisa de `--type-check` ou de `loadPluginMetadata()`.
- [@nestjs/swagger no npm](https://www.npmjs.com/package/@nestjs/swagger): 12.0.5, peer `typescript ^5.5.0 || ^6.0.0` (opcional) e `@nestjs/core ^12.0.0`.
- [@nestjs/cli no npm](https://www.npmjs.com/package/@nestjs/cli): 12.0.11 com dependência direta `typescript ~6.0.2`.
- [typescript no npm](https://www.npmjs.com/package/typescript): `latest` em 7.0.2 e 6.0.3 como última da major 6.
