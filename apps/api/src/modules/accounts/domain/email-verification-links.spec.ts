import {
  EMAIL_VERIFICATION_IDENTIFIER_PREFIX,
  emailVerificationIdentifier,
  hashEmailVerificationToken,
} from './email-verification-links.js';

describe('hashEmailVerificationToken', () => {
  it('é o SHA-256 hexadecimal do token', async () => {
    await expect(hashEmailVerificationToken('test')).resolves.toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    );
  });

  it('dá hashes distintos para tokens distintos, sempre com 64 dígitos hexadecimais', async () => {
    await expect(hashEmailVerificationToken('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    await expect(hashEmailVerificationToken('eyJ.a.b')).resolves.toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});

describe('emailVerificationIdentifier', () => {
  it('põe o prefixo antes do hash', () => {
    expect(EMAIL_VERIFICATION_IDENTIFIER_PREFIX).toBe('email-verification:');
    expect(emailVerificationIdentifier('abc123')).toBe(
      'email-verification:abc123',
    );
  });
});
