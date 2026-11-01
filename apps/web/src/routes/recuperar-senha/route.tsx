import {
  requestPasswordResetStates,
  resetPasswordMessages,
} from '@app/contracts';
import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { AlertIcon } from '../../components/alert-icon.js';
import type { RequestPasswordResetResult } from './action.js';

/** Aviso de limite ou de servidor fora do pedido, em `card-soft-tinted` (DESIGN.md). */
function RequestNotice({
  result,
}: {
  result: RequestPasswordResetResult | undefined;
}) {
  let message: string | null = null;
  if (result?.status === 'too-many') {
    message = resetPasswordMessages.tooManyRequests;
  } else if (result?.status === 'unavailable') {
    message = resetPasswordMessages.serverUnavailable;
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
 * Mostra o aviso neutro no lugar do campo: só depois de um pedido com 200 que a pessoa ainda não
 * dispensou com "Enviar para outro e-mail". Cada pedido devolve um resultado novo, então o aviso
 * volta no pedido seguinte.
 */
export function showsRequestSent(
  result: RequestPasswordResetResult | undefined,
  dismissed: RequestPasswordResetResult | undefined,
): boolean {
  return result?.status === 'sent' && result !== dismissed;
}

/** Aviso neutro do pedido, o mesmo com e sem conta, com o botão que volta ao campo. */
export function RequestSent({
  onAnotherEmail,
}: {
  onAnotherEmail: () => void;
}) {
  return (
    <div className="mt-6">
      <p role="status">{requestPasswordResetStates.sent.text}</p>
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
 * Tela `/recuperar-senha`: campo "E-mail" e botão "Enviar o link". Depois do 200, com e sem conta,
 * o aviso neutro ocupa o lugar do campo, com o botão "Enviar para outro e-mail", que volta ao
 * campo com o e-mail digitado; o limite de pedidos continua na API.
 */
export function RequestPasswordResetRoute() {
  const fetcher = useFetcher<RequestPasswordResetResult>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [dismissed, setDismissed] = useState<RequestPasswordResetResult>();
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

  const id = 'recuperar-senha-email';
  const errorId = `${id}-erro`;
  return (
    <section className="page-gutter py-8">
      <div className="card-content mx-auto w-full max-w-[490px]">
        <h1 className="text-display-lg">
          {requestPasswordResetStates.form.title}
        </h1>
        {showsRequestSent(result, dismissed) ? (
          <RequestSent onAnotherEmail={() => setDismissed(result)} />
        ) : (
          <>
            <RequestNotice result={result} />
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
                className="btn-primary mt-2 w-full"
                disabled={sending}
              >
                Enviar o link
              </button>
            </fetcher.Form>
          </>
        )}
      </div>
    </section>
  );
}
