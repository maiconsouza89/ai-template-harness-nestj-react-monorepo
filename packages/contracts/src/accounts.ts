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
  const first = new Map<SignUpField, string>();
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === 'string' &&
      (signUpFields as readonly string[]).includes(field) &&
      !first.has(field as SignUpField)
    ) {
      first.set(field as SignUpField, issue.message);
    }
  }
  return signUpFields
    .filter((field) => first.has(field))
    .map((field) => ({ field, message: first.get(field) as string }));
}
