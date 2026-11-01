import {
  hashPasswordResetIdentifier,
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  passwordResetIdentifier,
} from './password-reset-links.js';

// SHA-256 hexadecimal de "test".
const TEST_SHA256 =
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

describe('hashPasswordResetIdentifier', () => {
  it('mantém o prefixo e troca o token pelo SHA-256 hexadecimal dele', async () => {
    expect(PASSWORD_RESET_IDENTIFIER_PREFIX).toBe('reset-password:');
    await expect(
      hashPasswordResetIdentifier('reset-password:test'),
    ).resolves.toBe(`reset-password:${TEST_SHA256}`);
  });

  it('é estável e dá hashes distintos para tokens distintos', async () => {
    // Token falso com a forma do Better Auth (24 alfanuméricos), de baixa entropia para o gitleaks.
    const token = 'Ab1'.repeat(8);
    const first = await hashPasswordResetIdentifier(`reset-password:${token}`);
    await expect(
      hashPasswordResetIdentifier(`reset-password:${token}`),
    ).resolves.toBe(first);
    expect(first).toMatch(/^reset-password:[0-9a-f]{64}$/);
    expect(first).not.toContain(token);
    await expect(
      hashPasswordResetIdentifier('reset-password:outro'),
    ).resolves.not.toBe(first);
  });

  it('trata identificador sem prefixo como o próprio token', async () => {
    await expect(hashPasswordResetIdentifier('test')).resolves.toBe(
      `reset-password:${TEST_SHA256}`,
    );
  });
});

describe('passwordResetIdentifier', () => {
  it('é o hash do identificador com prefixo do token', async () => {
    await expect(passwordResetIdentifier('test')).resolves.toBe(
      `reset-password:${TEST_SHA256}`,
    );
  });
});
