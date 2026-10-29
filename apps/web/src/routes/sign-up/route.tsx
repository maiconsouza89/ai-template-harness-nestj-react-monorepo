import { PASSWORD_RULE_MESSAGE } from '@app/contracts';
import { type Ref, useEffect, useRef } from 'react';
import { Form, Link, useActionData, useNavigation } from 'react-router';
import {
  RESEND_INTENT,
  SIGN_UP_MESSAGES,
  type SignUpActionData,
} from './action.js';

type FormState = Exclude<
  SignUpActionData,
  { status: 'success' | 'resent' | 'resend-failed' }
>;
type SuccessData = Extract<
  SignUpActionData,
  { status: 'success' | 'resent' | 'resend-failed' }
>;

interface FieldProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  error?: string;
  hint?: string;
  defaultValue?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** Campo com rótulo e, logo abaixo, a dica ou a mensagem de erro ligada por `aria-describedby`. */
function Field({
  id,
  label,
  type,
  autoComplete,
  error,
  hint,
  defaultValue,
  inputRef,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        ref={inputRef}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <>
          <br />
          <small id={`${id}-error`} role="alert">
            {error}
          </small>
        </>
      ) : hint ? (
        <>
          <br />
          <small id={`${id}-hint`}>{hint}</small>
        </>
      ) : null}
    </p>
  );
}

function SignUpForm({ data }: { data: FormState | undefined }) {
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';
  const passwordRef = useRef<HTMLInputElement>(null);
  const fields = data?.status === 'invalid' ? data.fields : {};

  // Depois de cada resposta os campos continuam preenchidos, menos a senha.
  useEffect(() => {
    if (data && passwordRef.current) passwordRef.current.value = '';
  }, [data]);

  return (
    <section aria-labelledby="sign-up-title">
      <h2 id="sign-up-title">Criar conta</h2>
      {data?.status === 'duplicate' ? (
        <div role="alert">
          <p>{SIGN_UP_MESSAGES.duplicate}</p>
          <p>
            <Link to="/entrar">Entrar</Link> ou{' '}
            <Link to="/recuperar-senha">Recuperar senha</Link>
          </p>
        </div>
      ) : null}
      {data?.status === 'failed' ? <p role="alert">{data.message}</p> : null}
      <Form method="post" noValidate>
        <Field
          id="name"
          label="Nome"
          type="text"
          autoComplete="name"
          defaultValue={data?.values.name}
          error={fields.name}
        />
        <Field
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          defaultValue={data?.values.email}
          error={fields.email}
        />
        <Field
          id="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          inputRef={passwordRef}
          hint={PASSWORD_RULE_MESSAGE}
          error={fields.password}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </button>
      </Form>
    </section>
  );
}

function SignUpSuccess({ data }: { data: SuccessData }) {
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';

  return (
    <section aria-labelledby="sign-up-success-title">
      <h2 id="sign-up-success-title">Confirme seu e-mail</h2>
      <p>
        Enviamos o link de confirmação para <strong>{data.email}</strong>.
      </p>
      <p>
        Você precisa confirmar o e-mail antes de entrar. O link vale por 24
        horas.
      </p>
      <Form method="post">
        <input type="hidden" name="intent" value={RESEND_INTENT} />
        <input type="hidden" name="email" value={data.email} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Reenviando…' : 'Reenviar link'}
        </button>
      </Form>
      {data.status === 'resent' ? (
        <p role="status">Link reenviado para {data.email}.</p>
      ) : null}
      {data.status === 'resend-failed' ? (
        <p role="alert">{data.message}</p>
      ) : null}
    </section>
  );
}

/** Tela `/cadastro` (RF-001): formulário até o cadastro dar certo, depois a tela de sucesso. */
export function SignUpRoute() {
  const data = useActionData() as SignUpActionData | undefined;

  if (
    data?.status === 'success' ||
    data?.status === 'resent' ||
    data?.status === 'resend-failed'
  ) {
    return <SignUpSuccess data={data} />;
  }
  return <SignUpForm data={data} />;
}
