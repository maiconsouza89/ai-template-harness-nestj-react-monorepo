import { createTransport } from 'nodemailer';
import type { Env } from '../../../../platform/config/env.js';

/** Token do transporte de e-mail; o teste de unidade do worker troca por dublê. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** Mensagem pronta para envio: destinatário, assunto e corpo em texto e HTML. */
export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** O que o worker usa do transporte: enviar uma mensagem, lançando em caso de falha. */
export interface MailTransport {
  send(mail: OutgoingMail): Promise<void>;
}

export type SmtpEnv = Pick<
  Env,
  'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_FROM' | 'SMTP_USER' | 'SMTP_PASSWORD'
>;

/**
 * Transporte SMTP genérico com Nodemailer (ADR-0017), a partir de `SMTP_HOST`, `SMTP_PORT`,
 * `SMTP_FROM` e, se houver, `SMTP_USER` e `SMTP_PASSWORD`: o mesmo código envia ao Mailpit
 * (ADR-0016) e a um provedor real. TLS implícito na porta 465; nas demais, STARTTLS quando o
 * servidor oferece. Prazos curtos de conexão fazem a falha virar nova tentativa do BullMQ em vez
 * de segurar o worker pelos 2 minutos padrão do Nodemailer.
 */
export function createMailTransport(env: SmtpEnv): MailTransport {
  const transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  return {
    async send(mail) {
      await transporter.sendMail({ from: env.SMTP_FROM, ...mail });
    },
  };
}
