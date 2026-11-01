import type { Job, JobState, Queue } from 'bullmq';
import { waitForJobState } from '../queue-jobs.js';

/**
 * Fila falsa em que o worker termina a última tentativa logo depois da primeira leitura do
 * Valkey: o job sai do `delayed` com `attemptsMade` 1 para o `failed` com `attemptsMade` 2. Cada
 * leitura devolve uma cópia, como o `getJob` do BullMQ, que não acompanha o Valkey depois.
 */
function queueFinishingAfterFirstRead(): Queue {
  let stored = { state: 'delayed' as JobState, attemptsMade: 1 };
  let reads = 0;
  const read = () => {
    const snapshot = { ...stored };
    reads += 1;
    if (reads === 1) stored = { state: 'failed', attemptsMade: 2 };
    return snapshot;
  };
  return {
    name: 'fake',
    getJobState: async () => read().state,
    getJob: async () => {
      const { attemptsMade } = read();
      return {
        attemptsMade,
        getState: async () => read().state,
      } as unknown as Job;
    },
  } as unknown as Queue;
}

describe('waitForJobState', () => {
  it('devolve o job com os campos do estado esperado, mesmo se ele muda entre as leituras', async () => {
    const job = await waitForJobState(
      queueFinishingAfterFirstRead(),
      '1',
      'failed',
      2_000,
    );
    expect(job.attemptsMade).toBe(2);
  });
});
