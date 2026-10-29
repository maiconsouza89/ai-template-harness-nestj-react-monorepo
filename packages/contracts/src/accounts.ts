import { z } from 'zod';

/** Limites da senha: 8 da regra do PRD e 128, o `maxPasswordLength` padrão do Better Auth. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Limite do nome, contado depois de tirar os espaços das pontas. */
export const NAME_MAX_LENGTH = 100;

/** Regra de senha do PRD, exibida pela tela e devolvida pela API no campo `password`. */
export const PASSWORD_RULE_MESSAGE =
  'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.';

/**
 * Senha de uma conta (cadastro, e depois nova senha na recuperação e na troca): de 8 a 128
 * caracteres, com pelo menos uma letra e um número. Toda violação da regra traz a mesma mensagem,
 * para a pessoa ver a regra inteira; só o excesso de tamanho tem mensagem própria.
 */
export const passwordSchema = z
  .string({ error: PASSWORD_RULE_MESSAGE })
  .min(PASSWORD_MIN_LENGTH, { error: PASSWORD_RULE_MESSAGE })
  .max(PASSWORD_MAX_LENGTH, {
    error: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  .regex(/\p{L}/u, { error: PASSWORD_RULE_MESSAGE })
  .regex(/\p{N}/u, { error: PASSWORD_RULE_MESSAGE });

const NAME_REQUIRED_MESSAGE = 'O nome é obrigatório.';
const EMAIL_REQUIRED_MESSAGE = 'O e-mail é obrigatório.';

/** Nome sem os espaços das pontas, de 1 a 100 caracteres. */
export const nameSchema = z
  .string({ error: NAME_REQUIRED_MESSAGE })
  .trim()
  .min(1, { error: NAME_REQUIRED_MESSAGE })
  .max(NAME_MAX_LENGTH, {
    error: `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
  });

/** E-mail sem os espaços das pontas e em minúsculas: `Ana@Example.com` e `ana@example.com` são o mesmo. */
export const emailSchema = z
  .string({ error: EMAIL_REQUIRED_MESSAGE })
  .trim()
  .toLowerCase()
  .min(1, { error: EMAIL_REQUIRED_MESSAGE })
  .pipe(z.email({ error: 'Informe um e-mail válido.' }));

/**
 * Cadastro por e-mail e senha (RF-001), aplicado pela tela `/cadastro` antes de enviar e pelo
 * hook `before` do Módulo Contas antes de o Better Auth gravar. A saída já vem normalizada.
 */
export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUp = z.output<typeof signUpSchema>;

/**
 * Códigos de erro do cadastro: `VALIDATION_ERROR` é do projeto, lançado pelo hook `before`;
 * `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` é o da própria biblioteca, reaproveitado.
 */
export const SIGN_UP_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
} as const;
export type SignUpErrorCode =
  (typeof SIGN_UP_ERROR_CODES)[keyof typeof SIGN_UP_ERROR_CODES];

/** Mensagem geral do 400 de cadastro; o detalhe vai em `fields`. */
export const SIGN_UP_VALIDATION_MESSAGE = 'Dados de cadastro inválidos.';

/** Um campo inválido e a mensagem que a tela mostra junto dele. */
export const fieldErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
});
export type FieldError = z.infer<typeof fieldErrorSchema>;

/** Corpo de erro da API: código, mensagem e, em `VALIDATION_ERROR`, uma entrada por campo. */
export const apiErrorBodySchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  fields: z.array(fieldErrorSchema).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/**
 * Reduz os erros de um esquema a uma entrada por campo, com a primeira mensagem de cada um, na
 * ordem em que aparecem. Só leva o caminho e a mensagem, nunca o valor recebido.
 */
export function fieldErrorsFrom(error: z.ZodError): FieldError[] {
  const fields = new Map<string, string>();
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.') || 'body';
    if (!fields.has(field)) fields.set(field, issue.message);
  }
  return [...fields].map(([field, message]) => ({ field, message }));
}
