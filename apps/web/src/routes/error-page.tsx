import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ApiUnavailableError } from '../lib/http.js';

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

  return (
    <main role="alert">
      <h1>{text.title}</h1>
      <p>{text.detail}</p>
      <p>
        <a href="/">Voltar ao início</a>
      </p>
    </main>
  );
}
