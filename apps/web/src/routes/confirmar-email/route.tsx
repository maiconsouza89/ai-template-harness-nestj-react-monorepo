import { verifyEmailMessages, verifyEmailStates } from '@app/contracts';
import { useEffect, useRef, useState } from 'react';
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
 * Mostra o aviso de link enviado no lugar do campo: só depois de um reenvio com 200 que a pessoa
 * ainda não dispensou com "Enviar para outro e-mail". Cada reenvio devolve um resultado novo, então
 * o aviso volta no reenvio seguinte.
 */
export function showsResendSent(
  result: VerifyEmailResendResult | undefined,
  dismissed: VerifyEmailResendResult | undefined,
): boolean {
  return result?.status === 'sent' && result !== dismissed;
}

/** Aviso genérico do reenvio, com o botão que volta ao campo (spec, Contratos de interface). */
export function ResendSent({ onAnotherEmail }: { onAnotherEmail: () => void }) {
  return (
    <div className="mt-6">
      <p role="status">{verifyEmailMessages.resendSent}</p>
      <button
        type="button"
        className="btn-secondary mt-6"
        onClick={onAnotherEmail}
      >
        Enviar para outro e-mail
      </button>
    </div>
  );
}

/**
 * Reenvio do link nos estados de link vencido e que não vale: campo "E-mail" e botão "Reenviar o
 * link". Depois do 200, o aviso genérico ocupa o lugar do campo, com o botão "Enviar para outro
 * e-mail", que volta ao campo com o e-mail digitado; o limite de reenvios continua na API.
 */
function ResendForm() {
  const fetcher = useFetcher<VerifyEmailResendResult>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [dismissed, setDismissed] = useState<VerifyEmailResendResult>();
  const sending = fetcher.state !== 'idle';
  const result = sending ? undefined : fetcher.data;
  const error = result?.status === 'invalid' ? result.error : undefined;

  useEffect(() => {
    if (result?.status === 'invalid') {
      inputRef.current?.focus();
    }
  }, [result]);

  // De volta ao campo pelo "Enviar para outro e-mail": o foco vai para o e-mail digitado.
  useEffect(() => {
    if (dismissed) {
      inputRef.current?.focus();
    }
  }, [dismissed]);

  if (showsResendSent(result, dismissed)) {
    return <ResendSent onAnotherEmail={() => setDismissed(result)} />;
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
