import { ServerResponse, createServer, type IncomingMessage } from 'node:http';
import { Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import {
  REDACT_CENSOR,
  REQUEST_ID_HEADER,
  createPinoHttpOptions,
  genReqId,
} from './logger.js';

/** Logger com as opções da API escrevendo em memória, uma linha JSON por entrada. */
function loggerInMemory() {
  const lines: string[] = [];
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const { level, redact } = createPinoHttpOptions({ LOG_LEVEL: 'info' });
  return { logger: pino({ level, redact }, sink), lines };
}

/**
 * Sobe um servidor HTTP com o middleware do pino-http montado com as opções da API, como o
 * nestjs-pino o monta, envia uma requisição e devolve a linha de log dela. `prepare` imita o que
 * o Express acrescenta ao `req` antes do log (`originalUrl` e `query` já interpretada).
 */
async function logOfRequest(
  path: string,
  headers: Record<string, string>,
  prepare: (req: IncomingMessage) => void,
): Promise<string> {
  const lines: string[] = [];
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const middleware = pinoHttp(
    createPinoHttpOptions({ LOG_LEVEL: 'info' }),
    sink,
  );
  const server = createServer((req, res) => {
    prepare(req);
    middleware(req, res);
    res.end('ok');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('servidor sem porta');
  }
  try {
    await fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
    for (let i = 0; lines.length === 0 && i < 50; i++) await sleep(10);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  expect(lines).toHaveLength(1);
  return lines[0];
}

describe('createPinoHttpOptions', () => {
  it('usa o nível de LOG_LEVEL', () => {
    expect(createPinoHttpOptions({ LOG_LEVEL: 'debug' }).level).toBe('debug');
    expect(createPinoHttpOptions({ LOG_LEVEL: 'silent' }).level).toBe('silent');
  });

  it('redige email, name e password no topo e um nível abaixo', () => {
    const { logger, lines } = loggerInMemory();
    logger.info({
      email: 'pessoa@example.com',
      name: 'Pessoa Exemplo',
      password: 'Senha1234',
      user: {
        email: 'outra@example.com',
        name: 'Outra Pessoa',
        password: 'Outra1234',
      },
    });
    expect(lines).toHaveLength(1);
    const line = JSON.parse(lines[0]);
    expect(lines[0]).not.toMatch(
      /pessoa@example\.com|Pessoa Exemplo|Senha1234|outra@example\.com|Outra Pessoa|Outra1234/,
    );
    expect(line.email).toBe(REDACT_CENSOR);
    expect(line.user).toEqual({
      email: REDACT_CENSOR,
      name: REDACT_CENSOR,
      password: REDACT_CENSOR,
    });
  });

  it('redige os cabeçalhos cookie e authorization da requisição e o set-cookie da resposta', () => {
    const { logger, lines } = loggerInMemory();
    logger.info({
      req: {
        headers: {
          cookie: 'better-auth.session_token=segredo-do-cookie',
          authorization: 'Bearer segredo-do-token',
          'user-agent': 'teste',
        },
      },
      res: { headers: { 'set-cookie': ['better-auth.session_token=novo'] } },
    });
    const line = JSON.parse(lines[0]);
    expect(lines[0]).not.toMatch(/segredo-do-cookie|segredo-do-token|=novo/);
    expect(line.req.headers).toEqual({
      cookie: REDACT_CENSOR,
      authorization: REDACT_CENSOR,
      'user-agent': 'teste',
    });
    expect(line.res.headers['set-cookie']).toBe(REDACT_CENSOR);
  });

  it('registra só o caminho em req.url, sem a query string nem req.query, e mantém o resto da linha', async () => {
    const raw = await logOfRequest(
      '/api/auth/verify-email?token=segredo-da-query&callbackURL=%2F',
      { cookie: 'better-auth.session_token=segredo-do-cookie' },
      (req) => {
        // Como o Express deixa o req: originalUrl com a query e req.query já interpretada.
        Object.assign(req, {
          originalUrl: req.url,
          query: { token: 'segredo-da-query', callbackURL: '/' },
        });
      },
    );
    const line = JSON.parse(raw);
    expect(raw).not.toMatch(/segredo-da-query|segredo-do-cookie|callbackURL/);
    expect(line.req.url).toBe('/api/auth/verify-email');
    expect(line.req.query).toBeUndefined();
    expect(line.req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(line.req.method).toBe('GET');
    expect(line.req.headers.cookie).toBe(REDACT_CENSOR);
    expect(line.res.statusCode).toBe(200);
    expect(typeof line.responseTime).toBe('number');
  });
});

describe('genReqId', () => {
  const req = {} as IncomingMessage;

  it('gera ids distintos, que não são inteiros, e os devolve no cabeçalho x-request-id', () => {
    const responses = Array.from({ length: 50 }, () => new ServerResponse(req));
    const ids = responses.map((res) => genReqId(req, res));
    expect(new Set(ids).size).toBe(ids.length);
    for (const [index, id] of ids.entries()) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(Number.isInteger(Number(id))).toBe(false);
      expect(responses[index].getHeader(REQUEST_ID_HEADER)).toBe(id);
    }
  });
});
