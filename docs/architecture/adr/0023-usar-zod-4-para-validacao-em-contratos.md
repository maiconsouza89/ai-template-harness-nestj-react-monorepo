---
status: accepted
date: 2026-10-29
title: "Usar Zod 4 para validação em Contratos"
description: "Por que Zod 4 nos esquemas do pacote Contratos e na validação das variáveis de ambiente em vez de class-validator: o mesmo esquema roda no navegador e no Node, sem decorators no bundle da SPA."
supersedes:
superseded-by:
---

# 0023. Usar Zod 4 para validação em Contratos

## Contexto e problema

O HLD põe no pacote Contratos os esquemas de validação usados pela API e pela SPA (regra de senha,
título obrigatório, filtros e paginação), para o contrato HTTP não divergir entre os dois lados. A
API também valida as variáveis de ambiente na subida e falha se faltar alguma. Nenhum ADR escolhia
a biblioteca. O ADR-0020 manteve os DTOs em classe para o plugin do `@nestjs/swagger`, mas não
decidiu quem valida o corpo.

## Opções consideradas

- **Zod 4**: esquemas declarados em TypeScript com inferência de tipo, sem dependências, que rodam igual no navegador e no Node.
- **class-validator com class-transformer**: decorators nos DTOs, peer opcional do `@nestjs/swagger`; perdeu porque leva decorators e `reflect-metadata` ao bundle da SPA, que não valida formulário com classes.

## Decisão

Escolhido o **Zod 4** para os esquemas de Contratos e para o esquema das variáveis de ambiente,
porque um esquema só valida o formulário na SPA e o corpo na API, e o tipo TypeScript sai dele.

## Consequências

- Bom: uma mudança na regra de senha é feita num arquivo de Contratos e vale nos dois lados no mesmo build.
- Bom: a validação das variáveis de ambiente usa a mesma biblioteca, sem dependência a mais.
- Ruim: o DTO em classe que o plugin do `@nestjs/swagger` lê (ADR-0020) convive com o esquema Zod; se os dois divergirem, o documento OpenAPI mente sobre o que a API aceita.
- Ruim: o template precisa de um pipe que aplique o esquema Zod no controller, porque o `ValidationPipe` padrão do Nest trabalha com class-validator.

## Referências

Consultado em 2026-10-29.

- [zod no npm](https://www.npmjs.com/package/zod): 4.6.7, sem dependências nem peer dependencies.
- [@nestjs/swagger no npm](https://www.npmjs.com/package/@nestjs/swagger): 12.0.5 com `class-validator` e `class-transformer` como peers opcionais.
- [class-validator no npm](https://www.npmjs.com/package/class-validator): 0.15.1.
