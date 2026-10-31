import type { Job, JobState, Queue } from 'bullmq';

/**
 * Espera o job `id` de `queue` chegar ao estado `state`, lendo o Valkey a cada 100 ms; lança com o
 * último estado visto se o prazo vencer.
 */
export async function waitForJobState(
  queue: Queue,
  id: string,
  state: JobState,
  timeoutMs = 10_000,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  let last: JobState | 'unknown' | 'missing' = 'missing';
  while (Date.now() < deadline) {
    const job = await queue.getJob(id);
    if (job) {
      last = await job.getState();
      if (last === state) return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Job ${id} de ${queue.name} não chegou a ${state} em ${timeoutMs} ms (último: ${last})`,
  );
}
