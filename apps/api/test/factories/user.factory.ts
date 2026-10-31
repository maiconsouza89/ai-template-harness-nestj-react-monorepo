import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { newId, seedAdminInicial } from '../../prisma/seed.js';
import type { Auth } from '../../src/modules/accounts/auth.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';

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
