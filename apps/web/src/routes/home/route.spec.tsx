import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiUnavailableError } from '../../lib/http.js';
import type { RootLoaderData } from '../root/loader.js';
import { RootRoute } from '../root/route.js';
import { HomeRoute } from './route.js';

/**
 * Renderiza `/` com a rota raiz e a página inicial como rota `index`, sem DOM, pelo roteador em
 * memória. A renderização no servidor não tem limite de erro do React: o erro que a rota lança
 * para a página de erro sobe da própria renderização.
 */
async function renderHome(data: RootLoaderData): Promise<string> {
  const router = createMemoryRouter(
    [
      {
        id: 'root',
        path: '/',
        Component: RootRoute,
        loader: () => data,
        children: [{ index: true, Component: HomeRoute }],
      },
    ],
    { initialEntries: ['/'] },
  );
  await router.navigate('/');
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('HomeRoute (rota índice da raiz)', () => {
  it('sem sessão, mostra "Nenhuma sessão aberta." e o caminho para o cadastro', async () => {
    const html = await renderHome({ session: null });

    expect(html).toContain('Nenhuma sessão aberta.');
    expect(html).toContain('href="/cadastro"');
  });

  it('com sessão, mostra o papel', async () => {
    const html = await renderHome({
      session: { userId: 'Yp3m2', role: 'admin' },
    });

    expect(html).toContain('Sessão aberta com o papel');
    expect(html).not.toContain('Nenhuma sessão aberta.');
  });

  it('com a API fora na primeira leitura, lança o erro para a página de erro', async () => {
    const unavailable = new ApiUnavailableError(
      'http://api.test/api/v1/session',
    );

    await expect(renderHome({ session: null, unavailable })).rejects.toBe(
      unavailable,
    );
  });
});
