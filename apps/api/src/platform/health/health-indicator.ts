import { withTimeout } from '../async/with-timeout.js';

/** Estado de uma dependência externa, como sai no corpo de `GET /api/health`. */
export type HealthState = 'up' | 'down';

/** Tempo máximo de espera por uma dependência antes de declará-la `down`. */
export const HEALTH_TIMEOUT_MS = 1500;

/** Resolve `up` se `probe` resolver dentro do prazo; qualquer rejeição ou estouro vira `down`. */
export async function probeHealth(
  probe: () => Promise<unknown>,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<HealthState> {
  try {
    await withTimeout(probe(), timeoutMs, `sem resposta em ${timeoutMs} ms`);
    return 'up';
  } catch {
    return 'down';
  }
}
