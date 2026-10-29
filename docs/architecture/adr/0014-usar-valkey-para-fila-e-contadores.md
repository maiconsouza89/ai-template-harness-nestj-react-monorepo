---
status: accepted
date: 2026-10-29
title: "Usar Valkey para fila e contadores"
description: "Por que Valkey em vez de Redis ou de uma tabela no PostgreSQL: mesmo protocolo que o BullMQ e o Better Auth falam, sob licença BSD-3 sem cláusula AGPL para o projeto gerado."
supersedes:
superseded-by:
---

# 0014. Usar Valkey para fila e contadores

## Contexto e problema

O HLD guarda fora do PostgreSQL três dados de curta duração que todas as réplicas da API
compartilham: a fila de e-mail, o contador de 5 falhas de login por e-mail e as janelas do rate
limit do Better Auth. Isso pede um serviço de chave e valor com TTL e operação atômica, que sobe no
Compose e que o destino do projeto gerado consegue hospedar. O HLD propôs o Redis, que a partir
da versão 8 sai sob as licenças RSALv2, SSPLv1 ou AGPLv3, à escolha de quem usa.

## Opções consideradas

- **Valkey 9**: fork do Redis mantido no Linux Foundation, licença BSD-3, protocolo e comandos do Redis.
- **Redis 8**: implementação de referência; perdeu porque a única opção aberta da licença tripla é a AGPLv3, e o template não deve impor essa análise a cada projeto gerado.
- **Tabela no PostgreSQL**: fila e contadores no banco que já existe; perdeu porque a fila escolhida (ADR-0015) exige um servidor compatível com Redis, e contador com TTL vira limpeza periódica que o template teria de escrever.

## Decisão

Escolhido o **Valkey 9**, como serviço do Compose com `appendonly yes`, `appendfsync everysec` e
`maxmemory-policy noeviction`, acessado pelo `ioredis` 5, porque BullMQ e Better Auth o usam sem
código a mais e a licença não cria obrigação para quem gera um projeto a partir do template.

## Consequências

- Bom: um único cliente, o `ioredis`, serve o BullMQ e o `@better-auth/redis-storage`, e qualquer Redis gerenciado do destino aceita a mesma URL.
- Bom: com AOF a cada segundo, a queda do Valkey perde no máximo cerca de 1 segundo de jobs, e bloqueios e janelas de rate limit sobrevivem ao reinício.
- Ruim: o `@better-auth/redis-storage` declara peer `ioredis ^5`, enquanto o `latest` é o 6.0.0; o `ioredis` fica na major 5 até o pacote do Better Auth aceitar a 6.
- Ruim: destino que só oferece Redis gerenciado continua funcionando, mas a licença dele passa a ser decisão do projeto gerado, não deste ADR.
- Ruim: é mais um serviço a operar e um ponto único de falha do e-mail e do bloqueio de login, com o fail-open e os alertas descritos no HLD.

## Referências

Consultado em 2026-10-29.

- [Redis: Licenses](https://redis.io/legal/licenses/): Redis Open Source 8 ou superior sob RSALv2, SSPLv1 ou AGPLv3; só a AGPLv3 é aprovada pela OSI.
- [valkey-io/valkey](https://github.com/valkey-io/valkey): licença BSD-3-Clause, projeto do LF Projects, fork do Redis feito antes da troca de licença; release 9.1.3 em 2026-10-26.
- [BullMQ: Going to production](https://docs.bullmq.io/guide/going-to-production): AOF recomendado, `maxmemory-policy noeviction` obrigatório, e as mesmas regras valem para servidores compatíveis como o Valkey.
- [Better Auth: Database, Secondary Storage](https://www.better-auth.com/docs/concepts/database): armazenamento secundário para contadores de rate limit e dados curtos, com o pacote oficial `@better-auth/redis-storage` sobre `ioredis`.
- [Better Auth: Rate Limit](https://www.better-auth.com/docs/concepts/rate-limit): `storage: "secondary-storage"` grava as janelas no armazenamento secundário em vez de na memória do processo.
- [@better-auth/redis-storage no npm](https://www.npmjs.com/package/@better-auth/redis-storage): 1.7.14 com peer `ioredis ^5.0.0`; `ioredis` `latest` em 6.0.0.
