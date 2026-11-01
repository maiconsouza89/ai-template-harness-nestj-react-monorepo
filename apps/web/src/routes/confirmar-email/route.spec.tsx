import { verifyEmailMessages } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { VerifyEmailResendResult } from './action.js';
import { ResendSent, showsResendSent, VerifyEmailRoute } from './route.js';

/** Renderiza a tela no estado `state` do loader, sem DOM, pelo roteador em memória. */
async function renderState(state: string): Promise<string> {
  const router = createMemoryRouter(
    [
      {
        path: '/confirmar-email',
        Component: VerifyEmailRoute,
        loader: () => ({ state }),
      },
    ],
    { initialEntries: ['/confirmar-email?token=abc'] },
  );
  await router.navigate('/confirmar-email?token=abc');
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('showsResendSent', () => {
  const sent: VerifyEmailResendResult = { status: 'sent' };

  it('mostra o aviso depois do reenvio com 200', () => {
    expect(showsResendSent(sent, undefined)).toBe(true);
  });

  it('"Enviar para outro e-mail" dispensa o aviso e volta ao campo', () => {
    expect(showsResendSent(sent, sent)).toBe(false);
  });

  it('um reenvio novo depois de voltar ao campo mostra o aviso de novo', () => {
    expect(showsResendSent({ status: 'sent' }, sent)).toBe(true);
  });

  it('não mostra o aviso sem reenvio, enviando ou com erro', () => {
    expect(showsResendSent(undefined, undefined)).toBe(false);
    expect(showsResendSent({ status: 'too-many' }, undefined)).toBe(false);
    expect(showsResendSent({ status: 'invalid', error: 'x' }, undefined)).toBe(
      false,
    );
  });
});

describe('ResendSent', () => {
  it('mostra o aviso genérico e o botão "Enviar para outro e-mail", sem o campo', () => {
    const html = renderToStaticMarkup(<ResendSent onAnotherEmail={() => {}} />);

    expect(html).toContain('role="status"');
    expect(html).toContain(verifyEmailMessages.resendSent);
    expect(html).toContain('Enviar para outro e-mail');
    expect(html).not.toContain('<input');
  });
});

describe('VerifyEmailRoute', () => {
  it('no link vencido mostra o campo "E-mail" vazio e o botão "Reenviar o link"', async () => {
    const html = await renderState('expired');

    expect(html).toContain('<label for="confirmar-email-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('value=""');
    expect(html).toContain('Reenviar o link');
    expect(html).not.toContain('Enviar para outro e-mail');
  });

  it('na conta ativada mostra "Entrar" sem o reenvio', async () => {
    const html = await renderState('verified');

    expect(html).toContain('href="/entrar"');
    expect(html).not.toContain('Reenviar o link');
  });
});
