---
status: accepted
date: 2026-10-28
title: "Usar PostgreSQL como banco de dados"
description: "Por que PostgreSQL 18 em vez de SQLite ou MongoDB: integridade relacional garantida pelo banco e escrita concorrente num servidor que sobe como serviço do Compose."
supersedes:
superseded-by:
---

# 0007. Usar PostgreSQL como banco de dados

## Contexto e problema

A API NestJS (ADR-0003) guarda contas, papéis, tokens de confirmação e recuperação, trilha de
auditoria e tarefas, e o PRD exige que uma tarefa pertença sempre a exatamente uma conta, que
exista sempre um admin ativo e que toda mudança de papel seja rastreável. O ADR-0006 sobe o banco
como serviço do Compose, mas deixou a tecnologia para um registro próprio. A escolha define o
modelo de dados que o dev copia para cada entidade nova e é cara de trocar depois que existem
migrações e dados.

## Opções consideradas

- **PostgreSQL 18**: banco relacional cliente/servidor com chave estrangeira, transação e imagem oficial no Docker Hub.
- **SQLite**: banco em arquivo, sem servidor; perdeu porque só aceita um escritor por vez e a própria documentação manda usar cliente/servidor quando a API rodar em mais de uma instância.
- **MongoDB**: banco de documentos; perdeu porque não impõe referência entre coleções e transação entre documentos exige replica set, o que complica o serviço do Compose.

## Decisão

Escolhido o **PostgreSQL na versão major 18**, porque chave estrangeira e transação deixam no banco
as regras de integridade do PRD, e a imagem oficial entra no `compose.yaml` com uma única variável
obrigatória.

## Consequências

- Bom: tarefa com conta inexistente é recusada pelo banco (`REFERENCES` com `ON DELETE CASCADE` ou `RESTRICT`), mesmo que o código da API esqueça de checar.
- Bom: a versão 18 tem suporte da comunidade até novembro de 2030; o projeto gerado não precisa trocar de major antes disso.
- Ruim: o volume do Compose tem de montar em `/var/lib/postgresql`, não em `/var/lib/postgresql/data` como nas versões até a 17; exemplo antigo copiado da internet perde os dados ao recriar o container.
- Ruim: testes de integração precisam de um PostgreSQL de pé (o do Compose ou um container efêmero); não há banco em memória equivalente para trocar.
- Ruim: ORM ou query builder, ferramenta de migração e onde o banco roda em produção ficam fora deste ADR, cada um por registro próprio.

## Referências

Consultado em 2026-10-28.

- [PostgreSQL: Versioning Policy](https://www.postgresql.org/support/versioning/): 18.6 como minor mais recente da 18, lançada em 2025-09-25, com fim de suporte em 2030-11-14; suporte de 5 anos por major.
- [PostgreSQL 18: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): chave estrangeira impede linha que referencia registro inexistente; ações `CASCADE`, `RESTRICT` e `NO ACTION` na exclusão.
- [SQLite: Appropriate Uses](https://www.sqlite.org/whentouse.html): um escritor por vez por arquivo; para muita escrita concorrente ou mais de um servidor, recomenda banco cliente/servidor.
- [MongoDB: Transactions](https://www.mongodb.com/docs/manual/core/transactions/): transação entre documentos suportada em replica sets e clusters fragmentados, não listada para instância standalone.
- [postgres no Docker Hub](https://hub.docker.com/_/postgres): `latest` aponta para 18.6, 19 ainda em release candidate, `POSTGRES_PASSWORD` como única variável obrigatória e volume em `/var/lib/postgresql` a partir da 18.
