/** Mensagem pronta para entrega; o remetente é configuração do transporte. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Porta de entrega da mensagem ao servidor de e-mail. Rejeita quando a entrega falha. */
export abstract class EmailTransport {
  /**
   * Abre e fecha uma conexão com o servidor; rejeita quando ele não atende. Serve para o envio
   * esperar o servidor antes de reler a conta, e não entregar o que deixou de valer enquanto a
   * conexão estava pendente.
   */
  abstract verify(): Promise<void>;
  abstract send(message: EmailMessage): Promise<void>;
}
