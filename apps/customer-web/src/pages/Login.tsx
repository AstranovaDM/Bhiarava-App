import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Btn, BrandWordmark, GoogleSignInButton, Panel } from '@bhairava/ui-web';
import { acceptSession, api } from '../api';

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID_CUSTOMER
  || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID
  || '';
const DEV_BYPASS = String((import.meta as any).env?.VITE_GOOGLE_AUTH_DEV_BYPASS || '') === 'true'
  && (import.meta as any).env?.PROD !== true;

export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') || undefined;
  const [err, setErr] = useState('');
  const [inviteMeta, setInviteMeta] = useState<{ valid: boolean; agentName?: string; reason?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    api.invites
      .peek(inviteToken)
      .then((meta) => {
        if (!cancelled) setInviteMeta(meta);
      })
      .catch(() => {
        if (!cancelled) setInviteMeta({ valid: false, reason: 'invalid' });
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const onCredential = useCallback(
    async (idToken: string) => {
      setErr('');
      setSubmitting(true);
      try {
        const s = await api.auth.googleCustomer(idToken, inviteToken);
        await acceptSession(s);
        const needsProfile = Boolean((s.user as any)?.needsProfile ?? !(s.user as any)?.profileComplete);
        nav(needsProfile ? `/onboarding${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ''}` : '/');
      } catch (ex: any) {
        setErr(ex?.message || 'Google sign-in failed');
      } finally {
        setSubmitting(false);
      }
    },
    [inviteToken, nav],
  );

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary-luminous)_18%,transparent),transparent)]"
      />
      <div aria-hidden className="hairline-gold pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2" />

      <div className="rise relative w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={52} title="Bhairava" subtitle="Customer portal" />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Continue with Google</h1>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Sign in or create your Bhairava customer account with Google. Email stays locked to your Google account.
          </p>
          {inviteMeta?.valid ? (
            <p className="mt-4 rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
              Invited by <span className="font-medium">{inviteMeta.agentName}</span>. Complete Google sign-in to connect.
            </p>
          ) : null}
          {inviteMeta && !inviteMeta.valid ? (
            <p className="mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              This invite is {inviteMeta.reason || 'unavailable'}. You can still continue with Google as a Direct customer.
            </p>
          ) : null}
          <div className="space-y-5 pt-6">
            <GoogleSignInButton
              clientId={GOOGLE_CLIENT_ID || undefined}
              onCredential={onCredential}
              disabled={submitting}
              allowDevBypass={DEV_BYPASS || !GOOGLE_CLIENT_ID}
              label="Continue with Google"
            />
            {err ? (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {err}
              </p>
            ) : null}
          </div>
        </Panel>
        <p className="pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Returning customers skip profile setup. New accounts become Active after a short profile form.
        </p>
      </div>
    </div>
  );
}

export function CustomerOnboardingPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') || undefined;
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [referralCode, setReferralCode] = useState('');
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
        if ((r.user as any).profileComplete || (r.user as any).profileComplete === true) {
          nav('/', { replace: true });
        }
      } catch {
        if (!cancelled) nav('/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.auth.completeCustomerProfile({
        name,
        mobile,
        city: city || undefined,
        referralCode: referralCode || undefined,
        termsAccepted: terms,
        inviteToken,
      });
      nav('/');
    } catch (ex: any) {
      setErr(ex?.message || 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center pb-8">
          <BrandWordmark size={44} title="Bhairava" subtitle="Complete profile" />
        </div>
        <Panel className="sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Your details</h1>
          <p className="pt-2 text-sm text-muted-foreground">Mobile is required. Email comes from Google and cannot be changed.</p>
          <form className="space-y-4 pt-6" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="text-muted-foreground">Email</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-muted/40 px-3" value={email} readOnly disabled />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Name</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Mobile</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3" value={mobile} onChange={(e) => setMobile(e.target.value)} required inputMode="tel" placeholder="10-digit mobile" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">City (optional)</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Referral code (optional)</span>
              <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
              <span>I accept the Bhairava terms of use and privacy notice.</span>
            </label>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Btn type="submit" variant="primary" className="h-11 w-full" disabled={busy || !terms}>
              {busy ? 'Saving…' : 'Activate account'}
            </Btn>
          </form>
          <p className="pt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="underline-offset-2 hover:underline">Back to sign-in</Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
