/** Destinatário lido da conta no momento do envio. */
export interface EmailRecipient {
  name: string;
  email: string;
  /** Se a conta já confirmou o e-mail; o envio da confirmação é descartado quando verdadeiro. */
  emailVerified: boolean;
}

/** Porta de leitura do destinatário pelo id da conta; `null` quando a conta não existe mais. */
export abstract class EmailRecipients {
  abstract findById(userId: string): Promise<EmailRecipient | null>;
}
