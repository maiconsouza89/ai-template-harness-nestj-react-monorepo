/** Destinatário lido da conta no momento do envio. */
export interface EmailRecipient {
  name: string;
  email: string;
}

/** Porta de leitura do destinatário pelo id da conta; `null` quando a conta não existe mais. */
export abstract class EmailRecipients {
  abstract findById(userId: string): Promise<EmailRecipient | null>;
}
