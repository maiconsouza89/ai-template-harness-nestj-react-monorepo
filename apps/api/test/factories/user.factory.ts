import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { newId, seedAdminInicial } from '../../prisma/seed.js';
import type { Auth } from '../../src/modules/accounts/auth.js';
import { EMAIL_VERIFICATION_IDENTIFIER_PREFIX } from '../../src/modules/accounts/domain/email-verification-links.js';
import { PASSWORD_RESET_IDENTIFIER_PREFIX } from '../../src/modules/accounts/domain/password-reset-links.js';
import { RESET_PASSWORD_SUBJECT } from '../../src/modules/email/domain/reset-password.template.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { waitForMessagesTo } from '../mailpit.js';

export interface AdminInicial {
  userId: string;
  email: string;
  password: string;
}

/** Credenciais do primeiro admin no `.env.test` (valores falsos, só do banco app_test). */
export function adminInicialCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD precisam estar no .env.test');
  }
  return { email, password };
}

/**
 * Pré-requisito `admin-inicial` do contrato: garante no banco app_test a conta admin do
 * `.env.test` pelo mesmo seed que o `make db-setup` roda, com a instância do Better Auth da
 * aplicação de teste para o hash da senha.
 */
export async function adminInicial(
  app: INestApplication,
): Promise<AdminInicial> {
  const credentials = adminInicialCredentials();
  const prisma = app.get(PrismaService);
  const auth = (app.get(AuthService) as AuthService<Auth>).instance;
  const { userId } = await seedAdminInicial(prisma, auth, credentials);
  return { userId, ...credentials };
}

export interface ContaComum {
  userId: string;
  email: string;
  /** Senha em texto puro usada no hash da credencial; diferente de ADMIN_PASSWORD. */
  password: string;
}

/**
 * Senha da conta comum, derivada de ADMIN_PASSWORD em tempo de execução: sempre diferente dela
 * e sem literal no código, para o gitleaks não a classificar como segredo.
 */
function contaComumPassword(adminPassword: string): string {
  return `${adminPassword}-comum`;
}

/**
 * Pré-requisito `conta-comum-com-email-do-admin` do contrato (CLI-ADMIN-04): a conta com o
 * e-mail de ADMIN_EMAIL, sem papel admin, e-mail não verificado, sem banimento e com credencial
 * de senha cujo hash (do Better Auth da aplicação de teste) é de uma senha diferente de
 * ADMIN_PASSWORD. Substitui qualquer conta com esse e-mail, para o estado ser exatamente o que
 * o contrato descreve: uma única conta, comum.
 */
export async function contaComumComEmailDoAdmin(
  app: INestApplication,
): Promise<ContaComum> {
  const { email: adminEmail, password: adminPassword } =
    adminInicialCredentials();
  const password = contaComumPassword(adminPassword);
  const email = adminEmail.trim().toLowerCase();
  const prisma = app.get(PrismaService);
  const ctx = await (app.get(AuthService) as AuthService<Auth>).instance
    .$context;

  await prisma.user.deleteMany({ where: { email } });

  const userId = newId(ctx, 'user');
  await prisma.user.create({
    data: {
      id: userId,
      name: email.slice(0, email.indexOf('@')),
      email,
      emailVerified: false,
      role: null,
      banned: false,
      accounts: {
        create: {
          id: newId(ctx, 'account'),
          accountId: userId,
          providerId: 'credential',
          password: await ctx.password.hash(password),
        },
      },
    },
  });
  return { userId, email, password };
}

/**
 * Pré-requisito `admin-banido` do contrato (CLI-ADMIN-05): a conta com o e-mail de ADMIN_EMAIL,
 * papel admin, e-mail verificado, banida sem data de expiração e com credencial de senha cujo
 * hash (do Better Auth da aplicação de teste) é da própria ADMIN_PASSWORD. Substitui qualquer
 * conta com esse e-mail, para o estado ser exatamente o que o contrato descreve: uma única conta,
 * admin e banida.
 */
export async function adminBanido(
  app: INestApplication,
): Promise<AdminInicial> {
  const { email: adminEmail, password } = adminInicialCredentials();
  const email = adminEmail.trim().toLowerCase();
  const prisma = app.get(PrismaService);
  const ctx = await (app.get(AuthService) as AuthService<Auth>).instance
    .$context;

  await prisma.user.deleteMany({ where: { email } });

  const userId = newId(ctx, 'user');
  await prisma.user.create({
    data: {
      id: userId,
      name: email.slice(0, email.indexOf('@')),
      email,
      emailVerified: true,
      role: 'admin',
      banned: true,
      banReason: 'banido pela factory de teste',
      banExpires: null,
      accounts: {
        create: {
          id: newId(ctx, 'account'),
          accountId: userId,
          providerId: 'credential',
          password: await ctx.password.hash(password),
        },
      },
    },
  });
  return { userId, email, password };
}

export interface PendingAccount {
  userId: string;
  name: string;
  email: string;
  /** Senha em texto puro enviada no cadastro. */
  password: string;
}

/** Dados da conta do pré-requisito `conta-pendente-ana` do contrato. */
export const PENDING_ACCOUNT_ANA = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  password: 'Segura123',
} as const;

/**
 * Pré-requisito `conta-pendente-ana` do contrato: a conta de ana@example.com, nome Ana Souza,
 * papel usuário, e-mail não verificado, sem banimento e com credencial de senha, criada pelo
 * próprio `POST /api/auth/sign-up/email`. Apaga antes qualquer conta com esse e-mail, para o
 * estado ser exatamente o que o contrato descreve. `ip` vai no `X-Forwarded-For`: cada caso usa
 * um IP de documentação (203.0.113.0/24) próprio, para o rate limit de um não afetar outro. O
 * cadastro dispara o e-mail de confirmação para a caixa do Mailpit.
 */
export async function pendingAccountAna(
  app: INestApplication<App>,
  ip: string,
): Promise<PendingAccount> {
  const prisma = app.get(PrismaService);
  await prisma.user.deleteMany({ where: { email: PENDING_ACCOUNT_ANA.email } });

  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('X-Forwarded-For', ip)
    .send(PENDING_ACCOUNT_ANA);
  if (response.status !== 200) {
    throw new Error(
      `conta-pendente-ana: o cadastro respondeu ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
  return {
    userId: (response.body as { user: { id: string } }).user.id,
    ...PENDING_ACCOUNT_ANA,
  };
}

/** Token do parâmetro `token` do link `/confirmar-email` num texto, ou `undefined`. */
export function confirmationTokenIn(text: string): string | undefined {
  const link = /https?:\/\/\S+\/confirmar-email\?token=[^\s"<]+/.exec(
    text,
  )?.[0];
  return link
    ? (new URL(link).searchParams.get('token') ?? undefined)
    : undefined;
}

/**
 * Pré-requisito de Configuração do contrato do RF-002: o token do link da conta de `email` é o
 * parâmetro `token` do link da mensagem mais recente para esse e-mail na caixa do Mailpit. Espera
 * até chegarem `messages` mensagens para ele (1, a do cadastro; 2, a do cadastro e a de um
 * reenvio) e devolve os tokens da mais recente para a mais antiga, na ordem da busca do Mailpit
 * (recebimento decrescente, com milissegundos; o cabeçalho `Date` só tem segundos).
 */
export async function confirmationTokens(
  email: string,
  { messages = 1, timeoutMs = 15_000 } = {},
): Promise<string[]> {
  const received = await waitForMessagesTo(email, timeoutMs, messages);
  if (received.length < messages) {
    throw new Error(
      `esperava ${messages} mensagem(ns) na caixa do Mailpit, chegaram ${received.length}`,
    );
  }
  return received.map(({ Text }) => {
    const token = confirmationTokenIn(Text);
    if (!token) throw new Error('mensagem sem o link de confirmação');
    return token;
  });
}

/** Token do link da mensagem mais recente para `email` (veja `confirmationTokens`). */
export async function latestConfirmationToken(
  email: string,
  options: { messages?: number; timeoutMs?: number } = {},
): Promise<string> {
  const [latest] = await confirmationTokens(email, options);
  return latest!;
}

/** Filtro Prisma dos registros de confirmação de uma conta (tabela `verification`). */
export function emailVerificationRecordsOf(userId: string) {
  return {
    value: userId,
    identifier: { startsWith: EMAIL_VERIFICATION_IDENTIFIER_PREFIX },
  };
}

/**
 * Pré-requisito de Configuração do contrato do RF-002: move o vencimento do link de uma conta,
 * alterando o `expiresAt` do registro de confirmação dela (a linha de `verification` com
 * `identifier` começando por `email-verification:` e `value` igual ao id da conta). Devolve
 * quantos registros mudaram.
 */
export async function moveEmailVerificationExpiry(
  app: INestApplication,
  userId: string,
  expiresAt: Date,
): Promise<number> {
  const { count } = await app.get(PrismaService).verification.updateMany({
    where: emailVerificationRecordsOf(userId),
    data: { expiresAt },
  });
  return count;
}

/** Senha da credencial do pré-requisito `conta-ativa` do contrato do RF-005. */
export const CONTA_ATIVA_PASSWORD = 'Antiga123';

export interface ContaAtiva {
  userId: string;
  name: string;
  email: string;
  /** Senha em texto puro da credencial: `CONTA_ATIVA_PASSWORD`. */
  password: string;
}

/** Filtro Prisma dos registros de recuperação de uma conta (tabela `verification`). */
export function passwordResetRecordsOf(userId: string) {
  return {
    value: userId,
    identifier: { startsWith: PASSWORD_RESET_IDENTIFIER_PREFIX },
  };
}

/**
 * Pré-requisito `conta-ativa` do contrato do RF-005: a conta de `email` e `name`, papel usuário,
 * e-mail verificado, sem banimento, credencial de senha Antiga123 com o hash do Better Auth da
 * aplicação de teste, nenhuma sessão e nenhum registro de recuperação. Substitui qualquer conta
 * com esse e-mail (as sessões e credenciais dela saem em cascata) e os registros de recuperação
 * dela, para o estado ser exatamente o que o contrato descreve. Nenhum e-mail é enviado.
 */
export async function contaAtiva(
  app: INestApplication,
  { email, name }: { email: string; name: string },
): Promise<ContaAtiva> {
  const normalized = email.trim().toLowerCase();
  const prisma = app.get(PrismaService);
  const ctx = await (app.get(AuthService) as AuthService<Auth>).instance
    .$context;

  const previous = await prisma.user.findMany({
    where: { email: normalized },
    select: { id: true },
  });
  for (const { id } of previous) {
    await prisma.verification.deleteMany({ where: passwordResetRecordsOf(id) });
  }
  await prisma.user.deleteMany({ where: { email: normalized } });

  const userId = newId(ctx, 'user');
  await prisma.user.create({
    data: {
      id: userId,
      name,
      email: normalized,
      emailVerified: true,
      role: 'user',
      banned: false,
      accounts: {
        create: {
          id: newId(ctx, 'account'),
          accountId: userId,
          providerId: 'credential',
          password: await ctx.password.hash(CONTA_ATIVA_PASSWORD),
        },
      },
    },
  });
  return { userId, name, email: normalized, password: CONTA_ATIVA_PASSWORD };
}

/** Token do parâmetro `token` do link `/redefinir-senha` num texto, ou `undefined`. */
export function resetPasswordTokenIn(text: string): string | undefined {
  const link = /https?:\/\/\S+\/redefinir-senha\?token=[^\s"<]+/.exec(
    text,
  )?.[0];
  return link
    ? (new URL(link).searchParams.get('token') ?? undefined)
    : undefined;
}

/**
 * Pré-requisito de Configuração do contrato do RF-005: o token do link de recuperação da conta de
 * `email` é o parâmetro `token` do link da mensagem mais recente de assunto "Redefina sua senha"
 * para esse e-mail na caixa do Mailpit. Espera até chegarem `messages` mensagens desse assunto e
 * devolve os tokens da mais recente para a mais antiga.
 */
export async function resetPasswordTokens(
  email: string,
  { messages = 1, timeoutMs = 15_000 } = {},
): Promise<string[]> {
  const received = await waitForMessagesTo(
    email,
    timeoutMs,
    messages,
    RESET_PASSWORD_SUBJECT,
  );
  if (received.length < messages) {
    throw new Error(
      `esperava ${messages} mensagem(ns) de recuperação na caixa do Mailpit, chegaram ${received.length}`,
    );
  }
  return received.map(({ Text }) => {
    const token = resetPasswordTokenIn(Text);
    if (!token) throw new Error('mensagem sem o link de recuperação');
    return token;
  });
}

/** Token do link de recuperação mais recente para `email` (veja `resetPasswordTokens`). */
export async function latestResetPasswordToken(
  email: string,
  options: { messages?: number; timeoutMs?: number } = {},
): Promise<string> {
  const [latest] = await resetPasswordTokens(email, options);
  return latest!;
}

/**
 * Pré-requisito de Configuração do contrato do RF-005: move o vencimento do link de recuperação de
 * uma conta, alterando o `expiresAt` do registro de recuperação dela (a linha de `verification`
 * com `identifier` começando por `reset-password:` e `value` igual ao id da conta). Devolve
 * quantos registros mudaram.
 */
export async function movePasswordResetExpiry(
  app: INestApplication,
  userId: string,
  expiresAt: Date,
): Promise<number> {
  const { count } = await app.get(PrismaService).verification.updateMany({
    where: passwordResetRecordsOf(userId),
    data: { expiresAt },
  });
  return count;
}
