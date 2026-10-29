import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options as PinoHttpOptions, stdSerializers } from 'pino-http';
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

/** Requisição como o serializador padrão do pino-http a entrega (`pino-std-serializers`). */
type SerializedRequest = ReturnType<typeof stdSerializers.req>;

/**
 * Serializa a requisição para o log com a URL reduzida ao caminho e sem `query`: a query string
 * carrega segredo (token de verificação de e-mail e de redefinição de senha do Better Auth em
 * `/api/auth/verify-email?token=...`, `code` e `state` de callbacks OAuth, e qualquer rota futura
 * com token na URL), que o serializador padrão do pino-http gravaria em texto puro em `req.url`
 * e em `req.query`. Os demais campos (`id`, `method`, `headers`, endereço remoto) ficam como no
 * padrão; `req.headers.cookie` e `req.headers.authorization` seguem redigidos por `REDACT_PATHS`.
 * O pino-http chama esta função já com a requisição serializada pelo padrão.
 */
export function serializeRequest(
  req: SerializedRequest,
): Omit<SerializedRequest, 'query' | 'params' | 'raw'> {
  const { id, method, url, headers, remoteAddress, remotePort } = req;
  const queryStart = typeof url === 'string' ? url.indexOf('?') : -1;
  return {
    id,
    method,
    url: queryStart === -1 ? url : url.slice(0, queryStart),
    headers,
    remoteAddress,
    remotePort,
  };
}

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
 * `LOG_LEVEL`, um id único por requisição, a redação acima e a requisição sem a query string.
 * Uma linha por requisição sai com `req.id`, `req.url` (só o caminho), `res.statusCode` e
 * `responseTime` (padrão do pino-http); os logs dos serviços escritos durante a requisição
 * herdam o `req.id` pelo AsyncLocalStorage.
 */
export function createPinoHttpOptions(
  env: Pick<Env, 'LOG_LEVEL'>,
): PinoHttpOptions {
  return {
    level: env.LOG_LEVEL,
    genReqId,
    redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },
    serializers: { req: serializeRequest },
  };
}
