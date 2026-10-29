---
status: accepted
date: 2026-10-29
title: "Usar BullMQ para a fila de e-mail"
description: "Por que BullMQ com @nestjs/bullmq em vez de pg-boss ou outbox com poller próprio: módulo oficial do Nest, retry com backoff e workers concorrentes prontos, ao custo de enfileirar fora da transação."
supersedes:
superseded-by:
---

# 0015. Usar BullMQ para a fila de e-mail

## Contexto e problema

O cadastro não pode falhar porque o SMTP falhou (RF-001), e o e-mail tem de sair em até 2 minutos
com novas tentativas. Por isso a requisição só enfileira, e um worker no mesmo processo da API
envia, com várias réplicas consumindo sem pegar o mesmo job. A versão 0.1.0 do HLD usava pg-boss
com o job gravado na transação do cadastro; a revisão 0.2.0 trocou para BullMQ sobre o Valkey
(ADR-0014), aceitando enfileirar depois do commit.

## Opções consideradas

- **BullMQ com `@nestjs/bullmq`**: fila sobre servidor compatível com Redis, com `@Processor`, `WorkerHost`, retry e backoff exponencial, documentada pelo Nest.
- **pg-boss**: fila no PostgreSQL com `SKIP LOCKED` e criação de job na transação via adapter Prisma; perdeu na revisão 0.2.0 do HLD, que preferiu o módulo documentado pelo Nest e um padrão de fila que o dev já reconhece.
- **Tabela outbox com poller próprio**: o job é uma linha gravada na transação e lida por um loop do template; perdeu porque retry, backoff, concorrência e limpeza viram código do template.

## Decisão

Escolhido o **BullMQ 6 com `@nestjs/bullmq` 12**, numa fila `email.send` com 5 tentativas e backoff
exponencial a partir de 5 segundos, porque é a integração de fila documentada pelo Nest e traz
pronto o que o PRD pede do envio, sem código de fila no template.

## Consequências

- Bom: várias réplicas da API consomem `email.send` sem pegar o mesmo job, e o job que esgota as 5 tentativas fica como falho para inspeção.
- Ruim: o job entra depois do commit, fora da transação do PostgreSQL; queda da API nesse intervalo perde o e-mail, coberto pelo reenvio (RF-001, RF-002) e por novo pedido (RF-005).
- Ruim: a entrega é ao menos uma vez; um job repetido depois de um envio bem-sucedido manda o mesmo e-mail duas vezes.
- Ruim: `@nestjs/bullmq` sai como ES module e entra na API pelo mesmo `require(esm)` do ADR-0010.
- Ruim: o BullMQ 6 tem peers opcionais (`ioredis`, `redis`, `pg`); a API declara o `ioredis` 5 explicitamente, o mesmo do ADR-0014.

## Referências

Consultado em 2026-10-29.

- [NestJS: Queues](https://docs.nestjs.com/techniques/queues): `BullModule.forRoot` com `connection`, `registerQueue`, `@Processor` com `WorkerHost`; o Bull está em modo de manutenção e o BullMQ em desenvolvimento ativo.
- [BullMQ: Going to production](https://docs.bullmq.io/guide/going-to-production): AOF e `noeviction` como requisitos de produção da fila.
- [pg-boss](https://pgboss.io/): fila no PostgreSQL com `SKIP LOCKED`, criação de job numa transação existente com adapter Prisma, retry com backoff exponencial.
- [bullmq no npm](https://www.npmjs.com/package/bullmq): 6.5.1, licença MIT, peers `ioredis`, `redis`, `pg` e `bullmq-otel` todos opcionais.
- [@nestjs/bullmq no npm](https://www.npmjs.com/package/@nestjs/bullmq): 12.0.0, `"type": "module"`, peers `bullmq` até `^6.0.0` e `@nestjs/core` `^12.0.0`, compatível com o ADR-0003.
