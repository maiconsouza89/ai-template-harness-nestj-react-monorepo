import { probeHealth } from './health-indicator.js';

describe('probeHealth', () => {
  it('devolve up quando a sonda resolve dentro do prazo', async () => {
    await expect(probeHealth(async () => 'PONG', 100)).resolves.toBe('up');
  });

  it('devolve down quando a sonda rejeita', async () => {
    await expect(
      probeHealth(() => Promise.reject(new Error('ECONNREFUSED')), 100),
    ).resolves.toBe('down');
  });

  it('devolve down quando a sonda não responde no prazo', async () => {
    await expect(
      probeHealth(() => new Promise<never>(() => undefined), 20),
    ).resolves.toBe('down');
  });
});
