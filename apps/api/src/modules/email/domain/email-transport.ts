/** Mensagem pronta para entrega; o remetente é configuração do transporte. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Porta de entrega da mensagem ao servidor de e-mail. Rejeita quando a entrega falha. */
export abstract class EmailTransport {
  abstract send(message: EmailMessage): Promise<void>;
}
