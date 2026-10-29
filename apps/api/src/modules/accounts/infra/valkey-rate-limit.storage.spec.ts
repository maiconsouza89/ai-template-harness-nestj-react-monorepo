import type { Redis } from 'ioredis';
import {
  createValkeyRateLimitStorage,
  RATE_LIMIT_KEY_PREFIX,
} from './valkey-rate-limit.storage.js';

type ExecResult = [Error | null, unknown][] | null;

/**
 * Dublê do `ioredis` com o que o armazenamento usa: `status` e a transação
 * `multi().incr().expire(NX).pttl().exec()`, sobre um mapa em memória com relógio controlado.
 */
function fakeRedis() {
  let now = 0;
  const store = new Map<string, { count: number; expiresAt?: number }>();
  const live = (key: string) => {
    const entry = store.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= now) {
      store.delete(key);
      return undefined;
    }
    return entry;
  };
  const redis = {
    status: 'ready',
    keys: () => [...store.keys()],
    advance: (ms: number) => {
      now += ms;
    },
    multi() {
      const ops: (() => unknown)[] = [];
      const chain = {
        incr(key: string) {
          ops.push(() => {
            const entry = live(key) ?? { count: 0 };
            entry.count += 1;
            store.set(key, entry);
            return entry.count;
          });
          return chain;
        },
        expire(key: string, seconds: number, mode: 'NX') {
          ops.push(() => {
            const entry = live(key);
            if (!entry || (mode === 'NX' && entry.expiresAt !== undefined)) {
              return 0;
            }
            entry.expiresAt = now + seconds * 1000;
            return 1;
          });
          return chain;
        },
        pttl(key: string) {
          ops.push(() => {
            const entry = live(key);
            if (!entry) return -2;
            return entry.expiresAt === undefined ? -1 : entry.expiresAt - now;
          });
          return chain;
        },
        async exec(): Promise<ExecResult> {
          return ops.map((op) => [null, op()]);
        },
      };
      return chain;
    },
  };
  return redis;
}

/** Dublê que falha como o `ioredis` com o Valkey fora do ar (`maxRetriesPerRequest` estourado). */
function failingRedis(status = 'ready') {
  return {
    status,
    multi: vi.fn(() => {
      const chain = {
        incr: () => chain,
        expire: () => chain,
        pttl: () => chain,
        exec: () =>
          Promise.reject(
            new Error('Reached the max retries per request limit (which is 1)'),
          ),
      };
      return chain;
    }),
  };
}

const asRedis = (double: object) => double as unknown as Redis;
const rule = { window: 60, max: 5 };
const key = '198.18.0.1|/sign-up/email';

describe('createValkeyRateLimitStorage', () => {
  it('conta até o limite da regra e recusa acima com retryAfter em segundos', async () => {
    const redis = fakeRedis();
    const logger = { warn: vi.fn() };
    const storage = createValkeyRateLimitStorage(asRedis(redis), logger);

    for (let i = 0; i < rule.max; i++) {
      expect(await storage.consume(key, rule)).toEqual({
        allowed: true,
        retryAfter: null,
      });
    }
    redis.advance(15_500);
    expect(await storage.consume(key, rule)).toEqual({
      allowed: false,
      retryAfter: 45,
    });
    expect(redis.keys()).toEqual([`${RATE_LIMIT_KEY_PREFIX}${key}`]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('a recusa não estica a janela: ela reabre quando a chave expira', async () => {
    const redis = fakeRedis();
    const storage = createValkeyRateLimitStorage(asRedis(redis), {
      warn: vi.fn(),
    });

    for (let i = 0; i <= rule.max; i++) await storage.consume(key, rule);
    redis.advance(59_000);
    expect((await storage.consume(key, rule)).allowed).toBe(false);
    redis.advance(1_000);
    expect(await storage.consume(key, rule)).toEqual({
      allowed: true,
      retryAfter: null,
    });
  });

  it('conta cada chave (IP e caminho) à parte', async () => {
    const redis = fakeRedis();
    const storage = createValkeyRateLimitStorage(asRedis(redis), {
      warn: vi.fn(),
    });

    for (let i = 0; i <= rule.max; i++) await storage.consume(key, rule);
    expect(
      (await storage.consume('198.18.0.2|/sign-up/email', rule)).allowed,
    ).toBe(true);
  });

  it('libera e registra aviso, sem a chave, quando o comando ao Valkey falha (fail-open)', async () => {
    const logger = { warn: vi.fn() };
    const storage = createValkeyRateLimitStorage(
      asRedis(failingRedis()),
      logger,
    );

    expect(await storage.consume(key, rule)).toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(String(logger.warn.mock.calls[0]?.[0])).not.toContain('198.18');
  });

  it('libera na hora, sem mandar comando, com a conexão em reconexão', async () => {
    const redis = failingRedis('reconnecting');
    const logger = { warn: vi.fn() };
    const storage = createValkeyRateLimitStorage(asRedis(redis), logger);

    expect((await storage.consume(key, rule)).allowed).toBe(true);
    expect(redis.multi).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});
