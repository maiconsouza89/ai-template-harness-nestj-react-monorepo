import { z } from 'zod';

/**
 * Regra de cadastro do RF-001 (spec, "Regras e fluxos"), compartilhada pela SPA, que valida o
 * formulário antes de chamar a API, e pelo hook antes do cadastro da API, que valida o corpo de
 * `POST /api/auth/sign-up/email`. Os textos e códigos de erro ficam aqui para os dois lados
 * mostrarem as mesmas mensagens.
 */

/** Limites da regra: nome depois de tirar os espaços das pontas, e-mail e senha. */
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Mensagens em pt-BR dos campos do cadastro. */
export const signUpMessages = {
  nameRequired: 'Informe o seu nome.',
  nameTooLong: `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
  emailInvalid: 'Informe um e-mail válido.',
  passwordRule: `A senha precisa ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres, com pelo menos uma letra e um número.`,
  passwordTooLong: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
} as const;

/** Códigos de erro do cadastro, no campo `code` do corpo da resposta. */
export const signUpErrorCodes = {
  /** 400: corpo fora do esquema, com a lista `fields`. */
  validation: 'VALIDATION_ERROR',
  /** 422: e-mail já cadastrado, em qualquer combinação de maiúsculas. */
  userAlreadyExists: 'USER_ALREADY_EXISTS',
  /** 422: corrida entre dois cadastros com o mesmo e-mail, barrada pela constraint única. */
  failedToCreateUser: 'FAILED_TO_CREATE_USER',
} as const;
export type SignUpErrorCode =
  (typeof signUpErrorCodes)[keyof typeof signUpErrorCodes];

/** Mensagens em pt-BR das respostas de erro do cadastro e dos avisos da tela. */
export const signUpErrorMessages = {
  validation: 'Confira os campos destacados.',
  userAlreadyExists: 'Este e-mail já tem conta. Entre ou recupere a senha.',
  tooManyRequests: 'Muitas tentativas. Tente de novo em alguns instantes.',
  serverUnavailable: 'O servidor não respondeu. Tente de novo.',
} as const;

/**
 * Senha: no mínimo 8 caracteres, ao menos uma letra e ao menos um número (PRD, Decisão regra de
 * senha), no máximo 128, o teto padrão do Better Auth. Fora da regra, a mensagem é a regra
 * inteira. RF-005 e RF-007 aplicam o mesmo esquema à senha nova.
 */
export const passwordSchema = z
  .string({ error: signUpMessages.passwordRule })
  .min(PASSWORD_MIN_LENGTH, { error: signUpMessages.passwordRule })
  .max(PASSWORD_MAX_LENGTH, { error: signUpMessages.passwordTooLong })
  .regex(/\p{L}/u, { error: signUpMessages.passwordRule })
  .regex(/\p{Nd}/u, { error: signUpMessages.passwordRule });

/**
 * E-mail válido, com no máximo 254 caracteres, comparado e gravado em minúsculas:
 * `Ana@Example.com` é o mesmo e-mail que `ana@example.com`.
 */
export const emailSchema = z
  .string({ error: signUpMessages.emailInvalid })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: signUpMessages.emailInvalid })
      .max(EMAIL_MAX_LENGTH, { error: signUpMessages.emailInvalid }),
  );

/** Corpo de `POST /api/auth/sign-up/email` e campos do formulário de `/cadastro`. */
export const signUpSchema = z.object({
  name: z
    .string({ error: signUpMessages.nameRequired })
    .trim()
    .min(1, { error: signUpMessages.nameRequired })
    .max(NAME_MAX_LENGTH, { error: signUpMessages.nameTooLong }),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUp = z.output<typeof signUpSchema>;

/** Campo do cadastro recusado e a mensagem a mostrar para ele. */
export type SignUpField = keyof SignUp;
export interface FieldError {
  field: SignUpField;
  message: string;
}

/** Corpo da resposta 400 `VALIDATION_ERROR` do cadastro. */
export interface SignUpValidationErrorBody {
  code: typeof signUpErrorCodes.validation;
  message: string;
  fields: FieldError[];
}

/** Campos do cadastro na ordem do formulário: a dos erros e a do foco no primeiro inválido. */
export const signUpFields: readonly SignUpField[] = [
  'name',
  'email',
  'password',
];

/**
 * Converte os problemas do `signUpSchema` na lista `fields` da resposta 400: um item por campo
 * recusado, com a primeira mensagem dele, na ordem do formulário (nome, e-mail, senha).
 */
export function toSignUpFieldErrors(error: z.ZodError): FieldError[] {
  return firstMessagePerField(error, signUpFields);
}

/**
 * Confirmação de e-mail do RF-002 (spec, Contratos de interface): códigos das respostas de
 * `GET /api/auth/verify-email`, textos dos estados da tela `/confirmar-email` e do reenvio por
 * `POST /api/auth/send-verification-email`. A API devolve os códigos e as mensagens de erro, e a
 * SPA mostra os mesmos textos; RF-003 reaproveita o reenvio na tela de conta pendente.
 */

/** Códigos da confirmação, no campo `code` do corpo da resposta. */
export const verifyEmailCodes = {
  /** 401: o registro do link venceu (`expiresAt` no passado), ou o JWT venceu na biblioteca. */
  tokenExpired: 'TOKEN_EXPIRED',
  /** 401: link sem registro (já usado, trocado por reenvio, adulterado) ou de conta inexistente. */
  invalidToken: 'INVALID_TOKEN',
  /** 401 da própria biblioteca, quando a conta do token não existe; a SPA trata como link inválido. */
  userNotFound: 'USER_NOT_FOUND',
  /** 200: a conta do link já estava ativa; nada muda. */
  alreadyVerified: 'ALREADY_VERIFIED',
} as const;
export type VerifyEmailCode =
  (typeof verifyEmailCodes)[keyof typeof verifyEmailCodes];

/** Mensagens em pt-BR das respostas de erro da confirmação e dos avisos do reenvio. */
export const verifyEmailMessages = {
  tokenExpired: 'Este link expirou. Peça um novo link abaixo.',
  invalidToken: 'Este link não vale mais. Peça um novo link abaixo.',
  resendSent: 'Se o e-mail tiver uma conta pendente, enviamos um novo link.',
  tooManyRequests: signUpErrorMessages.tooManyRequests,
  serverUnavailable: signUpErrorMessages.serverUnavailable,
} as const;

/** Título e texto de cada estado da tela `/confirmar-email`. */
export const verifyEmailStates = {
  verified: { title: 'E-mail confirmado', text: 'Sua conta está ativa.' },
  alreadyVerified: {
    title: 'Conta já confirmada',
    text: 'Esta conta já está confirmada.',
  },
  expired: { title: 'Link expirado', text: verifyEmailMessages.tokenExpired },
  invalid: { title: 'Link inválido', text: verifyEmailMessages.invalidToken },
} as const;
export type VerifyEmailState = keyof typeof verifyEmailStates;

/** Corpo 200 do hook quando a conta já está ativa. */
export interface AlreadyVerifiedBody {
  status: true;
  code: typeof verifyEmailCodes.alreadyVerified;
}

/** Corpo 401 da confirmação recusada pelo hook. */
export interface VerifyEmailErrorBody {
  code:
    typeof verifyEmailCodes.tokenExpired | typeof verifyEmailCodes.invalidToken;
  message: string;
}

/** Corpo de `POST /api/auth/send-verification-email` e campo do reenvio na tela. */
export const resendVerificationEmailSchema = z.object({ email: emailSchema });
export type ResendVerificationEmailInput = z.input<
  typeof resendVerificationEmailSchema
>;
export type ResendVerificationEmail = z.output<
  typeof resendVerificationEmailSchema
>;

/**
 * Recuperação de senha do RF-005 (spec, Contratos de interface): corpos de
 * `POST /api/auth/request-password-reset` e `POST /api/auth/reset-password`, o formulário da tela
 * `/redefinir-senha` com a confirmação da senha, os códigos das respostas e os textos dos estados
 * das telas `/recuperar-senha` e `/redefinir-senha`. O hook da API valida a troca com o mesmo
 * esquema da SPA, e as duas pontas mostram os mesmos textos.
 */

/** Códigos da recuperação, no campo `code` do corpo da resposta. */
export const resetPasswordCodes = {
  /** 400 do hook antes de `/reset-password`: nova senha fora da regra, com a lista `fields`. */
  validation: signUpErrorCodes.validation,
  /** 400: link vencido, já usado, trocado por novo pedido, inválido ou de conta que não existe mais. */
  invalidToken: 'INVALID_TOKEN',
  /** 400 da própria biblioteca, quando a conta do registro sumiu; a SPA trata como link inválido. */
  userNotFound: 'USER_NOT_FOUND',
} as const;
export type ResetPasswordCode =
  (typeof resetPasswordCodes)[keyof typeof resetPasswordCodes];

/** Mensagens em pt-BR das respostas de erro e dos avisos da recuperação. */
export const resetPasswordMessages = {
  /** Aviso neutro do pedido, o mesmo com e sem conta. */
  requestSent: 'Se o e-mail tiver conta, enviamos o link.',
  invalidToken: 'Este link não vale mais. Peça outro link.',
  passwordMismatch: 'As senhas não conferem.',
  validation: signUpErrorMessages.validation,
  tooManyRequests: signUpErrorMessages.tooManyRequests,
  serverUnavailable: signUpErrorMessages.serverUnavailable,
} as const;

/** Título e texto de cada estado da tela `/recuperar-senha`. */
export const requestPasswordResetStates = {
  form: { title: 'Recuperar a senha' },
  sent: { title: 'Recuperar a senha', text: resetPasswordMessages.requestSent },
} as const;
export type RequestPasswordResetState = keyof typeof requestPasswordResetStates;

/** Título e texto de cada estado da tela `/redefinir-senha`. */
export const resetPasswordStates = {
  form: { title: 'Definir nova senha' },
  changed: {
    title: 'Senha alterada',
    text: 'Sua senha foi trocada. Entre com a nova senha.',
  },
  invalid: { title: 'Link inválido', text: resetPasswordMessages.invalidToken },
} as const;
export type ResetPasswordState = keyof typeof resetPasswordStates;

/** Corpo de `POST /api/auth/request-password-reset` e campo da tela `/recuperar-senha`. */
export const requestPasswordResetSchema = z.object({ email: emailSchema });
export type RequestPasswordResetInput = z.input<
  typeof requestPasswordResetSchema
>;
export type RequestPasswordReset = z.output<typeof requestPasswordResetSchema>;

/** Token do link de recuperação: texto não vazio; o resto da conferência é do registro. */
export const resetPasswordTokenSchema = z
  .string({ error: resetPasswordMessages.invalidToken })
  .min(1, { error: resetPasswordMessages.invalidToken });

/** Corpo de `POST /api/auth/reset-password`: o token do link e a nova senha pela regra. */
export const resetPasswordSchema = z.object({
  token: resetPasswordTokenSchema,
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPassword = z.output<typeof resetPasswordSchema>;

/**
 * Campos do formulário de `/redefinir-senha`: a nova senha pela regra e a confirmação igual a
 * ela. A igualdade é conferida só na SPA, com a mensagem no campo de confirmação; ela é
 * conferida também quando a nova senha fica fora da regra, para a tela mostrar os dois erros.
 */
export const resetPasswordFormSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string({
      error: resetPasswordMessages.passwordMismatch,
    }),
  })
  .refine(
    ({ newPassword, confirmPassword }) => newPassword === confirmPassword,
    {
      path: ['confirmPassword'],
      error: resetPasswordMessages.passwordMismatch,
    },
  );
export type ResetPasswordFormInput = z.input<typeof resetPasswordFormSchema>;
export type ResetPasswordForm = z.output<typeof resetPasswordFormSchema>;

/** Campo do formulário de nova senha recusado e a mensagem a mostrar para ele. */
export type ResetPasswordField = keyof ResetPasswordForm;
export interface ResetPasswordFieldError {
  field: ResetPasswordField;
  message: string;
}

/** Campos do formulário de nova senha na ordem da tela. */
export const resetPasswordFields: readonly ResetPasswordField[] = [
  'newPassword',
  'confirmPassword',
];

/**
 * Converte os problemas do `resetPasswordFormSchema` ou do `resetPasswordSchema` numa lista com
 * um item por campo do formulário recusado, com a primeira mensagem dele, na ordem da tela. O
 * token não é campo do formulário e fica de fora.
 */
export function toResetPasswordFieldErrors(
  error: z.ZodError,
): ResetPasswordFieldError[] {
  return firstMessagePerField(error, resetPasswordFields);
}

/** Corpo da resposta 400 `VALIDATION_ERROR` do hook antes de `/reset-password`. */
export interface ResetPasswordValidationErrorBody {
  code: typeof resetPasswordCodes.validation;
  message: string;
  fields: { field: 'newPassword'; message: string }[];
}

/** Corpo 200 de `GET /api/auth/reset-password-status`: o link ainda vale. */
export interface ResetPasswordStatusBody {
  valid: true;
}

/** Corpo 400 `INVALID_TOKEN` de `GET /api/auth/reset-password-status`. */
export interface ResetPasswordInvalidTokenBody {
  code: typeof resetPasswordCodes.invalidToken;
  message: string;
}

/** Primeira mensagem de cada campo de `fields` que tem problema, na ordem de `fields`. */
function firstMessagePerField<F extends string>(
  error: z.ZodError,
  fields: readonly F[],
): { field: F; message: string }[] {
  const first = new Map<F, string>();
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === 'string' &&
      (fields as readonly string[]).includes(field) &&
      !first.has(field as F)
    ) {
      first.set(field as F, issue.message);
    }
  }
  return fields
    .filter((field) => first.has(field))
    .map((field) => ({ field, message: first.get(field) as string }));
}
