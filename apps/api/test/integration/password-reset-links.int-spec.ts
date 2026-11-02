import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PasswordResetLinks } from '../../src/modules/accounts/domain/password-reset-links.js';
import { PrismaPasswordResetLinksRepository } from '../../src/modules/accounts/infra/password-reset/prisma-password-reset-links.repository.js';
import { PrismaService } from '../../src/platform/prisma/prisma.service.js';
import { createTestApp } from '../create-test-app.js';

const MINUTE_MS = 60_000;

/**
 * Implementação Prisma da porta `PasswordResetLinks` sobre a tabela `verification` (spec,
 * Componentes e Modelo de dados), com o banco app_test: cada operação só toca os registros com o
 * prefixo `reset-password:`, e os anteriores de um registro são os da mesma conta com `createdAt`
 * menor. Os registros são gravados direto pelo Prisma, com contas fictícias no `value` (a coluna
 * não tem chave estrangeira), e apagados no fim.
 */
describe('PrismaPasswordResetLinksRepository (integração, banco app_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let links: PasswordResetLinks;
  const run = randomUUID().slice(0, 8);

  async function row(
    identifier: string,
    userId: string,
    {
      createdAt = new Date(),
      expiresAt = new Date(Date.now() + 60 * MINUTE_MS),
    } = {},
  ) {
    return prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier,
        value: userId,
        createdAt,
        updatedAt: createdAt,
        expiresAt,
      },
    });
  }

  function remaining(userId: string) {
    return prisma.verification.findMany({
      where: { value: userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    links = app.get(PasswordResetLinks, { strict: false });
  });

  afterAll(async () => {
    await prisma.verification.deleteMany({
      where: { value: { startsWith: `conta-${run}` } },
    });
    await app.close();
  });

  it('a porta é ligada à implementação Prisma', () => {
    expect(links).toBeInstanceOf(PrismaPasswordResetLinksRepository);
  });

  it('busca pelo identificador gravado e ignora o que não é de recuperação', async () => {
    const userId = `conta-${run}-busca`;
    const reset = await row(`reset-password:busca-${run}`, userId);
    await row(`email-verification:busca-${run}`, userId);

    await expect(
      links.findByIdentifier(`reset-password:busca-${run}`),
    ).resolves.toEqual({
      id: reset.id,
      userId,
      expiresAt: reset.expiresAt,
      createdAt: reset.createdAt,
    });
    await expect(
      links.findByIdentifier(`email-verification:busca-${run}`),
    ).resolves.toBeNull();
    await expect(
      links.findByIdentifier(`reset-password:ausente-${run}`),
    ).resolves.toBeNull();
  });

  it('apaga só os registros de recuperação da conta criados antes do dado', async () => {
    const userId = `conta-${run}-anteriores`;
    const other = `conta-${run}-outra`;
    const base = Date.now();
    const older = await row(`reset-password:a1-${run}`, userId, {
      createdAt: new Date(base - 2 * MINUTE_MS),
    });
    const current = await row(`reset-password:a2-${run}`, userId, {
      createdAt: new Date(base - MINUTE_MS),
    });
    const newer = await row(`reset-password:a3-${run}`, userId, {
      createdAt: new Date(base),
    });
    const confirmation = await row(`email-verification:a4-${run}`, userId, {
      createdAt: new Date(base - 3 * MINUTE_MS),
    });
    const otherAccount = await row(`reset-password:a5-${run}`, other, {
      createdAt: new Date(base - 3 * MINUTE_MS),
    });

    await expect(
      links.deleteOlderForUser({
        id: current.id,
        userId,
        createdAt: current.createdAt,
      }),
    ).resolves.toBe(1);

    expect(await remaining(userId)).toEqual([
      { id: confirmation.id },
      { id: current.id },
      { id: newer.id },
    ]);
    expect(await remaining(other)).toEqual([{ id: otherAccount.id }]);
    expect(
      await prisma.verification.findUnique({ where: { id: older.id } }),
    ).toBeNull();
  });

  it('apaga pelo id só registro de recuperação e diz se ele existia', async () => {
    const userId = `conta-${run}-id`;
    const reset = await row(`reset-password:id-${run}`, userId);
    const confirmation = await row(`email-verification:id-${run}`, userId);

    await expect(links.deleteById(reset.id)).resolves.toBe(true);
    await expect(links.deleteById(reset.id)).resolves.toBe(false);
    await expect(links.deleteById(confirmation.id)).resolves.toBe(false);
    expect(await remaining(userId)).toEqual([{ id: confirmation.id }]);
  });

  it('apaga os registros de recuperação vencidos de qualquer conta e mantém os outros', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - MINUTE_MS);
    const future = new Date(now.getTime() + MINUTE_MS);
    const first = `conta-${run}-vencido-1`;
    const second = `conta-${run}-vencido-2`;
    await row(`reset-password:v1-${run}`, first, { expiresAt: past });
    await row(`reset-password:v2-${run}`, second, { expiresAt: past });
    const valid = await row(`reset-password:v3-${run}`, second, {
      expiresAt: future,
    });
    const confirmation = await row(`email-verification:v4-${run}`, first, {
      expiresAt: past,
    });

    const deleted = await links.deleteExpired(now);

    expect(deleted).toBeGreaterThanOrEqual(2);
    expect(await remaining(first)).toEqual([{ id: confirmation.id }]);
    expect(await remaining(second)).toEqual([{ id: valid.id }]);
  });
});
