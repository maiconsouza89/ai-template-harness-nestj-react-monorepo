import { Link, useRouteLoaderData } from 'react-router';
import type { RootLoaderData } from '../root/loader.js';

/**
 * Página inicial, rota `index` da raiz: o estado da sessão da fundação e, sem sessão, o caminho
 * para o cadastro. Com a API fora já na primeira leitura, o loader da raiz devolve a sessão
 * anônima com `unavailable`, e esta rota lança o erro para a página de erro da raiz, em vez de
 * dizer que não há sessão aberta (RF-002, UI-FALHA-02). As outras rotas filhas decidem sozinhas
 * o que mostrar nesse caso.
 */
export function HomeRoute() {
  const { session, unavailable } = useRouteLoaderData('root') as RootLoaderData;

  if (unavailable) {
    throw unavailable;
  }

  return (
    <section className="page-gutter py-8">
      <h1 className="text-display-lg">App</h1>
      {session === null ? (
        <>
          <p className="mt-2">Nenhuma sessão aberta.</p>
          <p className="mt-2">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="text-link">
              Cadastre-se
            </Link>
            .
          </p>
        </>
      ) : (
        <p className="mt-2">
          Sessão aberta com o papel <strong>{session.role}</strong>.
        </p>
      )}
    </section>
  );
}
