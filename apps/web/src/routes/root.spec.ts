import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiUnavailableError } from '../lib/http.js';
import { createRootLoader } from './root/loader.js';

describe('rootLoader', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let rootLoader: ReturnType<typeof createRootLoader>;

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    vi.stubGlobal('fetch', fetchMock);
    rootLoader = createRootLoader();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('devolve o estado anônimo com 401', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(rootLoader()).resolves.toEqual({ session: null });
  });

  it('devolve a sessão com 200', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ userId: 'Yp3m2', role: 'admin' }, { status: 200 }),
    );

    await expect(rootLoader()).resolves.toEqual({
      session: { userId: 'Yp3m2', role: 'admin' },
    });
  });

  it('chama GET /api/v1/session em VITE_API_URL enviando o cookie', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await rootLoader();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/session',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('lança ApiUnavailableError quando a rede falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(rootLoader()).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('mantém a última sessão lida quando a releitura não alcança a API', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ userId: 'Yp3m2', role: 'admin' }, { status: 200 }),
    );
    await rootLoader();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(rootLoader()).resolves.toEqual({
      session: { userId: 'Yp3m2', role: 'admin' },
    });
  });

  it('mantém o estado anônimo na releitura sem API, qualquer que seja a action anterior', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await rootLoader();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(rootLoader()).resolves.toEqual({ session: null });
  });

  it('lança o status como erro de rota quando a API responde outro erro', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(rootLoader()).rejects.toMatchObject({ status: 500 });
  });
});
