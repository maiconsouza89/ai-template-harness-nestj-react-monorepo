import { describe, expect, it } from 'vitest';
import {
  passwordSchema,
  requestPasswordResetSchema,
  requestPasswordResetStates,
  resendVerificationEmailSchema,
  resetPasswordCodes,
  resetPasswordFormSchema,
  resetPasswordMessages,
  resetPasswordSchema,
  resetPasswordStates,
  signUpErrorCodes,
  signUpMessages,
  signUpSchema,
  toResetPasswordFieldErrors,
  toSignUpFieldErrors,
  verifyEmailCodes,
  verifyEmailMessages,
  verifyEmailStates,
} from './accounts.js';

const rule =
  'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.';

function firstMessage(value: unknown): string | undefined {
  const result = passwordSchema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('passwordSchema', () => {
  it('aceita senha com letra, número e 8 ou mais caracteres', () => {
    expect(passwordSchema.safeParse('Segura123').success).toBe(true);
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
  });

  it('recusa senha sem número com a regra inteira', () => {
    expect(firstMessage('segurança')).toBe(rule);
  });

  it('recusa senha sem letra com a regra inteira', () => {
    expect(firstMessage('12345678')).toBe(rule);
  });

  it('recusa senha curta com a regra inteira', () => {
    expect(firstMessage('Seg123')).toBe(rule);
    expect(firstMessage('Seg1234')).toBe(rule);
  });

  it('recusa senha ausente com a regra inteira', () => {
    expect(firstMessage(undefined)).toBe(rule);
  });

  it('recusa senha com mais de 128 caracteres', () => {
    expect(firstMessage(`a1${'x'.repeat(127)}`)).toBe(
      signUpMessages.passwordTooLong,
    );
  });
});

describe('signUpSchema', () => {
  const valid = {
    name: 'Ana Souza',
    email: 'ana@example.com',
    password: 'Segura123',
  };

  it('aceita o cadastro válido, com o e-mail em minúsculas e o nome sem espaços nas pontas', () => {
    const result = signUpSchema.safeParse({
      ...valid,
      name: '  Dani Melo ',
      email: ' Dani.Melo@Example.COM ',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Dani Melo',
      email: 'dani.melo@example.com',
      password: 'Segura123',
    });
  });

  it('recusa nome em branco', () => {
    const result = signUpSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'name', message: signUpMessages.nameRequired },
    ]);
  });

  it('recusa e-mail inválido', () => {
    const result = signUpSchema.safeParse({ ...valid, email: 'joana@' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'email', message: signUpMessages.emailInvalid },
    ]);
  });

  it('recusa e-mail com mais de 254 caracteres', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
    expect(signUpSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it('aponta um item por campo recusado, na ordem do formulário', () => {
    const result = signUpSchema.safeParse({ email: 'x', password: 'abc' });
    expect(result.success).toBe(false);
    expect(toSignUpFieldErrors(result.error!)).toEqual([
      { field: 'name', message: signUpMessages.nameRequired },
      { field: 'email', message: signUpMessages.emailInvalid },
      { field: 'password', message: rule },
    ]);
  });
});

describe('signUpErrorCodes', () => {
  it('expõe os códigos do cadastro', () => {
    expect(signUpErrorCodes.validation).toBe('VALIDATION_ERROR');
    expect(signUpErrorCodes.userAlreadyExists).toBe('USER_ALREADY_EXISTS');
  });
});

describe('resendVerificationEmailSchema', () => {
  it('aceita e-mail válido e o devolve em minúsculas', () => {
    const result = resendVerificationEmailSchema.safeParse({
      email: ' Lia@Example.com ',
    });
    expect(result.success && result.data).toEqual({ email: 'lia@example.com' });
  });

  it('recusa e-mail inválido ou ausente com a mensagem de e-mail', () => {
    for (const body of [{ email: 'lia@' }, { email: '' }, {}]) {
      const result = resendVerificationEmailSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        signUpMessages.emailInvalid,
      );
    }
  });
});

describe('mensagens da confirmação', () => {
  it('usa nos estados vencido e inválido as mensagens das respostas de erro', () => {
    expect(verifyEmailStates.expired.text).toBe(
      verifyEmailMessages.tokenExpired,
    );
    expect(verifyEmailStates.invalid.text).toBe(
      verifyEmailMessages.invalidToken,
    );
    expect(verifyEmailCodes).toEqual({
      tokenExpired: 'TOKEN_EXPIRED',
      invalidToken: 'INVALID_TOKEN',
      userNotFound: 'USER_NOT_FOUND',
      alreadyVerified: 'ALREADY_VERIFIED',
    });
  });
});

describe('requestPasswordResetSchema', () => {
  it('aceita e-mail válido e o devolve em minúsculas', () => {
    const result = requestPasswordResetSchema.safeParse({
      email: ' Rosa@Example.com ',
    });
    expect(result.success && result.data).toEqual({
      email: 'rosa@example.com',
    });
  });

  it('recusa e-mail inválido ou ausente com a mensagem de e-mail', () => {
    for (const body of [{ email: 'abc' }, { email: '' }, {}]) {
      const result = requestPasswordResetSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        signUpMessages.emailInvalid,
      );
    }
  });
});

describe('resetPasswordSchema', () => {
  it('aceita o token e a nova senha dentro da regra', () => {
    const body = { token: 'Xk3abc', newPassword: 'Nova12345' };
    const result = resetPasswordSchema.safeParse(body);
    expect(result.success && result.data).toEqual(body);
  });

  it.each(['semnumero', '12345678', 'Nova123'])(
    'recusa a nova senha %s com a regra no campo newPassword',
    (newPassword) => {
      const result = resetPasswordSchema.safeParse({
        token: 'Xk3abc',
        newPassword,
      });
      expect(result.success).toBe(false);
      expect(toResetPasswordFieldErrors(result.error!)).toEqual([
        { field: 'newPassword', message: rule },
      ]);
    },
  );

  it('recusa token vazio ou ausente sem apontá-lo como campo do formulário', () => {
    for (const body of [
      { token: '', newPassword: 'Nova12345' },
      { newPassword: 'Nova12345' },
    ]) {
      const result = resetPasswordSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        resetPasswordMessages.invalidToken,
      );
      expect(toResetPasswordFieldErrors(result.error!)).toEqual([]);
    }
  });
});

describe('resetPasswordFormSchema', () => {
  it('aceita a nova senha dentro da regra repetida na confirmação', () => {
    const form = { newPassword: 'Nova12345', confirmPassword: 'Nova12345' };
    const result = resetPasswordFormSchema.safeParse(form);
    expect(result.success && result.data).toEqual(form);
  });

  it('recusa senhas diferentes com a mensagem no campo de confirmação', () => {
    const result = resetPasswordFormSchema.safeParse({
      newPassword: 'Nova12345',
      confirmPassword: 'Nova54321',
    });
    expect(result.success).toBe(false);
    expect(toResetPasswordFieldErrors(result.error!)).toEqual([
      { field: 'confirmPassword', message: 'As senhas não conferem.' },
    ]);
  });

  it('recusa a nova senha fora da regra com a regra no campo da nova senha', () => {
    const result = resetPasswordFormSchema.safeParse({
      newPassword: 'semnumero',
      confirmPassword: 'semnumero',
    });
    expect(result.success).toBe(false);
    expect(toResetPasswordFieldErrors(result.error!)).toEqual([
      { field: 'newPassword', message: rule },
    ]);
  });

  it('aponta a regra e a diferença juntas, na ordem da tela', () => {
    const result = resetPasswordFormSchema.safeParse({
      confirmPassword: 'Nova123',
      newPassword: 'Nova12',
    });
    expect(result.success).toBe(false);
    expect(toResetPasswordFieldErrors(result.error!)).toEqual([
      { field: 'newPassword', message: rule },
      { field: 'confirmPassword', message: 'As senhas não conferem.' },
    ]);
  });
});

describe('textos da recuperação', () => {
  it('expõe os códigos das respostas', () => {
    expect(resetPasswordCodes).toEqual({
      validation: 'VALIDATION_ERROR',
      invalidToken: 'INVALID_TOKEN',
      userNotFound: 'USER_NOT_FOUND',
    });
  });

  it('usa os textos dos estados das duas telas', () => {
    expect(requestPasswordResetStates.form.title).toBe('Recuperar a senha');
    expect(requestPasswordResetStates.sent.text).toBe(
      'Se o e-mail tiver conta, enviamos o link.',
    );
    expect(resetPasswordStates.form.title).toBe('Definir nova senha');
    expect(resetPasswordStates.changed).toEqual({
      title: 'Senha alterada',
      text: 'Sua senha foi trocada. Entre com a nova senha.',
    });
    expect(resetPasswordStates.invalid).toEqual({
      title: 'Link inválido',
      text: 'Este link não vale mais. Peça outro link.',
    });
    expect(resetPasswordMessages.tooManyRequests).toBe(
      'Muitas tentativas. Tente de novo em alguns instantes.',
    );
    expect(resetPasswordMessages.serverUnavailable).toBe(
      'O servidor não respondeu. Tente de novo.',
    );
  });
});
