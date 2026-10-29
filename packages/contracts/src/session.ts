import { z } from 'zod';

/** Papéis de conta do PRD: usuário comum e administrador. */
export const roleSchema = z.enum(['user', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/** Resposta de `GET /api/v1/session`: a conta da sessão e o papel dela. */
export const sessionResponseSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
