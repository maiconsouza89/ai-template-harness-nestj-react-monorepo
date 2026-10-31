import type { BetterAuthRateLimitStorage } from 'better-auth';
import type { Redis } from 'ioredis';
import { withTimeout } from '../../../../platform/async/with-timeout.js';
import { describeError } from '../../../../platform/logging/describe-error.js';

/** Prefixo das chaves do rate limit no Valkey (spec, Modelo de dados). */
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:';

/**
 * Incrementa o contador da janela e devolve `[contagem, segundos até a janela acabar]` numa só
 * operação no Valkey: a expiração nasce com o primeiro pedido da janela e não se renova, então a
 * janela é fixa. A chave recém-criada, ou uma sem expiração por qualquer motivo, ganha a da regra,
 * para o contador nunca ficar preso.
 */
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
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
 * Estados do ioredis em que a conexão caiu: o comando ficaria preso na fila offline até a volta
 * do Valkey, então a requisição é liberada sem esperar. Nos demais (`wait`, `connecting`,
 * `connect`, `ready`) o comando segue, e a fila offline e `RATE_LIMIT_TIMEOUT_MS` cuidam da espera.
 */
const DOWN_STATUSES: ReadonlySet<string> = new Set([
  'reconnecting',
  'close',
  'end',
]);

/**
 * Tempo máximo de espera pelo Valkey antes de liberar a requisição: o rate limit não pode segurar
 * o cadastro quando o Valkey está lento ou reconectando.
 */
export const RATE_LIMIT_TIMEOUT_MS = 500;

/**
 * Onde o armazenamento registra a falha do Valkey; recebe só a linha montada, com o erro do driver
 * reduzido a nome e código por `describeError` (ADR-0018).
 */
export type RateLimitErrorLogger = (message: string) => void;

/**
 * `rateLimit.customStorage` do Better Auth (ADR-0010) com os contadores no Valkey (ADR-0014):
 * `consume(key, rule)` atômico, por um script Lua com INCR e a expiração da janela da regra, na
 * chave `rate-limit:<ip>|<caminho>`. Com o Valkey fora do ar (conexão caída, erro ou sem
 * resposta em `RATE_LIMIT_TIMEOUT_MS`), libera a requisição (fail-open) e registra o erro,
 * para o cadastro seguir (spec, Tratamento de erros).
 */
export class ValkeyRateLimitStorage implements BetterAuthRateLimitStorage {
  constructor(
    private readonly redis: RateLimitRedis,
    private readonly logError: RateLimitErrorLogger,
    private readonly timeoutMs = RATE_LIMIT_TIMEOUT_MS,
  ) {}

  async consume(
    key: string,
    rule: { window: number; max: number },
  ): Promise<{ allowed: boolean; retryAfter: number | null }> {
    if (DOWN_STATUSES.has(this.redis.status)) {
      return this.release(`conexão em ${this.redis.status}`);
    }
    const timeoutMessage = `sem resposta em ${this.timeoutMs} ms`;
    try {
      const [count, ttl] = (await withTimeout(
        this.redis.eval(
          CONSUME_SCRIPT,
          1,
          `${RATE_LIMIT_KEY_PREFIX}${key}`,
          rule.window,
        ),
        this.timeoutMs,
        timeoutMessage,
      )) as [number, number];
      if (count <= rule.max) return { allowed: true, retryAfter: null };
      return { allowed: false, retryAfter: Math.max(ttl, 1) };
    } catch (error) {
      // A mensagem do limite de tempo é desta classe; a do driver pode citar argumento de comando.
      return this.release(
        error instanceof Error && error.message === timeoutMessage
          ? timeoutMessage
          : describeError(error),
      );
    }
  }

  private release(reason: string): { allowed: true; retryAfter: null } {
    this.logError(`Rate limit liberado com o Valkey indisponível: ${reason}`);
    return { allowed: true, retryAfter: null };
  }
}
