---
status: accepted
date: 2026-10-10
title: "Usar Kafka como plataforma de streaming"
description: "Por que Kafka em vez de fila tradicional, em uma frase: retenção e reprocessamento por partição."
supersedes:
superseded-by:
---

# 0007. Usar Kafka como plataforma de streaming

## Contexto e problema

A telemetria chega em volume alto e contínuo e precisa ser consumida por mais de um processador, com possibilidade de reprocessar.

## Opções consideradas

- **Kafka**: log particionado com retenção configurável
- **RabbitMQ**: fila com roteamento, sem retenção para reprocessar
- **Serviço gerenciado de streaming do provedor**: menos operação, maior acoplamento

## Decisão

Escolhido **Kafka**, porque permite múltiplos consumidores independentes e reprocessamento por offset.

## Consequências

- Bom: reprocessamento e escala por partição
- Ruim: operação do cluster e tuning de partições
