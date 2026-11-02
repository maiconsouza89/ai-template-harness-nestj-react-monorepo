import {
  resetPasswordCodes,
  resetPasswordMessages,
  resetPasswordSchema,
  type ResetPasswordStatusBody,
  type ResetPasswordValidationErrorBody,
} from '@app/contracts';
import type { BetterAuthPlugin } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
} from 'better-auth/api';
import { PASSWORD_RESET_IDENTIFIER_PREFIX } from '../../domain/password-reset-links.js';

/** Caminho da troca da senha, rota nativa, relativo ao `basePath` do Better Auth. */
export const RESET_PASSWORD_PATH = '/reset-password';

/** Caminho da checagem do link, endpoint deste plugin, relativo ao `basePath`. */
export const RESET_PASSWORD_STATUS_PATH = '/reset-password-status';

/** Só a nova senha do corpo da troca, pela regra de Contratos; o token é da biblioteca. */
const newPasswordSchema = resetPasswordSchema.pick({ newPassword: true });

/**
 * Forma do identificador gravado, sem o prefixo: o SHA-256 hexadecimal do token. Nenhum token
 * do Better Auth tem essa forma (`generateId(24)`, 24 caracteres alfanuméricos), e o
 * `findVerificationValue` e o `consumeVerificationValue` da biblioteca 1.7.14, quando não acham o
 * identificador com hash, tentam o identificador em texto puro: sem esta recusa, quem lesse a
 * tabela `verification` usaria o hash gravado como token, e o hash não protegeria nada.
 */
const STORED_HASH = /^[0-9a-f]{64}$/;

function invalidToken(): APIError {
  return new APIError('BAD_REQUEST', {
    code: resetPasswordCodes.invalidToken,
    message: resetPasswordMessages.invalidToken,
  });
}

/** Token que pode ser de um link: texto não vazio e sem a forma do hash gravado. */
function usableToken(token: unknown): token is string {
  return (
    typeof token === 'string' && token.length > 0 && !STORED_HASH.test(token)
  );
}

/** O que a regra da troca precisa da requisição. */
export interface ResetPasswordCheckInput {
  path: string | undefined;
  body: unknown;
  query: unknown;
}

/**
 * Regra da troca antes do Better Auth (spec, Regras e fluxos). Fora de `/reset-password` não faz
 * nada. Nova senha fora do `passwordSchema` de Contratos recusa com 400 `VALIDATION_ERROR` e o
 * campo `newPassword`, sem chegar à biblioteca: o link continua valendo e a senha não muda. Token
 * com a forma do hash gravado recusa com 400 `INVALID_TOKEN`. Token ausente segue, e a
 * biblioteca responde o `INVALID_TOKEN` nativo. Nenhuma resposta ecoa o corpo.
 */
export function checkResetPassword(input: ResetPasswordCheckInput): void {
  if (input.path !== RESET_PASSWORD_PATH) return;

  const body = (input.body ?? {}) as Record<string, unknown>;
  const parsed = newPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const fields: ResetPasswordValidationErrorBody['fields'] = [
      {
        field: 'newPassword',
        message:
          parsed.error.issues[0]?.message ?? resetPasswordMessages.validation,
      },
    ];
    throw new APIError('BAD_REQUEST', {
      code: resetPasswordCodes.validation,
      message: resetPasswordMessages.validation,
      fields,
    });
  }

  const token =
    body.token ?? (input.query as { token?: unknown } | undefined)?.token;
  if (token !== undefined && !usableToken(token)) throw invalidToken();
}

/** Registro de recuperação como o `internalAdapter` o devolve. */
export interface ResetPasswordVerification {
  value: string;
  expiresAt: Date;
}

/** O que a checagem do link precisa: o token e as buscas do `internalAdapter`. */
export interface ResetPasswordStatusInput {
  token: unknown;
  /** Busca pelo identificador `reset-password:<token>`, ao qual a biblioteca aplica o hash. */
  findVerification: (
    identifier: string,
  ) => Promise<ResetPasswordVerification | null>;
  findUserById: (id: string) => Promise<unknown>;
  now?: () => Date;
}

/**
 * Checagem do link ao abrir a tela (spec, Contratos de interface): 200 `{ valid: true }` com
 * registro dentro do prazo de conta que existe; 400 `INVALID_TOKEN` com registro vencido,
 * ausente, de conta que não existe mais, ou sem token. Não consome nem apaga o registro.
 */
export async function checkResetPasswordStatus(
  input: ResetPasswordStatusInput,
): Promise<ResetPasswordStatusBody> {
  const { token } = input;
  if (!usableToken(token)) throw invalidToken();

  const verification = await input.findVerification(
    `${PASSWORD_RESET_IDENTIFIER_PREFIX}${token}`,
  );
  const now = input.now?.() ?? new Date();
  if (!verification || verification.expiresAt.getTime() <= now.getTime()) {
    throw invalidToken();
  }
  if (!(await input.findUserById(verification.value))) throw invalidToken();
  return { valid: true };
}

/**
 * Plugin do Módulo Contas da recuperação de senha (ADR-0010; spec, Componentes e Decisões): o hook
 * antes de `/reset-password` aplica a regra de senha de Contratos, e o endpoint
 * `GET /reset-password-status` diz se o link ainda vale sem consumi-lo, porque a rota nativa
 * `GET /reset-password/:token` só redireciona. As buscas vão pelo `internalAdapter`, que aplica o
 * mesmo hash de `verification.storeIdentifier` que gravou o registro. Nada aqui escreve no log.
 */
export const createResetPasswordPlugin = () =>
  ({
    id: 'reset-password',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === RESET_PASSWORD_PATH,
          handler: createAuthMiddleware(async (ctx) => {
            checkResetPassword({
              path: ctx.path,
              body: ctx.body,
              query: ctx.query,
            });
          }),
        },
      ],
    },
    endpoints: {
      resetPasswordStatus: createAuthEndpoint(
        RESET_PASSWORD_STATUS_PATH,
        {
          method: 'GET',
          metadata: {
            openapi: {
              operationId: 'resetPasswordStatus',
              description:
                'Diz se o link de recuperação ainda vale, sem consumi-lo',
            },
          },
        },
        async (ctx) => {
          const adapter = ctx.context.internalAdapter;
          const body = await checkResetPasswordStatus({
            token: (ctx.query as { token?: unknown } | undefined)?.token,
            findVerification: (identifier) =>
              adapter.findVerificationValue(identifier),
            findUserById: (id) => adapter.findUserById(id),
          });
          return ctx.json(body);
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
