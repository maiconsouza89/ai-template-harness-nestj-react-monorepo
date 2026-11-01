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

/** Registro recém-gravado: o `createdAt` separa os anteriores da conta dos posteriores. */
export interface CreatedEmailVerificationLink {
  id: string;
  userId: string;
  createdAt: Date;
}

/**
 * Porta dos registros de confirmação (spec, Componentes e Modelo de dados). O envio grava o
 * registro novo com `create`, limpa os vencidos de qualquer conta com `deleteExpiredBefore`, pede
 * o envio e só então apaga os anteriores da conta com `deleteOlderForUser`; se o pedido falha,
 * desfaz o novo com `deleteById`. A abertura do link busca por `findByTokenHash` e consome o
 * registro com `deleteById` depois de a biblioteca ativar a conta.
 */
export abstract class EmailVerificationLinks {
  /** Grava o registro do token novo da conta, sem tocar nos anteriores. */
  abstract create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<CreatedEmailVerificationLink>;
  /**
   * Apaga os registros da mesma conta criados antes de `link`, e não os criados depois, para dois
   * envios simultâneos não apagarem o registro um do outro. Devolve quantos apagou.
   */
  abstract deleteOlderForUser(
    link: CreatedEmailVerificationLink,
  ): Promise<number>;
  /** Apaga até `limit` registros, de qualquer conta, com `expiresAt` antes de `cutoff`. */
  abstract deleteExpiredBefore(cutoff: Date, limit: number): Promise<number>;
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationLink | null>;
  /** Apaga um registro pelo id; informa se ele ainda existia. */
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
