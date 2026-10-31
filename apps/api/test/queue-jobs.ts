import type { Job, JobState, Queue } from 'bullmq';

/**
 * Espera o job `id` de `queue` chegar ao estado `state`, lendo o Valkey a cada 100 ms; lança com o
 * último estado visto se o prazo vencer.
 *
 * Lê o estado antes do job: o job devolvido é lido depois de o estado bater, então num estado
 * final (`completed`, `failed`) ele já traz os campos finais (`attemptsMade`, `returnvalue`).
 * Na ordem inversa, o worker podia terminar a última tentativa entre as duas leituras e o job
 * voltava com os campos da tentativa anterior.
 */
export async function waitForJobState(
  queue: Queue,
  id: string,
  state: JobState,
  timeoutMs = 10_000,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  let last: JobState | 'unknown' = 'unknown';
  while (Date.now() < deadline) {
    last = await queue.getJobState(id);
    if (last === state) {
      const job = await queue.getJob(id);
      if (job) return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Job ${id} de ${queue.name} não chegou a ${state} em ${timeoutMs} ms (último: ${last})`,
  );
}
