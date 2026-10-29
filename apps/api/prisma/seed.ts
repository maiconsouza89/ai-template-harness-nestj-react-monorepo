import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { createAuth, type Auth } from '../src/modules/accounts/auth.ts';
import { EnvValidationError, loadEnv } from '../src/platform/config/env.ts';

/**
 * Seed do banco (spec da fundação, "Convenções para as features"): funções idempotentes que cada
 * RF estende, rodadas por `prisma db seed` dentro do `make db-setup`. O Node 26 executa este
 * arquivo direto (`node prisma/seed.ts`), por isso os imports relativos levam `.ts` e só
 * alcançam módulos sem decorators ou outra sintaxe que o Node não apaga.
 */

/**
 * Variáveis do primeiro admin, lidas só aqui; a API não as conhece. `ADMIN_PASSWORD` segue a
 * regra de senha do PRD (8 ou mais caracteres, com letra e número): `ctx.password.hash` não passa
 * pela validação do Better Auth, então o seed a confere antes de tocar no banco.
 */
export const adminSeedSchema = z.object({
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8).max(128).regex(/\p{L}/u).regex(/\p{N}/u),
});

export interface SeedAdminInput {
  email: string;
  password: string;
}

export interface SeedAdminResult {
  userId: string;
  created: boolean;
}

type AuthContext = Awaited<Auth['$context']>;

/**
 * Conta de `ADMIN_EMAIL` já existe sem papel admin ou sem e-mail verificado (spec, Tratamento
 * de erros): o seed recusa e não altera a conta, para não entregar o admin a quem registrou o
 * e-mail antes do `make db-setup`. A mensagem não imprime o e-mail.
 */
export class SeedAdminConflictError extends Error {
  constructor() {
    super(
      'já existe conta com o e-mail de ADMIN_EMAIL sem papel admin (ou sem e-mail verificado); nada foi alterado',
    );
    this.name = 'SeedAdminConflictError';
  }
}

/**
 * Conta admin de `ADMIN_EMAIL` com banimento em vigor (`banned` e `banExpires` nulo ou no
 * futuro; spec, Tratamento de erros): o seed recusa e não a altera, porque desbanir em silêncio
 * desfaria a decisão de um admin. A mensagem não imprime o e-mail.
 */
export class SeedAdminBannedError extends Error {
  constructor() {
    super(
      'a conta admin com o e-mail de ADMIN_EMAIL está banida; nada foi alterado',
    );
    this.name = 'SeedAdminBannedError';
  }
}

/** Banimento em vigor: banido sem data de expiração ou com a data ainda no futuro. */
export function isBanActive(
  user: { banned: boolean | null; banExpires: Date | null },
  now: Date = new Date(),
): boolean {
  if (user.banned !== true) return false;
  return user.banExpires === null || user.banExpires.getTime() > now.getTime();
}

/** Id no formato da instância do Better Auth; UUID só se ela delegar a geração ao banco. */
export function newId(ctx: AuthContext, model: 'user' | 'account'): string {
  const id = ctx.generateId({ model });
  return typeof id === 'string' ? id : randomUUID();
}

/**
 * Pré-requisito `admin-inicial` do contrato: a conta de `email` com papel admin, e-mail
 * verificado, sem banimento e credencial de senha com o hash do Better Auth (`ctx.password.hash`
 * da instância, nunca texto puro). Idempotente: conta já admin, verificada e sem banimento em
 * vigor não é tocada, nem a senha; conta com o e-mail sem papel admin ou sem e-mail verificado
 * lança `SeedAdminConflictError`, e admin com banimento em vigor lança `SeedAdminBannedError`,
 * os dois sem gravar nada.
 */
export async function seedAdminInicial(
  prisma: PrismaClient,
  auth: Auth,
  input: SeedAdminInput,
): Promise<SeedAdminResult> {
  const email = input.email.trim().toLowerCase();
  const ctx = await auth.$context;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      emailVerified: true,
      banned: true,
      banExpires: true,
    },
  });

  if (existing) {
    if (existing.role !== 'admin' || !existing.emailVerified) {
      throw new SeedAdminConflictError();
    }
    if (isBanActive(existing)) {
      throw new SeedAdminBannedError();
    }
    return { userId: existing.id, created: false };
  }

  const userId = newId(ctx, 'user');
  await prisma.user.create({
    data: {
      id: userId,
      name: email.slice(0, email.indexOf('@')),
      email,
      emailVerified: true,
      role: 'admin',
      banned: false,
      accounts: {
        create: {
          id: newId(ctx, 'account'),
          accountId: userId,
          providerId: 'credential',
          password: await ctx.password.hash(input.password),
        },
      },
    },
  });
  return { userId, created: true };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Entrada do `prisma db seed`: valida ADMIN_EMAIL e ADMIN_PASSWORD antes de tocar no banco. */
async function main() {
  const admin = adminSeedSchema.safeParse(process.env);
  if (!admin.success) {
    const names = [
      ...new Set(admin.error.issues.map((issue) => String(issue.path[0]))),
    ];
    fail(
      `seed: configuração do primeiro admin inválida; corrija no .env: ${names.join(', ')}`,
    );
  }

  let env;
  try {
    env = loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) fail(`seed: ${error.message}`);
    throw error;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    const result = await seedAdminInicial(prisma, createAuth(env, prisma), {
      email: admin.data.ADMIN_EMAIL,
      password: admin.data.ADMIN_PASSWORD,
    });
    console.log(
      result.created
        ? 'seed: primeiro admin criado'
        : 'seed: primeiro admin já existia com papel admin, e-mail verificado e sem banimento; nada alterado',
    );
  } catch (error) {
    if (
      error instanceof SeedAdminConflictError ||
      error instanceof SeedAdminBannedError
    ) {
      fail(`seed: ${error.message}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Só roda quando executado direto (`node prisma/seed.ts`), não quando os testes o importam.
const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  await main();
}
