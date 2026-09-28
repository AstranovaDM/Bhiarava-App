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
/** Dev bypass ONLY when explicitly enabled AND not a production build. Never because client ID is missing. */
const DEV_BYPASS =
  String((import.meta as any).env?.VITE_GOOGLE_AUTH_DEV_BYPASS || '') === 'true'
  && (import.meta as any).env?.PROD !== true
  && (import.meta as any).env?.MODE !== 'production';

export function LoginPage() {
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const googleConfigured = Boolean(GOOGLE_CLIENT_ID);

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
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary-luminous)_18%,transparent),transparent)]"
      />

      <div className="rise relative w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent portal" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Continue with Google</h1>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Open signup — no Admin approval. Complete your profile (including mobile) to get an agent code and go Active.
          </p>
          <div className="mt-6 space-y-4">
            {googleConfigured || DEV_BYPASS ? (
              <GoogleSignInButton
                clientId={GOOGLE_CLIENT_ID || undefined}
                onCredential={onCredential}
                disabled={busy}
                allowDevBypass={DEV_BYPASS}
                requireClientIdInProduction
                unavailableMessage="Google sign-in is temporarily unavailable. Please contact Bhairava."
                devEmail="new.agent@example.com"
                devName="New Agent"
                label="Continue with Google"
              />
            ) : (
              <p
                role="status"
                className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm text-foreground"
                data-testid="google-unavailable"
              >
                Google sign-in is temporarily unavailable. Please contact Bhairava.
              </p>
            )}
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
    if (!phone.trim()) {
      setErr('Mobile number is required');
      setBusy(false);
      return;
    }
    if (!region.trim()) {
      setErr('City / region is required');
      setBusy(false);
      return;
    }
    try {
      const res = await api.auth.completeAgentProfile({
        name,
        phone: phone.trim(),
        region: region.trim(),
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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="rise relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandWordmark size={52} title="Bhairava" subtitle="Agent profile" logoSrc={LOGO_SRC} />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Complete your profile</h1>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Full name, Google email, mobile, and city/region are required. No OTP. You go Active immediately — no Admin approval.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Full name" required>
              <TextInput value={name} onChange={setName} required autoComplete="name" data-testid="agent-profile-name" />
            </Field>
            <Field label="Google email">
              <TextInput value={email} onChange={() => {}} disabled data-testid="agent-profile-email" />
            </Field>
            <Field label="Mobile number" required>
              <TextInput
                type="tel"
                value={phone}
                onChange={setPhone}
                required
                inputMode="tel"
                placeholder="10-digit mobile"
                data-testid="agent-profile-mobile"
              />
            </Field>
            <Field label="City / region" required>
              <TextInput
                value={region}
                onChange={setRegion}
                required
                placeholder="City or region"
                data-testid="agent-profile-region"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
                data-testid="agent-profile-terms"
              />
              <span>I accept the Bhairava agent terms.</span>
            </label>
            {err ? <Notice tone="error">{err}</Notice> : null}
            <Btn type="submit" variant="primary" className="h-11 w-full" disabled={busy || !terms} data-testid="agent-profile-submit">
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
