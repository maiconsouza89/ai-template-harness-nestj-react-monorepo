import { randomInt } from 'node:crypto';

/** Cabeçalho de onde o Better Auth lê o IP do cliente (`advanced.ipAddress`, padrão). */
export const CLIENT_IP_HEADER = 'X-Forwarded-For';

/**
 * IP de cliente aleatório para um teste, na faixa 198.18.0.0/15 (RFC 2544, reservada a testes).
 * Sem cabeçalho, o Better Auth trata toda requisição de teste como 127.0.0.1, e o rate limit de
 * `/api/auth` somaria as chamadas de todos os testes; com um IP por teste, cada um tem a própria
 * conta. Gere um por teste e mande em toda chamada a `/api/auth` dele.
 */
export function randomClientIp(): string {
  return `198.${randomInt(18, 20)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

/** Requisição do Supertest (ou qualquer uma com `set`) com o IP do cliente no cabeçalho. */
export function withClientIp<
  T extends { set(field: string, value: string): T },
>(req: T, ip: string = randomClientIp()): T {
  return req.set(CLIENT_IP_HEADER, ip);
}
