import type { PrismaClient } from '../src/generated/prisma/client.ts';
import { createAuth } from '../src/modules/accounts/auth.ts';

/**
 * Configuração que a CLI do Better Auth lê para gerar as tabelas no `schema.prisma`; nada em
 * tempo de execução a importa. Rode na pasta apps/api sempre que um plugin entrar ou sair:
 *
 *   pnpm dlx auth@1.7.14 generate --config prisma/better-auth.config.ts --output prisma/schema.prisma -y
 *
 * A geração só olha as opções e os plugins, por isso os valores são de exemplo e o cliente
 * Prisma é um objeto vazio: a CLI não abre conexão nem consulta nada.
 */
export const auth = createAuth(
  {
    NODE_ENV: 'development',
    BETTER_AUTH_SECRET: 'so-para-gerar-o-schema-nao-e-um-segredo-00',
    BETTER_AUTH_URL: 'http://localhost:3000',
    WEB_ORIGIN: 'http://localhost:5173',
    COOKIE_DOMAIN: undefined,
    TRUSTED_PROXIES: undefined,
  },
  {} as unknown as PrismaClient,
);
