import type { Logger } from '@nestjs/common';
import type { BetterAuthRateLimitStorage } from '@better-auth/core';
import type { Redis } from 'ioredis';

/** Prefixo das chaves de contador no Valkey: `rate-limit:<ip>|<caminho>` (spec, Modelo de dados). */
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:';

/** Só o necessário do `Logger` do Nest, para o teste passar um dublê. */
export type RateLimitLogger = Pick<Logger, 'warn'>;

/**
 * Estados do ioredis em que um comando sai para o Valkey ou dispara a conexão (`wait`, com o
 * `lazyConnect` da conexão compartilhada). Fora deles (`connecting`, `reconnecting`, `close`,
 * `end`), o comando ficaria na fila offline até a próxima reconexão, segurando o cadastro por
 * segundos: o armazenamento libera na hora.
 */
const USABLE_STATUSES = new Set(['ready', 'wait']);

const ALLOWED = { allowed: true, retryAfter: null } as const;

/**
 * `customStorage` do rate limit do Better Auth sobre a conexão `ioredis` compartilhada (spec,
 * Componentes; ADR-0014). Janela fixa por chave: `INCR` e `EXPIRE ... NX` na mesma transação,
 * para a contagem valer entre réplicas e a janela começar no primeiro pedido; acima de
 * `rule.max`, recusa com `retryAfter` igual ao tempo que falta para a chave expirar.
 *
 * Fail-open (HLD, Escalabilidade e disponibilidade): com o Valkey fora do ar, a requisição passa
 * e fica um aviso no log, sem a chave, que leva o IP do cliente.
 */
export function createValkeyRateLimitStorage(
  redis: Redis,
  logger: RateLimitLogger,
): BetterAuthRateLimitStorage {
  return {
    async consume(key, rule) {
      if (!USABLE_STATUSES.has(redis.status)) {
        logger.warn(
          `Rate limit liberado: Valkey indisponível (conexão ${redis.status})`,
        );
        return ALLOWED;
      }
      const redisKey = `${RATE_LIMIT_KEY_PREFIX}${key}`;
      try {
        const results = await redis
          .multi()
          .incr(redisKey)
          .expire(redisKey, rule.window, 'NX')
          .pttl(redisKey)
          .exec();
        const failed = results?.find(([error]) => error);
        if (!results || failed) {
          throw failed?.[0] ?? new Error('transação descartada');
        }
        const count = Number(results[0]?.[1]);
        if (count <= rule.max) {
          return ALLOWED;
        }
        const ttlMs = Number(results[2]?.[1]);
        const retryAfter =
          ttlMs > 0 ? Math.max(1, Math.ceil(ttlMs / 1000)) : rule.window;
        return { allowed: false, retryAfter };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.warn(`Rate limit liberado: Valkey indisponível (${reason})`);
        return ALLOWED;
      }
    },
  };
}
