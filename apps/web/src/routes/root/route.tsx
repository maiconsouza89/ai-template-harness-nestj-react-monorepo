import { Link, useLoaderData, useOutlet } from 'react-router';
import { NavBar } from '../../components/nav-bar.js';
import type { RootLoaderData } from './loader.js';

/** Página inicial: o estado da sessão da fundação e, sem sessão, o caminho para o cadastro. */
function HomeContent({ session }: RootLoaderData) {
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

/** Layout da rota raiz: a barra de navegação no topo e, abaixo, a tela filha ou a página inicial. */
export function RootRoute() {
  const data = useLoaderData() as RootLoaderData;
  const outlet = useOutlet();

  return (
    <>
      <NavBar anonymous={data.session === null} />
      <main>{outlet ?? <HomeContent session={data.session} />}</main>
    </>
  );
}
