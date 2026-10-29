import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ErrorPage } from './routes/error-page.js';
import { rootLoader } from './routes/root/loader.js';
import { RootRoute } from './routes/root/route.js';

// Roteador em modo data (ADR-0004). Cada RF pendura as próprias rotas em `children`.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootRoute,
    loader: rootLoader,
    errorElement: <ErrorPage />,
    children: [],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
