import { describe, expect, it } from 'vitest';
import { sessionResponseSchema } from './session.js';

describe('sessionResponseSchema', () => {
  it('aceita o papel user', () => {
    const result = sessionResponseSchema.safeParse({
      userId: 'Yp3m2',
      role: 'user',
    });
    expect(result.success).toBe(true);
  });

  it('aceita o papel admin', () => {
    const result = sessionResponseSchema.safeParse({
      userId: 'Yp3m2',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('recusa outros papéis', () => {
    const result = sessionResponseSchema.safeParse({
      userId: 'Yp3m2',
      role: 'superuser',
    });
    expect(result.success).toBe(false);
  });

  it('recusa userId vazio ou ausente', () => {
    expect(
      sessionResponseSchema.safeParse({ userId: '', role: 'user' }).success,
    ).toBe(false);
    expect(sessionResponseSchema.safeParse({ role: 'user' }).success).toBe(
      false,
    );
  });
});
