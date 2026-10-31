import { createServer, type AddressInfo, type Server } from 'node:net';
import type { Env } from '../../../../platform/config/env.js';
import { NodemailerEmailTransport } from './nodemailer-email.transport.js';

/**
 * Servidor SMTP mínimo em texto puro que não anuncia STARTTLS e o recusa, como faria um atacante
 * no caminho que suprime o anúncio. Registra os comandos recebidos para o teste saber se a
 * credencial saiu.
 */
function startPlainSmtpServer(): Promise<{
  server: Server;
  port: number;
  commands: string[];
}> {
  const commands: string[] = [];
  const server = createServer((socket) => {
    let inData = false;
    let buffer = '';
    socket.write('220 localhost ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index: number;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            socket.write('250 OK\r\n');
          }
          continue;
        }
        commands.push(line);
        const verb = line.split(' ')[0]?.toUpperCase();
        if (verb === 'EHLO')
          socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (verb === 'STARTTLS') socket.write('454 TLS not available\r\n');
        else if (verb === 'AUTH')
          socket.write('235 Authentication successful\r\n');
        else if (verb === 'DATA') {
          inData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (verb === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        port: (server.address() as AddressInfo).port,
        commands,
      });
    });
  });
}

function envFor(port: number, overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: port,
    SMTP_FROM: 'no-reply@localhost',
    ...overrides,
  } as Env;
}

const message = {
  to: 'paula@example.com',
  subject: 'Confirme seu e-mail',
  text: 'texto',
  html: '<p>texto</p>',
};

describe('NodemailerEmailTransport', () => {
  let smtp: Awaited<ReturnType<typeof startPlainSmtpServer>>;
  let transport: NodemailerEmailTransport | undefined;

  beforeEach(async () => {
    smtp = await startPlainSmtpServer();
  });

  afterEach(async () => {
    transport?.onModuleDestroy();
    transport = undefined;
    await new Promise<void>((resolve) => smtp.server.close(() => resolve()));
  });

  it('com credenciais, recusa enviar sem STARTTLS e não manda a credencial em texto puro', async () => {
    transport = new NodemailerEmailTransport(
      envFor(smtp.port, { SMTP_USER: 'usuario', SMTP_PASSWORD: 'segredo' }),
    );

    await expect(transport.send(message)).rejects.toThrow();
    expect(
      smtp.commands.some((line) => line.toUpperCase().startsWith('AUTH')),
    ).toBe(false);
  });

  it('sem credenciais (Mailpit local), entrega em texto puro', async () => {
    transport = new NodemailerEmailTransport(envFor(smtp.port));

    await expect(transport.send(message)).resolves.toBeUndefined();
    expect(
      smtp.commands.some((line) => line.toUpperCase().startsWith('MAIL FROM')),
    ).toBe(true);
  });
});
