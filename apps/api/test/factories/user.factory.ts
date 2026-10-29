import type { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { seedAdminInicial } from '../../prisma/seed.js';
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
