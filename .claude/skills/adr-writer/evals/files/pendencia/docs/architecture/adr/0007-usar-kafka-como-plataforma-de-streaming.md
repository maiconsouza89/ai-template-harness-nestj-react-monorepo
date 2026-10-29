---
status: accepted
date: 2026-10-01
title: "Usar Kafka como plataforma de streaming"
description: "Por que Kafka em vez de RabbitMQ para a fila de lembretes e eventos."
supersedes: "0003"
superseded-by: 
---

# 0007. Usar Kafka como plataforma de streaming

## Contexto e problema

Desde o 0003, surgiu a necessidade de reprocessar lembretes e eventos de marcação para relatórios. O RabbitMQ descarta a mensagem consumida; sem retenção não há replay.

## Opções consideradas

- **Kafka**: log particionado com retenção configurável e replay
- **RabbitMQ**: fila com roteamento, sem retenção para reprocessar
- **Serviço gerenciado de streaming do provedor**: menos operação, maior acoplamento

## Decisão

Escolhido o Kafka, porque retenção e replay cobrem lembretes e relatórios com um componente só.

## Consequências

- Bom: reprocessar um dia de eventos é reler o tópico.
- Ruim: operar Kafka exige mais do time do que RabbitMQ.
