import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
// Inter auto-hospedada (ADR-0028) antes dos tokens do DESIGN.md (ADR-0027).
import '@fontsource-variable/inter/wght.css';
import './styles/app.css';
import { signUpAction } from './routes/cadastro/action.js';
import { SignUpRoute } from './routes/cadastro/route.js';
import { verifyEmailAction } from './routes/confirmar-email/action.js';
import {
  shouldRevalidateVerifyEmail,
  verifyEmailLoader,
} from './routes/confirmar-email/loader.js';
import { VerifyEmailRoute } from './routes/confirmar-email/route.js';
import { ErrorPage } from './routes/error-page.js';
import { HomeRoute } from './routes/home/route.js';
import { rootLoader } from './routes/root/loader.js';
import { RootRoute } from './routes/root/route.js';

/** Mostrado enquanto o `loader` da rota raiz lê a sessão na primeira carga. */
function LoadingPage() {
  return (
    <main aria-busy="true" className="page-gutter py-8">
      <p>Carregando…</p>
    </main>
  );
}

// Roteador em modo data (ADR-0004). Cada RF pendura as próprias rotas em `children`.
export const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    Component: RootRoute,
    HydrateFallback: LoadingPage,
    loader: rootLoader,
    errorElement: <ErrorPage />,
    children: [
      { index: true, Component: HomeRoute },
      { path: 'cadastro', Component: SignUpRoute, action: signUpAction },
      {
        path: 'confirmar-email',
        Component: VerifyEmailRoute,
        loader: verifyEmailLoader,
        action: verifyEmailAction,
        shouldRevalidate: shouldRevalidateVerifyEmail,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
