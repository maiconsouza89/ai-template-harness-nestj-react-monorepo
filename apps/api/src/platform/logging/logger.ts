import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options as PinoHttpOptions } from 'pino-http';
import type { Env } from '../config/env.js';

/** Cabeçalho de resposta com o id da requisição, para quem chama correlacionar com o log. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Caminhos redigidos antes da escrita (ADR-0018; PRD, Compliance): dados pessoais e credenciais
 * no topo do objeto e um nível abaixo (`logger.info({ user })`), os cabeçalhos de cookie e de
 * autorização da requisição e o cookie de sessão que a resposta define. A redação é por caminho
 * explícito: um campo pessoal com outro nome ou mais fundo passa, então quem loga um objeto de
 * domínio novo confere estes caminhos.
 */
export const REDACT_PATHS: readonly string[] = [
  'email',
  'name',
  'password',
  '*.email',
  '*.name',
  '*.password',
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
];

/** Valor que substitui o campo redigido, para a linha mostrar que ele existia. */
export const REDACT_CENSOR = '[redigido]';

/**
 * Gera o `req.id` de cada requisição (ADR-0018): um UUID v4, único entre réplicas e processos,
 * no lugar do contador por processo do pino-http. O mesmo id vai no cabeçalho `x-request-id`
 * da resposta.
 */
export function genReqId(_req: IncomingMessage, res: ServerResponse): string {
  const id = randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/**
 * Opções do pino-http para o `LoggerModule` do nestjs-pino: JSON por linha no nível de
 * `LOG_LEVEL`, um id único por requisição e a redação acima. Uma linha por requisição sai com
 * `req.id`, `res.statusCode` e `responseTime` (padrão do pino-http); os logs dos serviços
 * escritos durante a requisição herdam o `req.id` pelo AsyncLocalStorage.
 */
export function createPinoHttpOptions(
  env: Pick<Env, 'LOG_LEVEL'>,
): PinoHttpOptions {
  return {
    level: env.LOG_LEVEL,
    genReqId,
    redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },
  };
}
