import {
  isRouteErrorResponse,
  Link,
  useRouteError,
  useRouteLoaderData,
} from 'react-router';
import { NavBar } from '../components/nav-bar.js';
import { ApiUnavailableError } from '../lib/http.js';
import type { RootLoaderData } from './root/loader.js';

interface ErrorText {
  title: string;
  detail: string;
}

function describe(error: unknown): ErrorText {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: 'Página não encontrada',
        detail: 'O endereço que você abriu não existe neste aplicativo.',
      };
    }
    return {
      title: 'O servidor respondeu com erro',
      detail: `Código ${error.status}${error.statusText ? `: ${error.statusText}` : ''}.`,
    };
  }
  if (error instanceof ApiUnavailableError) {
    return {
      title: 'O servidor não respondeu',
      detail:
        'Não foi possível falar com a API. Tente de novo em alguns instantes.',
    };
  }
  return {
    title: 'Algo deu errado',
    detail: error instanceof Error ? error.message : 'Erro inesperado.',
  };
}

export function ErrorPage() {
  const error = useRouteError();
  const text = describe(error);
  // A sessão só é conhecida quando o loader da raiz chegou a rodar; sem ela, a barra fica anônima.
  const root = useRouteLoaderData('root') as RootLoaderData | undefined;

  return (
    <>
      <NavBar anonymous={root?.session == null} />
      <main role="alert" className="page-gutter py-8">
        <h1 className="text-display-lg">{text.title}</h1>
        <p className="mt-2">{text.detail}</p>
        <p className="mt-6">
          <Link to="/" className="btn-secondary">
            Voltar ao início
          </Link>
        </p>
      </main>
    </>
  );
}
