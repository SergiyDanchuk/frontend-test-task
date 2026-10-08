import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/http';
import { firstErrorPerField } from '../utils/formErrors';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setFieldErrors({});
    setFormError('');

    try {
      await onLogin(email.trim(), password);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        const payload = cause.body?.error.payload ?? {};
        const visibleFields = new Set(['email', 'password']);
        const fieldErrors = firstErrorPerField(payload);

        setFieldErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).filter(([field]) =>
              visibleFields.has(field),
            ),
          ),
        );

        const unshownMessage = Object.entries(fieldErrors).find(
          ([field]) => !visibleFields.has(field),
        )?.[1];

        setFormError(unshownMessage ?? 'Перевірте введені дані.');
      } else {
        setFormError('Не вдалося увійти. Спробуйте ще раз.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <a className="brand login-brand" href="/" aria-label="Webhook Manager">
          <span className="brand-mark">W</span> Webhook Manager
        </a>

        <div className="login-heading">
          <span className="eyebrow">КОНСОЛЬ КЕРУВАННЯ</span>
          <h1 id="login-title">Раді вас бачити</h1>
          <p>Увійдіть, щоб керувати вебхуками.</p>
        </div>

        <form onSubmit={submit} noValidate>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            required
          />

          {fieldErrors.email && (
            <span className="field-error" id="email-error">
              {fieldErrors.email}
            </span>
          )}

          <label htmlFor="password">Пароль</label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Введіть пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'password-error' : undefined
            }
            required
          />

          {fieldErrors.password && (
            <span className="field-error" id="password-error">
              {fieldErrors.password}
            </span>
          )}

          {formError && (
            <div className="form-error" role="alert">
              {formError}
            </div>
          )}
          <button
            className="submit-button"
            type="submit"
            disabled={busy || !email || !password}
          >
            {busy ? 'Входимо…' : 'Увійти'}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="login-foot">
          <span className="lock-icon" aria-hidden="true">
            ⌑
          </span>{' '}
          Захищене з’єднання
        </div>
      </section>
    </main>
  );
}
