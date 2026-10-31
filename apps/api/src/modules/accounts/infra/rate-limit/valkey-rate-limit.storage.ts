import type { BetterAuthRateLimitStorage } from 'better-auth';
import type { Redis } from 'ioredis';

/** Prefixo das chaves do rate limit no Valkey (spec, Modelo de dados). */
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:';

/**
 * Incrementa o contador da janela e devolve `[contagem, segundos até a janela acabar]` numa só
 * operação no Valkey: a expiração nasce com o primeiro pedido da janela e não se renova, então a
 * janela é fixa. Uma chave sem expiração (resto de uma falha entre os dois comandos) ganha a da
 * regra, para o contador nunca ficar preso.
 */
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

/** O que o armazenamento usa da conexão: o estado dela e o `eval` do script. */
export type RateLimitRedis = Pick<Redis, 'eval' | 'status'>;

/**
 * Tempo máximo de espera pelo Valkey antes de liberar a requisição: o rate limit não pode segurar
 * o cadastro quando o Valkey está lento ou reconectando.
 */
export const RATE_LIMIT_TIMEOUT_MS = 500;

class RateLimitUnavailableError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new RateLimitUnavailableError(`sem resposta em ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Onde o armazenamento registra a falha do Valkey; recebe só a mensagem, sem dado pessoal. */
export type RateLimitErrorLogger = (message: string) => void;

/**
 * `rateLimit.customStorage` do Better Auth (ADR-0010) com os contadores no Valkey (ADR-0014):
 * `consume(key, rule)` atômico, por um script Lua com INCR e a expiração da janela da regra, na
 * chave `rate-limit:<ip>|<caminho>`. Com o Valkey fora do ar (conexão que não está pronta, erro
 * ou sem resposta em `RATE_LIMIT_TIMEOUT_MS`), libera a requisição (fail-open) e registra o erro,
 * para o cadastro seguir (spec, Tratamento de erros).
 */
export class ValkeyRateLimitStorage implements BetterAuthRateLimitStorage {
  private readonly redis: RateLimitRedis;
  private readonly logError: RateLimitErrorLogger;
  private readonly timeoutMs: number;

  constructor(
    redis: RateLimitRedis,
    logError: RateLimitErrorLogger,
    timeoutMs = RATE_LIMIT_TIMEOUT_MS,
  ) {
    this.redis = redis;
    this.logError = logError;
    this.timeoutMs = timeoutMs;
  }

  async consume(
    key: string,
    rule: { window: number; max: number },
  ): Promise<{ allowed: boolean; retryAfter: number | null }> {
    try {
      // `lazyConnect`: a conexão abre no primeiro comando; depois disso, fora de `ready` é queda.
      if (this.redis.status !== 'ready' && this.redis.status !== 'wait') {
        throw new RateLimitUnavailableError(`conexão em ${this.redis.status}`);
      }
      const [count, ttl] = (await withTimeout(
        this.redis.eval(
          CONSUME_SCRIPT,
          1,
          `${RATE_LIMIT_KEY_PREFIX}${key}`,
          rule.window,
        ),
        this.timeoutMs,
      )) as [number, number];
      if (count <= rule.max) return { allowed: true, retryAfter: null };
      return { allowed: false, retryAfter: Math.max(ttl, 1) };
    } catch (error) {
      this.logError(
        `Rate limit liberado com o Valkey indisponível: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { allowed: true, retryAfter: null };
    }
  }
}
