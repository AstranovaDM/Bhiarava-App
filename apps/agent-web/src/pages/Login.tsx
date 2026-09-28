import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Btn, BrandWordmark, Field, GoogleSignInButton, Panel, TextInput } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';
import { LOGO_SRC } from '../basePath';
import { Notice } from '../components/RecordList';
import { errorMessage } from '../lib/format';

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID_AGENT
  || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID
  || '';
const DEV_BYPASS = String((import.meta as any).env?.VITE_GOOGLE_AUTH_DEV_BYPASS || '') === 'true'
  && (import.meta as any).env?.PROD !== true;

export function LoginPage() {
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onCredential = useCallback(
    async (idToken: string) => {
      setErr('');
      setBusy(true);
      try {
        const s = await api.auth.googleAgent(idToken);
        await acceptSession(s);
        const needsProfile = Boolean((s.user as any)?.needsProfile ?? !(s.user as any)?.profileComplete);
        nav(needsProfile ? '/onboarding' : '/');
      } catch (ex) {
        setErr(errorMessage(ex) || 'Google sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [nav],
  );

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_22%,transparent),transparent)]"
      />
      <div aria-hidden className="hairline-gold pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2" />

      <div className="rise relative w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent portal" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="rise sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Continue with Google</h1>
          <p className="pt-1 text-sm text-muted-foreground">
            Open signup — no Admin approval. Complete your profile to get an agent code and go Active.
          </p>
          <div className="mt-6 space-y-4">
            <GoogleSignInButton
              clientId={GOOGLE_CLIENT_ID || undefined}
              onCredential={onCredential}
              disabled={busy}
              allowDevBypass={DEV_BYPASS || !GOOGLE_CLIENT_ID}
              devEmail="new.agent@example.com"
              devName="New Agent"
              label="Continue with Google"
            />
            {err ? <Notice tone="error">{err}</Notice> : null}
          </div>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Your session is held in memory and renewed through a secure HTTP-only cookie.
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function AgentOnboardingPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.auth.restoreSession();
        const r = await api.auth.me();
        if (cancelled) return;
        setEmail(r.user.email || '');
        setName(r.user.displayName || '');
        if ((r.user as any).profileComplete) nav('/', { replace: true });
      } catch {
        if (!cancelled) nav('/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await api.auth.completeAgentProfile({
        name,
        phone: phone || undefined,
        region: region || undefined,
        termsAccepted: terms,
      });
      nav('/', { state: { agentCode: res.agentCode } });
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size={44} title="Bhairava" subtitle="Agent profile" />
        </div>
        <Panel>
          <h1 className="font-display text-2xl font-semibold">Activate your agent account</h1>
          <p className="pt-1 text-sm text-muted-foreground">Email is locked to Google. You receive an agent code immediately — no Admin approval.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <TextInput value={email} onChange={() => {}} disabled />
            </Field>
            <Field label="Name" required>
              <TextInput value={name} onChange={setName} required />
            </Field>
            <Field label="Mobile">
              <TextInput type="tel" value={phone} onChange={setPhone} inputMode="tel" />
            </Field>
            <Field label="Region">
              <TextInput value={region} onChange={setRegion} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
              <span>I accept the Bhairava agent terms.</span>
            </label>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Btn type="submit" variant="primary" className="w-full" disabled={busy || !terms}>
              {busy ? 'Activating…' : 'Go Active'}
            </Btn>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="hover:underline">Back</Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
