import type { Role, SessionResponse } from '@app/contracts';

/**
 * Resposta de `GET /api/v1/session`, a mesma forma do `sessionResponseSchema` de Contratos.
 * Classe, e não o tipo inferido do Zod, porque o plugin CLI do `@nestjs/swagger` (ADR-0020) só
 * gera o esquema do documento a partir de classes em arquivos `*.dto.ts`.
 */
export class SessionResponseDto implements SessionResponse {
  /** Id da conta da sessão. */
  userId: string;

  /** Papel da conta: `user` ou `admin`. */
  role: Role;
}
