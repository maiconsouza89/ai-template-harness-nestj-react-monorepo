import { resetPasswordMessages } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { RequestPasswordResetResult } from './action.js';
import {
  RequestPasswordResetRoute,
  RequestSent,
  showsRequestSent,
} from './route.js';

describe('showsRequestSent', () => {
  const sent: RequestPasswordResetResult = { status: 'sent' };

  it('mostra o aviso neutro depois do pedido com 200', () => {
    expect(showsRequestSent(sent, undefined)).toBe(true);
  });

  it('"Enviar para outro e-mail" dispensa o aviso e volta ao campo', () => {
    expect(showsRequestSent(sent, sent)).toBe(false);
  });

  it('um pedido novo depois de voltar ao campo mostra o aviso de novo', () => {
    expect(showsRequestSent({ status: 'sent' }, sent)).toBe(true);
  });

  it('não mostra o aviso sem pedido ou com erro', () => {
    expect(showsRequestSent(undefined, undefined)).toBe(false);
    expect(showsRequestSent({ status: 'too-many' }, undefined)).toBe(false);
    expect(showsRequestSent({ status: 'unavailable' }, undefined)).toBe(false);
    expect(showsRequestSent({ status: 'invalid', error: 'x' }, undefined)).toBe(
      false,
    );
  });
});

describe('RequestSent', () => {
  it('mostra o aviso neutro e o botão "Enviar para outro e-mail", sem o campo', () => {
    const html = renderToStaticMarkup(
      <RequestSent onAnotherEmail={() => {}} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain(resetPasswordMessages.requestSent);
    expect(html).toContain('Enviar para outro e-mail');
    expect(html).toContain('btn-secondary');
    expect(html).not.toContain('<input');
  });
});

describe('RequestPasswordResetRoute', () => {
  it('abre com o título, o campo "E-mail" com rótulo e o botão "Enviar o link"', async () => {
    const router = createMemoryRouter(
      [{ path: '/recuperar-senha', Component: RequestPasswordResetRoute }],
      { initialEntries: ['/recuperar-senha'] },
    );
    await router.navigate('/recuperar-senha');
    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain('Recuperar a senha');
    expect(html).toContain('for="recuperar-senha-email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('Enviar o link');
    expect(html).toContain('btn-primary');
    expect(html).not.toContain(resetPasswordMessages.requestSent);
  });
});
