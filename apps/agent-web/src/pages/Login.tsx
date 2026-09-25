import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Btn, BrandWordmark, Field, Panel, TextInput } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';
import { Notice } from '../components/RecordList';
import { errorMessage } from '../lib/format';

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const s = await api.auth.login(email, password);
      await acceptSession(s);
      nav('/');
    } catch (ex) {
      setErr(errorMessage(ex) || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size={44} title="Bhairava" subtitle="Agent portal" />
        </div>
        <Panel className="rise">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Sign in</h1>
          <p className="pt-1 text-sm text-muted-foreground">Use the credentials issued to your agent account.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" required>
              <TextInput
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="username"
                required
                data-testid="agent-email"
              />
            </Field>
            <Field label="Password" required>
              <TextInput
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
                data-testid="agent-password"
              />
            </Field>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Btn type="submit" variant="primary" className="w-full" disabled={busy} data-testid="agent-login">
              {busy ? 'Signing in…' : 'Sign in'}
            </Btn>
          </form>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Your session is held in memory and renewed through a secure HTTP-only cookie.
          </p>
        </Panel>
      </div>
    </div>
  );
}
