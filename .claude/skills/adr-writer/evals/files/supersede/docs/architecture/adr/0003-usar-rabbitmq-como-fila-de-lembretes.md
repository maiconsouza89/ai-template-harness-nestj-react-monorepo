---
status: accepted
date: 2026-09-10
title: "Usar RabbitMQ como fila de lembretes"
description: "Por que RabbitMQ em vez de fila gerenciada do provedor para desacoplar o envio de lembretes."
supersedes: 
superseded-by: 
---

# 0003. Usar RabbitMQ como fila de lembretes

## Contexto e problema

O envio de lembretes não pode travar a marcação; precisa de fila com retentativa. O time quer rodar em contêiner sem depender de serviço de um provedor específico.

## Opções consideradas

- **RabbitMQ**: fila com roteamento e retentativa, roda em contêiner
- **Fila gerenciada do provedor**: menos operação, acoplamento ao provedor
- **Tabela no banco como fila**: sem componente novo; polling e lock na aplicação

## Decisão

Escolhido o RabbitMQ, porque roda em contêiner junto do resto e tem retentativa pronta.

## Consequências

- Bom: marcação responde sem esperar o canal de mensagens.
- Ruim: mais um processo para operar e monitorar.
