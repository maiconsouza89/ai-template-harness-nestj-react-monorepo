import { Outlet, useLoaderData } from 'react-router';
import { NavBar } from '../../components/nav-bar.js';
import type { RootLoaderData } from './loader.js';

/**
 * Layout da rota raiz: a barra de navegação no topo e, abaixo, a tela filha, inclusive a página
 * inicial, que é a rota `index`. Com a API fora, a raiz só deixa a barra anônima; cada tela filha
 * decide o que mostrar.
 */
export function RootRoute() {
  const data = useLoaderData() as RootLoaderData;

  return (
    <>
      <NavBar anonymous={data.session === null} />
      <main>
        <Outlet />
      </main>
    </>
  );
}
