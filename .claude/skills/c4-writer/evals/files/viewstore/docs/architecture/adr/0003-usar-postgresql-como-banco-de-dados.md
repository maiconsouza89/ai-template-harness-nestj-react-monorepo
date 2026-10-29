---
status: accepted
date: 2026-10-23
title: "Usar PostgreSQL como banco de dados"
description: "Por que PostgreSQL em vez de MySQL ou MongoDB: transações e constraints garantem as regras de dinheiro no banco, e o PostGIS resolve a busca do mapa."
supersedes:
superseded-by:
---

# 0003. Usar PostgreSQL como banco de dados

## Contexto e problema

O PRD exige que o saldo do exibidor e o crédito do anunciante nunca fiquem negativos, que a venda de espaço e a cobrança aconteçam juntas ou não aconteçam, e que toda movimentação de dinheiro seja rastreável até a campanha, a tela e a conta. O ADR-0002 deixou a consistência financeira para as transações do banco. O mapa aberto precisa encontrar telas públicas por localização, e as TVs enviam registros de exibição que alimentam a comprovação e o repasse. A escala inicial é de 100 telas em 6 meses.

## Opções consideradas

- **PostgreSQL**: relacional com transações ACID, `CHECK` e chaves estrangeiras, e busca geográfica por raio com índice pelo PostGIS.
- **MySQL**: também é relacional e transacional e aplica `CHECK` desde a 8.0.16, mas a busca geográfica é mais limitada que o PostGIS (`ST_Distance_Sphere` só aceita pontos).
- **MongoDB**: banco de documentos. A própria documentação trata a transação entre documentos como mais cara e indica a modelagem embutida no lugar dela, o que não serve para um razão financeiro entre contas.

## Decisão

Escolhido o **PostgreSQL**, porque as regras de dinheiro do PRD viram transação, `CHECK` e chave estrangeira no próprio banco, e não código que cada serviço precisa lembrar de aplicar. O PostGIS cobre a busca do mapa no mesmo banco, sem um serviço de busca à parte.

## Consequências

- Bom: um saque acima do saldo é barrado pelo `CHECK (saldo >= 0)` mesmo que uma rota esqueça a validação, então o erro aparece como falha da transação e não como saldo negativo no extrato.
- Bom: venda de espaço e cobrança ficam na mesma transação, então uma queda no meio do fluxo não deixa espaço vendido sem cobrança.
- Ruim: `CHECK` aceita `NULL`, então toda coluna de valor monetário precisa também de `NOT NULL`; esquecer isso passa na migração.
- Ruim: o PostGIS é uma extensão, então o banco gerenciado escolhido precisa oferecê-la, o que restringe a hospedagem.
- Ruim: os registros de exibição crescem com o número de telas e o tamanho do ciclo, então a tabela de exibições vai precisar de particionamento ou retenção antes das outras.

## Referências

Consultado em 2026-10-23.

- [PostgreSQL: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): `CHECK` rejeita a linha que viola a condição e é satisfeito por `NULL`, o que sustenta o saldo nunca negativo e a ressalva do `NOT NULL`.
- [PostGIS: ST_DWithin](https://postgis.net/docs/ST_DWithin.html): busca por distância em metros no tipo `geography`, usando índice, o que cobre o mapa de telas públicas.
- [MySQL 8.0: CHECK Constraints](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html): `CHECK` só é aplicado a partir da 8.0.16, então o MySQL também atenderia as regras de saldo.
- [MySQL 8.0: Spatial Convenience Functions](https://dev.mysql.com/doc/refman/8.0/en/spatial-convenience-functions.html): `ST_Distance_Sphere` aceita só ponto com ponto ou multiponto, o recurso geográfico mais limitado que pesou contra o MySQL.
- [MongoDB: Transactions](https://www.mongodb.com/docs/manual/core/transactions/): diz que a transação distribuída custa mais que a escrita em um único documento e recomenda modelar com documentos embutidos, o que pesou contra o MongoDB.
- [NestJS: Database](https://docs.nestjs.com/techniques/database): TypeORM, Prisma, Sequelize e MikroORM integram com o Nest do ADR-0002, então a escolha do banco não trava a do ORM.
