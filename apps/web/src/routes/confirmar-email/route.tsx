import { verifyEmailMessages, verifyEmailStates } from '@app/contracts';
import { useEffect, useRef } from 'react';
import { Link, useFetcher, useLoaderData } from 'react-router';
import { AlertIcon } from '../../components/alert-icon.js';
import type { VerifyEmailResendResult } from './action.js';
import type { VerifyEmailLoaderData } from './loader.js';

/** Título da tela quando a API não respondeu: não diz se a conta foi confirmada. */
const UNAVAILABLE_TITLE = 'Confirmação de e-mail';

/** Aviso de limite ou servidor fora do reenvio, em `card-soft-tinted` (DESIGN.md). */
function ResendNotice({
  result,
}: {
  result: VerifyEmailResendResult | undefined;
}) {
  let message: string | null = null;
  if (result?.status === 'too-many') {
    message = verifyEmailMessages.tooManyRequests;
  } else if (result?.status === 'unavailable') {
    message = verifyEmailMessages.serverUnavailable;
  }
  if (message === null) {
    return null;
  }
  return (
    <div role="alert" className="card-soft-tinted mt-6">
      <p>{message}</p>
    </div>
  );
}

/**
 * Reenvio do link nos estados de link vencido e que não vale: campo "E-mail" e botão "Reenviar o
 * link". Depois do 200, o aviso genérico ocupa o lugar do campo.
 */
function ResendForm() {
  const fetcher = useFetcher<VerifyEmailResendResult>();
  const inputRef = useRef<HTMLInputElement>(null);
  const sending = fetcher.state !== 'idle';
  const result = sending ? undefined : fetcher.data;
  const error = result?.status === 'invalid' ? result.error : undefined;

  useEffect(() => {
    if (result?.status === 'invalid') {
      inputRef.current?.focus();
    }
  }, [result]);

  if (result?.status === 'sent') {
    return (
      <p role="status" className="mt-6">
        {verifyEmailMessages.resendSent}
      </p>
    );
  }

  const id = 'confirmar-email-email';
  const errorId = `${id}-erro`;
  return (
    <>
      <ResendNotice result={result} />
      <fetcher.Form
        method="post"
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <div>
          <label htmlFor={id} className="mb-2 block text-body-md-strong">
            E-mail
          </label>
          <input
            ref={inputRef}
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            className="text-input"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p id={errorId} className="field-error">
              <AlertIcon />
              <span>{error}</span>
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          className="btn-secondary self-start"
          disabled={sending}
        >
          Reenviar o link
        </button>
      </fetcher.Form>
    </>
  );
}

/**
 * Tela `/confirmar-email?token=`: mostra o estado que o loader leu da confirmação. Conta ativada
 * ou já confirmada leva para entrar; link vencido ou que não vale oferece o reenvio; API fora
 * mostra o aviso de servidor fora sem dizer que confirmou.
 */
export function VerifyEmailRoute() {
  const { state } = useLoaderData() as VerifyEmailLoaderData;

  return (
    <section className="page-gutter py-8">
      <div className="card-content mx-auto w-full max-w-[490px]">
        {state === 'unavailable' ? (
          <>
            <h1 className="text-display-lg">{UNAVAILABLE_TITLE}</h1>
            <div role="alert" className="card-soft-tinted mt-6">
              <p>{verifyEmailMessages.serverUnavailable}</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-display-lg">
              {verifyEmailStates[state].title}
            </h1>
            <p role="status" className="mt-4">
              {verifyEmailStates[state].text}
            </p>
            {state === 'verified' || state === 'alreadyVerified' ? (
              <p className="mt-6">
                <Link to="/entrar" className="btn-primary">
                  Entrar
                </Link>
              </p>
            ) : (
              <ResendForm />
            )}
          </>
        )}
      </div>
    </section>
  );
}
