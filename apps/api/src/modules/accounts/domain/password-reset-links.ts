/**
 * Registro do link de recuperação de senha do RF-005 (spec, Regras e fluxos e Modelo de dados).
 * O Better Auth grava cada pedido na tabela `verification` com o identificador
 * `reset-password:<token>`, o id da conta no valor e o vencimento de 1 hora; com o override de
 * `verification.storeIdentifier`, o identificador gravado passa a ser
 * `reset-password:<sha256 hexadecimal do token>`, e a biblioteca aplica o mesmo hash ao buscar e
 * consumir o registro. O token em texto puro nunca é gravado.
 */

/** Prefixo do `identifier` dos registros de recuperação na tabela `verification`. */
export const PASSWORD_RESET_IDENTIFIER_PREFIX = 'reset-password:';

/** Registro de recuperação vigente ou vencido, lido pelo identificador gravado. */
export interface PasswordResetLink {
  id: string;
  userId: string;
  expiresAt: Date;
  /** Separa os registros anteriores da conta dos posteriores. */
  createdAt: Date;
}

/**
 * Porta dos registros de recuperação (spec, Componentes e Modelo de dados). O callback de envio
 * acha o registro que a biblioteca acabou de gravar com `findByIdentifier`, limpa os vencidos de
 * qualquer conta com `deleteExpired`, pede o envio e só então apaga os anteriores da conta com
 * `deleteOlderForUser`; se o pedido falha, desfaz o novo com `deleteById`.
 */
export abstract class PasswordResetLinks {
  /** Busca o registro pelo identificador já com hash, como a biblioteca o gravou. */
  abstract findByIdentifier(
    identifier: string,
  ): Promise<PasswordResetLink | null>;
  /**
   * Apaga os registros da mesma conta criados antes de `link`, e não os criados depois, para dois
   * pedidos simultâneos não apagarem o registro um do outro. Devolve quantos apagou.
   */
  abstract deleteOlderForUser(
    link: Pick<PasswordResetLink, 'id' | 'userId' | 'createdAt'>,
  ): Promise<number>;
  /** Apaga um registro pelo id; informa se ele ainda existia. */
  abstract deleteById(id: string): Promise<boolean>;
  /** Apaga os registros, de qualquer conta, com `expiresAt` antes de `now`. Devolve quantos. */
  abstract deleteExpired(now: Date): Promise<number>;
}

/**
 * Hash do identificador para o override de `verification.storeIdentifier` do Better Auth:
 * `reset-password:<token>` vira `reset-password:<sha256 hexadecimal do token>`, mantendo o
 * prefixo, que a remoção dos anteriores e dos vencidos usa como filtro. Identificador sem o
 * prefixo é tratado como o próprio token. Usa o Web Crypto global do Node, e não `node:crypto`,
 * porque `domain/` não importa nada fora do próprio domínio (ADR-0025).
 */
export async function hashPasswordResetIdentifier(
  identifier: string,
): Promise<string> {
  const token = identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)
    ? identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length)
    : identifier;
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${hex}`;
}

/** Identificador gravado do registro de um token: o hash de `reset-password:<token>`. */
export function passwordResetIdentifier(token: string): Promise<string> {
  return hashPasswordResetIdentifier(
    `${PASSWORD_RESET_IDENTIFIER_PREFIX}${token}`,
  );
}
