import { Outlet, useLoaderData } from 'react-router';
import type { RootLoaderData } from './loader.js';

export function RootRoute() {
  const { session } = useLoaderData() as RootLoaderData;

  return (
    <main>
      <h1>App</h1>
      {session === null ? (
        <p>Nenhuma sessão aberta.</p>
      ) : (
        <p>
          Sessão aberta com o papel <strong>{session.role}</strong>.
        </p>
      )}
      <Outlet />
    </main>
  );
}
