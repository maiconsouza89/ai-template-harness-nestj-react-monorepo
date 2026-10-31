import { signUpErrorMessages, type SignUpField } from '@app/contracts';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useNavigation,
} from 'react-router';
import { AlertIcon } from '../../components/alert-icon.js';
import type {
  ResendResult,
  SignUpFieldErrors,
  SignUpResult,
} from './action.js';

const fieldOrder: readonly SignUpField[] = ['name', 'email', 'password'];

interface FieldProps {
  name: SignUpField;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  error: string | undefined;
}

/** Campo `text-input` com rótulo visível e o erro em preto e branco logo abaixo (DESIGN.md). */
function Field({ name, label, type, autoComplete, error }: FieldProps) {
  const id = `cadastro-${name}`;
  const errorId = `${id}-erro`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-body-md-strong">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
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

/** Aviso que não é de um campo, acima do formulário, em `card-soft-tinted`. */
function ServerNotice({ result }: { result: SignUpResult | undefined }) {
  let content: ReactNode = null;
  if (result?.status === 'exists') {
    content = (
      <>
        <p>{signUpErrorMessages.userAlreadyExists}</p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link to="/entrar" className="btn-secondary">
            Entrar
          </Link>
          <Link to="/recuperar-senha" className="btn-secondary">
            Recuperar a senha
          </Link>
        </p>
      </>
    );
  } else if (result?.status === 'too-many') {
    content = <p>{signUpErrorMessages.tooManyRequests}</p>;
  } else if (result?.status === 'unavailable') {
    content = <p>{signUpErrorMessages.serverUnavailable}</p>;
  }
  if (content === null) {
    return null;
  }
  return (
    <div role="alert" className="card-soft-tinted mt-6">
      {content}
    </div>
  );
}

function SignUpForm({ result }: { result: SignUpResult | undefined }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useNavigation().state === 'submitting';
  const fieldErrors: SignUpFieldErrors =
    result?.status === 'invalid' ? result.fieldErrors : {};

  useEffect(() => {
    const form = formRef.current;
    if (!form || !result) {
      return;
    }
    if (result.status === 'invalid') {
      // Foco no primeiro campo recusado, na ordem do formulário.
      const first = fieldOrder.find((field) => result.fieldErrors[field]);
      if (first) {
        (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      }
    } else if (result.status === 'unavailable') {
      // Servidor fora: nome e e-mail ficam, a senha digitada é descartada (spec, Tratamento de erros).
      const password = form.elements.namedItem(
        'password',
      ) as HTMLInputElement | null;
      if (password) {
        password.value = '';
      }
    }
  }, [result]);

  return (
    <>
      <ServerNotice result={result} />
      <Form
        ref={formRef}
        method="post"
        noValidate
        className="mt-6 flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="sign-up" />
        <Field
          name="name"
          label="Nome"
          type="text"
          autoComplete="name"
          error={fieldErrors.name}
        />
        <Field
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <button
          type="submit"
          className="btn-primary mt-2 w-full"
          disabled={submitting}
        >
          Criar conta
        </button>
      </Form>
    </>
  );
}

function resendMessage(
  result: ResendResult | undefined,
  email: string,
): string {
  switch (result?.status) {
    case 'resent':
      return `Enviamos um novo link para ${email}.`;
    case 'too-many':
      return signUpErrorMessages.tooManyRequests;
    case 'unavailable':
      return signUpErrorMessages.serverUnavailable;
    default:
      return '';
  }
}

/** Depois do cadastro aceito: o e-mail informado e o reenvio, sempre visível (spec, Decisões). */
function LinkSent({ email }: { email: string }) {
  const fetcher = useFetcher<ResendResult>();
  const sending = fetcher.state !== 'idle';

  return (
    <>
      <p className="mt-4">
        Enviamos um link de confirmação para <strong>{email}</strong>. Confirme
        o e-mail antes de entrar.
      </p>
      <fetcher.Form method="post" className="mt-6">
        <input type="hidden" name="intent" value="resend" />
        <input type="hidden" name="email" value={email} />
        <button type="submit" className="btn-secondary" disabled={sending}>
          Reenviar o link
        </button>
      </fetcher.Form>
      <p role="status" className="mt-4 text-body-sm">
        {sending ? '' : resendMessage(fetcher.data, email)}
      </p>
    </>
  );
}

/** Tela `/cadastro`: o formulário no card de autenticação e, depois do 200, o link enviado. */
export function SignUpRoute() {
  const result = useActionData() as SignUpResult | undefined;
  const sent = result?.status === 'sent' ? result : undefined;

  return (
    <section className="page-gutter py-8">
      <div className="card-content mx-auto w-full max-w-[490px]">
        <h1 className="text-display-lg">
          {sent ? 'Confirme seu e-mail' : 'Crie sua conta'}
        </h1>
        {sent ? (
          <LinkSent email={sent.email} />
        ) : (
          <SignUpForm result={result} />
        )}
      </div>
    </section>
  );
}
