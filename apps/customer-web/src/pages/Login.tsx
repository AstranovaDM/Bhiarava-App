import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, BrandWordmark, Field, Panel, TextInput } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';
import { LOGO_SRC } from '../basePath';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      const s = await api.auth.login(email, password);
      await acceptSession(s);
      nav('/');
    } catch (ex: any) {
      setErr(ex?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_22%,transparent),transparent)]"
      />
      <div aria-hidden className="hairline-gold pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2" />

      <div className="rise relative w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Customer portal" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Welcome back</h1>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Sign in to see your plots, bookings, payments and documents in one place.
          </p>
          <form className="space-y-5 pt-6" onSubmit={onSubmit} noValidate>
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setErr('');
                }}
                placeholder="you@example.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                data-testid="customer-email"
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setErr('');
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                data-testid="customer-password"
              />
            </Field>
            {err ? (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {err}
              </p>
            ) : null}
            <Btn type="submit" variant="primary" disabled={submitting} className="h-11 w-full" data-testid="customer-login">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Btn>
          </form>
        </Panel>
        <p className="pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Trouble signing in? Reach out to your Bhairava relationship manager.
        </p>
      </div>
    </div>
  );
}
