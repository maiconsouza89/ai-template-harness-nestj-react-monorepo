import { resetPasswordMessages } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { ResetPasswordResult } from './action.js';
import {
  shouldRevalidateResetPassword,
  type ResetPasswordLoaderData,
} from './loader.js';
import { ResetPasswordRoute, resetPasswordView } from './route.js';

const url = '/redefinir-senha?token=abc';

/** Roteador em memória com o loader e a action dublês e o `shouldRevalidate` da rota. */
async function open(
  state: ResetPasswordLoaderData['state'],
  result?: ResetPasswordResult,
) {
  const loader = vi.fn(() => ({ state }));
  const action = vi.fn(() => result ?? { status: 'changed' });
  const router = createMemoryRouter(
    [
      {
        path: '/redefinir-senha',
        Component: ResetPasswordRoute,
        loader,
        action,
        shouldRevalidate: shouldRevalidateResetPassword,
      },
    ],
    { initialEntries: [url] },
  );
  await router.navigate(url);
  return { router, loader, action };
}

async function save(router: Awaited<ReturnType<typeof open>>['router']) {
  const formData = new FormData();
  formData.set('newPassword', 'Nova12345');
  formData.set('confirmPassword', 'Nova12345');
  await router.navigate(url, { formMethod: 'post', formData });
}

function render(router: Awaited<ReturnType<typeof open>>['router']) {
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('resetPasswordView', () => {
  it('segue o loader sem troca e com erro de campo, limite ou servidor fora', () => {
    expect(resetPasswordView('form', undefined)).toBe('form');
    expect(resetPasswordView('invalid', undefined)).toBe('invalid');
    expect(resetPasswordView('unavailable', undefined)).toBe('unavailable');
    expect(
      resetPasswordView('form', { status: 'invalid', fieldErrors: {} }),
    ).toBe('form');
    expect(resetPasswordView('form', { status: 'too-many' })).toBe('form');
    expect(resetPasswordView('form', { status: 'unavailable' })).toBe('form');
  });

  it('a troca aceita vira senha alterada e o link recusado vira link inválido', () => {
    expect(resetPasswordView('form', { status: 'changed' })).toBe('changed');
    expect(resetPasswordView('form', { status: 'invalid-token' })).toBe(
      'invalid',
    );
  });
});

describe('ResetPasswordRoute', () => {
  it('com o link válido mostra os dois campos de senha com rótulo e o botão', async () => {
    const { router } = await open('form');
    const html = render(router);

    expect(html).toContain('Definir nova senha');
    expect(html).toContain('for="redefinir-senha-newPassword"');
    expect(html).toContain('Nova senha');
    expect(html).toContain('for="redefinir-senha-confirmPassword"');
    expect(html).toContain('Confirme a nova senha');
    expect(html.match(/type="password"/g)).toHaveLength(2);
    expect(html.match(/autoComplete="new-password"/gi)).toHaveLength(2);
    expect(html).toContain('Salvar a nova senha');
    expect(html).toContain('btn-primary');
  });

  it('depois da action com sucesso continua em "Senha alterada" sem refazer a checagem', async () => {
    const { router, loader, action } = await open('form');
    const checks = loader.mock.calls.length;

    await save(router);
    const html = render(router);

    expect(action).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(checks);
    expect(html).toContain('Senha alterada');
    expect(html).toContain('href="/entrar"');
    expect(html).toContain('Entrar');
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain('Link inválido');
  });

  it('com o link recusado na troca mostra "Link inválido" e "Pedir outro link"', async () => {
    const { router, loader } = await open('form', { status: 'invalid-token' });
    const checks = loader.mock.calls.length;

    await save(router);
    const html = render(router);

    expect(loader).toHaveBeenCalledTimes(checks);
    expect(html).toContain('Link inválido');
    expect(html).toContain(resetPasswordMessages.invalidToken);
    expect(html).toContain('href="/recuperar-senha"');
    expect(html).toContain('Pedir outro link');
    expect(html).not.toContain('Senha alterada');
  });

  it('mostra os erros de campo com aria-invalid e mantém os dois campos', async () => {
    const { router } = await open('form', {
      status: 'invalid',
      fieldErrors: { confirmPassword: resetPasswordMessages.passwordMismatch },
    });

    await save(router);
    const html = render(router);

    expect(html).toContain(resetPasswordMessages.passwordMismatch);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(
      'aria-describedby="redefinir-senha-confirmPassword-erro"',
    );
    expect(html.match(/type="password"/g)).toHaveLength(2);
  });

  it('com o link que não vale ao abrir mostra "Pedir outro link" sem os campos', async () => {
    const { router } = await open('invalid');
    const html = render(router);

    expect(html).toContain('Link inválido');
    expect(html).toContain('href="/recuperar-senha"');
    expect(html).toContain('btn-secondary');
    expect(html).not.toContain('type="password"');
  });

  it('com a API fora ao abrir mostra o aviso de servidor fora sem os campos', async () => {
    const { router } = await open('unavailable');
    const html = render(router);

    expect(html).toContain('role="alert"');
    expect(html).toContain(resetPasswordMessages.serverUnavailable);
    expect(html).not.toContain('type="password"');
  });
});
