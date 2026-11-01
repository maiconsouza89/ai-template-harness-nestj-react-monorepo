import {
  resetPasswordFields,
  resetPasswordMessages,
  resetPasswordStates,
  type ResetPasswordField,
} from '@app/contracts';
import { useEffect, useRef } from 'react';
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { AlertIcon } from '../../components/alert-icon.js';
import type {
  ResetPasswordFieldErrors,
  ResetPasswordResult,
} from './action.js';
import type { ResetPasswordLoaderData } from './loader.js';

/** Estado que a tela mostra: o do loader, trocado pelo resultado da `action` quando ele decide. */
export type ResetPasswordView = 'form' | 'changed' | 'invalid' | 'unavailable';

/**
 * Junta a checagem do loader e o resultado da troca. A troca aceita vira "Senha alterada" e o
 * link recusado na troca vira "Link inválido"; erro de campo, limite e servidor fora mantêm o
 * formulário. Sem troca, vale o estado do loader.
 */
export function resetPasswordView(
  loaderState: ResetPasswordLoaderData['state'],
  result: ResetPasswordResult | undefined,
): ResetPasswordView {
  if (result?.status === 'changed') {
    return 'changed';
  }
  if (result?.status === 'invalid-token') {
    return 'invalid';
  }
  return loaderState;
}

interface FieldProps {
  name: ResetPasswordField;
  label: string;
  error: string | undefined;
}

/** Campo de senha `text-input` com rótulo visível e o erro em preto e branco logo abaixo. */
function PasswordField({ name, label, error }: FieldProps) {
  const id = `redefinir-senha-${name}`;
  const errorId = `${id}-erro`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-body-md-strong">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete="new-password"
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
  );
}

/** Aviso de limite ou de servidor fora da troca, em `card-soft-tinted` (DESIGN.md). */
function ResetNotice({ result }: { result: ResetPasswordResult | undefined }) {
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

/** Formulário "Nova senha" e "Confirme a nova senha", enviado para a `action` da própria rota. */
function ResetForm({ result }: { result: ResetPasswordResult | undefined }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useNavigation().state === 'submitting';
  const fieldErrors: ResetPasswordFieldErrors =
    result?.status === 'invalid' ? result.fieldErrors : {};

  // Foco no primeiro campo recusado, na ordem do formulário.
  useEffect(() => {
    const form = formRef.current;
    if (!form || result?.status !== 'invalid') {
      return;
    }
    const first = resetPasswordFields.find(
      (field) => result.fieldErrors[field],
    );
    if (first) {
      (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
    }
  }, [result]);

  return (
    <>
      <ResetNotice result={result} />
      <Form
        ref={formRef}
        method="post"
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <PasswordField
          name="newPassword"
          label="Nova senha"
          error={fieldErrors.newPassword}
        />
        <PasswordField
          name="confirmPassword"
          label="Confirme a nova senha"
          error={fieldErrors.confirmPassword}
        />
        <button
          type="submit"
          className="btn-primary mt-2 w-full"
          disabled={submitting}
        >
          Salvar a nova senha
        </button>
      </Form>
    </>
  );
}

/**
 * Tela `/redefinir-senha?token=`: com o link dentro do prazo, o formulário da nova senha; depois
 * da troca, "Senha alterada" com o botão "Entrar"; com o link que não vale, ao abrir ou ao salvar,
 * "Link inválido" com o botão "Pedir outro link"; com a API fora ao abrir, o aviso de servidor
 * fora sem os campos e sem a página de erro.
 */
export function ResetPasswordRoute() {
  const { state } = useLoaderData() as ResetPasswordLoaderData;
  const result = useActionData() as ResetPasswordResult | undefined;
  const view = resetPasswordView(state, result);

  return (
    <section className="page-gutter py-8">
      <div className="card-content mx-auto w-full max-w-[490px]">
        {view === 'form' ? (
          <>
            <h1 className="text-display-lg">
              {resetPasswordStates.form.title}
            </h1>
            <ResetForm result={result} />
          </>
        ) : null}
        {view === 'unavailable' ? (
          <>
            <h1 className="text-display-lg">
              {resetPasswordStates.form.title}
            </h1>
            <div role="alert" className="card-soft-tinted mt-6">
              <p>{resetPasswordMessages.serverUnavailable}</p>
            </div>
          </>
        ) : null}
        {view === 'changed' ? (
          <>
            <h1 className="text-display-lg">
              {resetPasswordStates.changed.title}
            </h1>
            <p role="status" className="mt-4">
              {resetPasswordStates.changed.text}
            </p>
            <p className="mt-6">
              <Link to="/entrar" className="btn-primary">
                Entrar
              </Link>
            </p>
          </>
        ) : null}
        {view === 'invalid' ? (
          <>
            <h1 className="text-display-lg">
              {resetPasswordStates.invalid.title}
            </h1>
            <p role="status" className="mt-4">
              {resetPasswordStates.invalid.text}
            </p>
            <p className="mt-6">
              <Link to="/recuperar-senha" className="btn-secondary">
                Pedir outro link
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
