---
status: proposed
date: 2026-10-05
title: "Usar Redis para cache da agenda do dia"
description: "Por que Redis em vez de cache em memória do processo para a agenda do dia."
supersedes: 
superseded-by: 
---

# 0004. Usar Redis para cache da agenda do dia

## Contexto e problema

A agenda do dia é lida muitas vezes por minuto pelo dono e pelos barbeiros. Com mais de uma réplica da API, cache em memória diverge entre réplicas.

## Opções consideradas

- **Redis**: cache compartilhado entre réplicas, invalidação por evento
- **Cache em memória do processo**: simples; diverge entre réplicas

## Decisão

Proposto o Redis, porque o cache precisa ser compartilhado entre réplicas.

## Consequências

- Bom: todas as réplicas veem a mesma agenda.
- Ruim: mais um serviço e um ponto de falha.
