import { describe, expect, it } from 'vitest';
import { webEnvSchema } from './web-env.js';

describe('webEnvSchema', () => {
  it('aceita uma URL e remove a barra final', () => {
    const result = webEnvSchema.parse({
      VITE_API_URL: 'http://localhost:3000/',
    });
    expect(result.VITE_API_URL).toBe('http://localhost:3000');
  });

  it('recusa VITE_API_URL ausente ou inválida', () => {
    expect(webEnvSchema.safeParse({}).success).toBe(false);
    expect(webEnvSchema.safeParse({ VITE_API_URL: 'localhost' }).success).toBe(
      false,
    );
  });
});
