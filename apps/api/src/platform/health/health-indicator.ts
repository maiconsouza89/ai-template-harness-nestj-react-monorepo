/** Estado de uma dependência externa, como sai no corpo de `GET /api/health`. */
export type HealthState = 'up' | 'down';

/** Tempo máximo de espera por uma dependência antes de declará-la `down`. */
export const HEALTH_TIMEOUT_MS = 1500;

/** Resolve `up` se `probe` resolver dentro do prazo; qualquer rejeição ou estouro vira `down`. */
export async function probeHealth(
  probe: () => Promise<unknown>,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<HealthState> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`sem resposta em ${timeoutMs} ms`)),
      timeoutMs,
    );
  });
  try {
    await Promise.race([probe(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}
