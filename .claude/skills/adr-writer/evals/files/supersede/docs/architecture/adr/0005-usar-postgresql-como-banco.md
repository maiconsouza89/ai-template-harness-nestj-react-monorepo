---
status: accepted
date: 2026-09-10
title: "Usar PostgreSQL como banco relacional"
description: "Por que PostgreSQL em vez de MySQL para o banco do agendamento."
supersedes: 
superseded-by: 
---

# 0005. Usar PostgreSQL como banco relacional

## Contexto e problema

O agendamento precisa de transações para impedir duas marcações no mesmo horário e de consultas por intervalo de tempo. O time já opera PostgreSQL em outro produto.

## Opções consideradas

- **PostgreSQL**: relacional, com exclusão de intervalo nativa e operação conhecida pelo time
- **MySQL**: relacional, sem constraint de intervalo; a regra ficaria na aplicação
- **Banco gerenciado NoSQL**: sem transação entre documentos; regra de conflito de horário fica frágil

## Decisão

Escolhido o PostgreSQL, porque a exclusão de intervalo resolve o conflito de horário no banco e o time já o opera.

## Consequências

- Bom: duas marcações no mesmo horário falham no banco, não dependem da aplicação.
- Ruim: migração de esquema precisa de ferramenta e disciplina de versionamento.
