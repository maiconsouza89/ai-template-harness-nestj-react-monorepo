import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ErrorPage } from './routes/error-page.js';
import { rootLoader } from './routes/root/loader.js';
import { RootRoute } from './routes/root/route.js';
import { signUpAction } from './routes/sign-up/action.js';
import { SignUpRoute } from './routes/sign-up/route.js';

/** Mostrado enquanto o `loader` da rota raiz lê a sessão na primeira carga. */
function LoadingPage() {
  return (
    <main aria-busy="true">
      <p>Carregando…</p>
    </main>
  );
}

// Roteador em modo data (ADR-0004). Cada RF pendura as próprias rotas em `children`.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootRoute,
    HydrateFallback: LoadingPage,
    loader: rootLoader,
    errorElement: <ErrorPage />,
    children: [
      { path: 'cadastro', Component: SignUpRoute, action: signUpAction },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
