import {
  RATE_LIMIT_KEY_PREFIX,
  type RateLimitRedis,
  ValkeyRateLimitStorage,
} from './valkey-rate-limit.storage.js';

/** Valkey dublê: guarda contagem e expiração em memória, como o script faria. */
function fakeRedis() {
  const counters = new Map<string, number>();
  const calls: unknown[][] = [];
  const redis = {
    status: 'ready',
    eval: (...args: unknown[]) => {
      calls.push(args);
      const key = args[2] as string;
      const window = args[3] as number;
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return Promise.resolve([count, window]);
    },
  } as unknown as RateLimitRedis;
  return { redis, calls };
}

describe('ValkeyRateLimitStorage', () => {
  const rule = { window: 60, max: 5 };

  it('libera até o máximo da regra e recusa o seguinte com retryAfter', async () => {
    const { redis } = fakeRedis();
    const storage = new ValkeyRateLimitStorage(redis, () => {});

    for (let i = 0; i < 5; i++) {
      await expect(
        storage.consume('1.2.3.4|/sign-up/email', rule),
      ).resolves.toEqual({
        allowed: true,
        retryAfter: null,
      });
    }
    await expect(
      storage.consume('1.2.3.4|/sign-up/email', rule),
    ).resolves.toEqual({
      allowed: false,
      retryAfter: 60,
    });
  });

  it('conta cada chave em separado, com o prefixo rate-limit: e a janela da regra', async () => {
    const { redis, calls } = fakeRedis();
    const storage = new ValkeyRateLimitStorage(redis, () => {});

    for (let i = 0; i < 5; i++) await storage.consume('a|/sign-up/email', rule);
    const other = await storage.consume('b|/sign-up/email', rule);

    expect(other.allowed).toBe(true);
    expect(calls.at(-1)?.slice(1)).toEqual([
      1,
      `${RATE_LIMIT_KEY_PREFIX}b|/sign-up/email`,
      60,
    ]);
  });

  it('libera a requisição e registra o erro quando o Valkey falha', async () => {
    const redis = {
      status: 'ready',
      eval: () => Promise.reject(new Error('Connection is closed.')),
    } as unknown as RateLimitRedis;
    const logged: string[] = [];
    const storage = new ValkeyRateLimitStorage(redis, (message) =>
      logged.push(message),
    );

    await expect(storage.consume('a|/sign-up/email', rule)).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain('Connection is closed.');
  });

  it('libera sem esperar quando a conexão não está pronta', async () => {
    const evalSpy = vi.fn();
    const redis = {
      status: 'reconnecting',
      eval: evalSpy,
    } as unknown as RateLimitRedis;
    const logged: string[] = [];
    const storage = new ValkeyRateLimitStorage(redis, (message) =>
      logged.push(message),
    );

    await expect(storage.consume('a|/sign-up/email', rule)).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(evalSpy).not.toHaveBeenCalled();
    expect(logged[0]).toContain('reconnecting');
  });

  it('libera quando o Valkey não responde dentro do tempo', async () => {
    const redis = {
      status: 'ready',
      eval: () => new Promise(() => {}),
    } as unknown as RateLimitRedis;
    const logged: string[] = [];
    const storage = new ValkeyRateLimitStorage(
      redis,
      (message) => logged.push(message),
      20,
    );

    await expect(storage.consume('a|/sign-up/email', rule)).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(logged[0]).toContain('20 ms');
  });
});
