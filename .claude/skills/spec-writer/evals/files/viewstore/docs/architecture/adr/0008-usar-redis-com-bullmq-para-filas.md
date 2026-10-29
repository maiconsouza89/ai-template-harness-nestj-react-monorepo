---
status: accepted
date: 2026-10-24
title: "Usar Redis com BullMQ para filas e agendamentos"
description: "Por que Redis com BullMQ em vez de fila no PostgreSQL ou Amazon SQS: integração oficial com o NestJS, agendamento por cron e retentativa prontos, e o mesmo Redis serve o cache do manifesto, tirando o polling do banco único."
supersedes:
superseded-by:
---

# 0008. Usar Redis com BullMQ para filas e agendamentos

## Contexto e problema

O Worker consome a outbox e executa trabalho fora da requisição: gerar manifesto, transcodificar vídeo, expirar reserva em 15 minutos, renovar assinatura e pacote, rodar o fechamento mensal e enviar e-mail. Precisa de retentativa com backoff, agendamento por cron e atraso de minutos a dias. O HLD também guarda a versão do manifesto por tela fora do banco, para que o polling de 1.000 TVs a cada minuto não toque o PostgreSQL de instância única (ADR-0003). A outbox já é a fonte de verdade dos eventos, então a fila pode perder estado desde que seja regerável a partir dela.

## Opções consideradas

- **Redis (ElastiCache) com BullMQ**: módulo oficial `@nestjs/bullmq`, agendador por cron com fuso, retentativa com backoff, e o mesmo Redis guarda a versão do manifesto e os contadores de rate limit.
- **Fila no PostgreSQL (pg-boss)**: cron, retentativa e fila de mortos sem serviço novo, mas põe o giro da fila e o polling no mesmo banco único que guarda o dinheiro.
- **Amazon SQS**: gerenciado e sem servidor, mas o atraso máximo é de 15 minutos, então agendamento longo e cron exigem o EventBridge Scheduler, e o cache do manifesto ainda pediria outro serviço.

## Decisão

Escolhido **Redis com BullMQ**, porque o NestJS (ADR-0002) o integra oficialmente, cobre cron, atraso e retentativa num só lugar, e o mesmo Redis resolve o cache do polling, que sairia do banco de qualquer jeito. Perder o Redis custa reprocessar a outbox, não perder evento.

## Consequências

- Bom: um job que falha 5 vezes vai para o conjunto de falhos com o erro registrado, então o operador vê o que parou em vez de o evento sumir.
- Ruim: o ElastiCache precisa ser por nó, não Serverless, com `maxmemory-policy noeviction` num parameter group próprio; com o padrão, o Redis descarta job sob pressão de memória sem erro.
- Ruim: o agendador só cria o próximo job quando o anterior começa a ser processado, então fila congestionada atrasa expiração de reserva e fechamento mensal.
- Ruim: o conjunto de falhos não é uma fila de mortos de verdade; sem configurar a retenção, job falho é removido e o rastro some.
- Ruim: Redis em instância única é ponto de falha do polling; se cair, a API do player consulta o banco, que precisa aguentar cerca de 17 consultas por segundo nesse intervalo.

## Referências

Consultado em 2026-10-24.

- [NestJS: Queues](https://docs.nestjs.com/techniques/queues): `@nestjs/bullmq` é a integração oficial e exige Redis.
- [BullMQ: Job Schedulers](https://docs.bullmq.io/guide/job-schedulers): agendamento por intervalo ou cron com fuso; o próximo job só é criado quando o anterior começa.
- [BullMQ: Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs): `attempts` com backoff fixo ou exponencial; esgotadas as tentativas, o job vai para o conjunto de falhos.
- [BullMQ: Going to production](https://docs.bullmq.io/guide/going-to-production): `noeviction` é a única política de memória que garante o comportamento correto.
- [BullMQ: AWS ElastiCache](https://docs.bullmq.io/guide/redis-tm-hosting/aws-elasticache): usar ElastiCache por nó, não Serverless, com parameter group próprio.
- [pg-boss](https://github.com/timgit/pg-boss): fila sobre PostgreSQL com cron, retentativa e fila de mortos.
- [Amazon SQS: Delay queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html): atraso máximo de 15 minutos, com o EventBridge Scheduler indicado para agendamento maior.
