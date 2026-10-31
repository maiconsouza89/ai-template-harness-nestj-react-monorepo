/** Tipos de e-mail que o Módulo E-mail sabe enviar; cada um tem o seu template em `domain/`. */
export const EMAIL_TYPES = ['verify-email'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/**
 * Pedido de envio de e-mail, o que vai no job de `email.send` (HLD, Fluxo de dados): o tipo, o id
 * da conta e o link. Endereço e nome não entram, são lidos da conta no envio; a senha nunca entra.
 */
export interface EmailRequest {
  type: EmailType;
  userId: string;
  url: string;
}

/** Confere a forma de um pedido vindo de fora do processo (os dados de um job da fila). */
export function isEmailRequest(value: unknown): value is EmailRequest {
  if (typeof value !== 'object' || value === null) return false;
  const { type, userId, url } = value as Record<string, unknown>;
  return (
    typeof type === 'string' &&
    (EMAIL_TYPES as readonly string[]).includes(type) &&
    typeof userId === 'string' &&
    userId !== '' &&
    typeof url === 'string' &&
    url !== ''
  );
}
