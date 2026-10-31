import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { ENV } from '../../../../platform/config/config.module.js';
import type { Env } from '../../../../platform/config/env.js';
import {
  EmailTransport,
  type EmailMessage,
} from '../../domain/email-transport.js';

/**
 * Transporte SMTP com Nodemailer (ADR-0017), configurado só pelas variáveis `SMTP_*`: o mesmo
 * código entrega ao Mailpit no local e ao provedor real. TLS direto na porta 465; nas demais, com
 * credencial (`SMTP_USER`), STARTTLS é obrigatório (`requireTLS`): se o servidor não o aceitar,
 * o envio falha antes do AUTH, e um atacante no caminho não rebaixa a conexão para texto puro e
 * captura a senha. O certificado é sempre validado (padrão do Nodemailer). Texto puro só fica
 * para servidor sem credencial, como o Mailpit local. Os limites de tempo deixam o worker desistir
 * da tentativa com o servidor fora, em vez de esperar os 2 minutos padrão.
 */
@Injectable()
export class NodemailerEmailTransport
  extends EmailTransport
  implements OnModuleDestroy
{
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(ENV) env: Env) {
    super();
    this.from = env.SMTP_FROM;
    const secure = env.SMTP_PORT === 465;
    const requireTLS = !secure && Boolean(env.SMTP_USER);
    this.transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure,
      requireTLS,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  onModuleDestroy() {
    this.transporter.close();
  }
}
