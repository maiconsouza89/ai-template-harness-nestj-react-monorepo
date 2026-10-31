import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiUnavailableError } from '../lib/http.js';
import { rootLoader, rootShouldRevalidate } from './root/loader.js';

describe('rootLoader', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    vi.stubGlobal('fetch', fetchMock);
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

  it('lança o status como erro de rota quando a API responde outro erro', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(rootLoader()).rejects.toMatchObject({ status: 500 });
  });
});

describe('rootShouldRevalidate', () => {
  it('não relê a sessão depois da action do cadastro', () => {
    expect(
      rootShouldRevalidate({
        formAction: '/cadastro',
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });

  it('segue o padrão do roteador nas demais navegações', () => {
    expect(
      rootShouldRevalidate({
        formAction: undefined,
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
  });
});
