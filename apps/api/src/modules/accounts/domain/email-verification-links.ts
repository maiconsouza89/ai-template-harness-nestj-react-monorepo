/**
 * Registro de confirmação de e-mail do RF-002 (spec, Regras e fluxos). O token do Better Auth é
 * um JWT sem estado; para o link valer uma vez só e o reenvio invalidar os anteriores, cada envio
 * grava o hash do token na tabela `verification`, com o identificador
 * `email-verification:<sha256 hexadecimal do token>`, o id da conta no valor e o vencimento. O
 * token em texto puro nunca é gravado.
 */

/** Prefixo do `identifier` dos registros de confirmação na tabela `verification`. */
export const EMAIL_VERIFICATION_IDENTIFIER_PREFIX = 'email-verification:';

/** Registro de confirmação vigente ou vencido, lido pelo hash do token. */
export interface EmailVerificationLink {
  id: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Porta dos registros de confirmação. `replaceForUser` apaga todos os registros da conta e grava
 * o do token novo de uma vez; `deleteById` informa se apagou, para só um de dois pedidos
 * simultâneos com o mesmo link consumir o registro.
 */
export abstract class EmailVerificationLinks {
  abstract replaceForUser(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationLink | null>;
  abstract deleteById(id: string): Promise<boolean>;
}

/**
 * SHA-256 do token em hexadecimal. Usa o Web Crypto global do Node, e não `node:crypto`, porque
 * `domain/` não importa nada fora do próprio domínio (ADR-0025).
 */
export async function hashEmailVerificationToken(
  token: string,
): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** `identifier` do registro de confirmação de um token já transformado em hash. */
export function emailVerificationIdentifier(tokenHash: string): string {
  return `${EMAIL_VERIFICATION_IDENTIFIER_PREFIX}${tokenHash}`;
}
