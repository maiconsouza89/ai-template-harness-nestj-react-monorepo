/**
 * Corre `promise` contra um limite de `ms`: rejeita com `Error(timeoutMessage)` se o limite vencer
 * antes. A rejeição tardia de `promise`, depois do limite, fica tratada e não vira
 * `unhandledRejection`.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  promise.catch(() => undefined);
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
