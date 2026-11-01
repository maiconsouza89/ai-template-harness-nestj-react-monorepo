import { DEFAULT_THREADPOOL_SIZE, ensureThreadpoolSize } from './threadpool.js';

describe('ensureThreadpoolSize', () => {
  it('define o tamanho padrão quando o ambiente não traz UV_THREADPOOL_SIZE', () => {
    const env: NodeJS.ProcessEnv = {};
    ensureThreadpoolSize(env);
    expect(env.UV_THREADPOOL_SIZE).toBe(String(DEFAULT_THREADPOOL_SIZE));
  });

  it('mantém o valor que o ambiente já definiu', () => {
    const env: NodeJS.ProcessEnv = { UV_THREADPOOL_SIZE: '8' };
    ensureThreadpoolSize(env);
    expect(env.UV_THREADPOOL_SIZE).toBe('8');
  });

  it('deixa o padrão acima das quatro threads do Node', () => {
    expect(DEFAULT_THREADPOOL_SIZE).toBeGreaterThan(4);
  });
});
