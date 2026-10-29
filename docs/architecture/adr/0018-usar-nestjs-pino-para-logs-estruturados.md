---
status: accepted
date: 2026-10-29
title: "Usar nestjs-pino para logs estruturados"
description: "Por que nestjs-pino em vez do ConsoleLogger do Nest em JSON: redação de campos por caminho e contexto de requisição em todo log, que o logger embutido deixa de fora de propósito."
supersedes:
superseded-by:
---

# 0018. Usar nestjs-pino para logs estruturados

## Contexto e problema

O PRD exige, pela LGPD, que logs não guardem nome, e-mail, senha, cookie nem cabeçalho de
autorização, e o HLD pede JSON por linha com `requestId`, `userId`, rota, status e latência em
cada entrada. Esses campos têm de aparecer também nos logs dos serviços, não só no log de acesso.
Faltava escolher o logger, que todo módulo da API usa.

## Opções consideradas

- **nestjs-pino**: pino e pino-http ligados ao Nest, com logger por requisição via AsyncLocalStorage e a opção `redact` do pino.
- **ConsoleLogger do Nest com `json: true`**: logger embutido em JSON, sem dependência; perdeu porque não tem redação de campos e não amarra o `requestId` aos logs dos serviços.

## Decisão

Escolhido o **nestjs-pino 5** com pino 10 e pino-http 11, registrado uma vez no módulo raiz com
`bufferLogs` e `app.useLogger`, e redação por caminho de `email`, `name`, `password`, `cookie` e
`authorization`, porque entrega a redação que a LGPD do PRD pede e o contexto por requisição sem
código próprio.

## Consequências

- Bom: um log escrito por um serviço sai com o `req.id` da requisição sem receber o request por parâmetro.
- Bom: a redação acontece no logger, antes da escrita, então um `logger.info(user)` esquecido não vaza e-mail; o teste do HLD sobre cadastro e login confere isso.
- Ruim: a redação é por caminho explícito; um campo pessoal com outro nome ou em outro nível passa, e caminho com curinga custa bem mais por linha.
- Ruim: o `requestId` padrão é um contador por processo, repetido entre réplicas; o template define `genReqId` para gerar um id único.

## Referências

Consultado em 2026-10-29.

- [NestJS: Logger](https://docs.nestjs.com/techniques/logger): `ConsoleLogger` com `json: true`; redação de campos é uma das coisas que o logger embutido deixa de fora, e Pino é indicado quando ela é necessária.
- [iamolegga/nestjs-pino](https://github.com/iamolegga/nestjs-pino): `LoggerModule.forRoot` uma vez no módulo raiz, `bufferLogs` e `app.useLogger`, logger por requisição com AsyncLocalStorage, `genReqId` para trocar o contador padrão.
- [pino: Redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md): `redact` por caminhos, com `censor` ou `remove`; cerca de 2 por cento de custo sem curinga e custo alto com curinga.
- [nestjs-pino no npm](https://www.npmjs.com/package/nestjs-pino): 5.3.1, `engines.node >= 22.12.0`, peers `pino ^10`, `pino-http ^11` e `@nestjs/core ^11.0.8 || ^12.0.2`, compatível com o ADR-0003.
