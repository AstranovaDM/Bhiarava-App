import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, tokens } from './api';
import type { PlotSummary, ProjectSummary } from '@bhairava/api-client';

function useAuthed() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    (async () => {
      const t = await tokens.getAccessToken();
      setAuthed(!!t);
      setReady(true);
    })();
  }, []);
  return { ready, authed, setAuthed };
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@bhairava.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const session = await api.auth.login(email, password);
      await tokens.setTokens(session.accessToken, session.refreshToken ?? null ?? null);
      nav('/');
    } catch (ex: any) {
      setErr(ex?.message || 'Login failed');
    }
  }
  return (
    <div className="card login">
      <h1>Admin sign-in</h1>
      <p className="muted">Demo: admin@bhairava.demo / Demo@12345</p>
      <form onSubmit={onSubmit}>
        <label className="muted">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" />
        <label className="muted">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password" />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" data-testid="admin-login">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { ready, authed } = useAuthed();
  if (!ready) return <div className="main">Loading…</div>;
  if (!authed) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <strong>Bhairava Admin</strong>
        <p className="muted">Desktop-first production target</p>
        <Link to="/">Projects</Link>
        <Link to="/customers">Customers</Link>
        <Link to="/leads">Leads</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/documents">Documents</Link>
        <button className="btn secondary" style={{ marginTop: 12 }} onClick={async () => { await api.auth.logout(); await tokens.clear(); location.href = '/login'; }}>Sign out</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function ProjectsPage() {
  const [rows, setRows] = useState<ProjectSummary[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.projects.list().then(setRows).catch((e) => setErr(String(e.message || e)));
  }, []);
  return (
    <div>
      <h1>Projects</h1>
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table data-testid="admin-projects">
          <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Status</th><th>Plots</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.code}</td><td>{p.city}</td>
                <td><span className="chip">{p.lifecycleStatus}</span></td>
                <td>{p._count?.plots ?? '—'}</td>
                <td><Link to={`/projects/${p.id}/plots`}>Inventory</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">TODO: project setup / amenities / pricing screens — wire from MAIN app (see docs/PRODUCTION_MIGRATION_STATUS.md).</p>
    </div>
  );
}

function PlotsPage() {
  const { projectId } = useParams();
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!projectId) return;
    api.plots.listByProject(projectId).then(setPlots).catch((e) => setErr(String(e.message || e)));
  }, [projectId]);

  async function reserve(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.reservations.create({ plotId, customerId });
      setMsg('Reserved');
      setPlots(await api.plots.listByProject(projectId!));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  async function book(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.bookings.create({ plotId, customerId, agreementValuePaise: '200000000' });
      setMsg('Booked');
      setPlots(await api.plots.listByProject(projectId!));
    } catch (e: any) { setErr(e.message || String(e)); }
  }

  return (
    <div>
      <h1>Plot inventory</h1>
      <div className="card">
        <label className="muted">Customer id (for reserve/book)</label>
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="cuid…" data-testid="reserve-customer-id" />
        {msg ? <p className="muted">{msg}</p> : null}
        {err ? <p className="err">{err}</p> : null}
        <table data-testid="admin-plots">
          <thead><tr><th>#</th><th>Status</th><th>Area</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td>{p.number}</td>
                <td><span className="chip">{p.status}</span></td>
                <td>{String(p.areaSqYd)}</td>
                <td>{p.totalPrice == null ? '—' : String(p.totalPrice)}</td>
                <td>
                  <button className="btn secondary" disabled={!customerId} onClick={() => reserve(p.id)}>Reserve</button>{' '}
                  <button className="btn" disabled={!customerId} onClick={() => book(p.id)}>Book</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">TODO: layout canvas (preserveAspectRatio meet hit-testing) — see docs/ADMIN_LAYOUT_MIGRATION_NOTES.md.</p>
    </div>
  );
}

function SimpleList({ title, load }: { title: string; load: () => Promise<Array<{ id: string; label: string; meta: string }>> }) {
  const [rows, setRows] = useState<Array<{ id: string; label: string; meta: string }>>([]);
  const [err, setErr] = useState('');
  useEffect(() => { load().then(setRows).catch((e) => setErr(String(e.message || e))); }, [load]);
  return (
    <div>
      <h1>{title}</h1>
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Meta</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{r.label}</td><td className="muted">{r.meta}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export function App() {
  const customersLoad = useMemo(() => () => api.customers.list().then((xs) => xs.map((c) => ({ id: c.id, label: c.name, meta: `${c.phone ?? ''} ${c.city ?? ''}` }))), []);
  const leadsLoad = useMemo(() => () => api.leads.list().then((xs) => xs.map((l) => ({ id: l.id, label: l.name, meta: l.stage }))), []);
  const paymentsLoad = useMemo(() => () => api.payments.list().then((xs) => xs.map((p) => ({ id: p.id, label: p.id, meta: `${p.amountPaise} paise · ${p.method}` }))), []);
  const docsLoad = useMemo(() => () => api.documents.list().then((xs) => xs.map((d) => ({ id: d.id, label: d.title, meta: d.visibility }))), []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/projects/:projectId/plots" element={<Shell><PlotsPage /></Shell>} />
      <Route path="/customers" element={<Shell><SimpleList title="Customers" load={customersLoad} /></Shell>} />
      <Route path="/leads" element={<Shell><SimpleList title="Leads" load={leadsLoad} /></Shell>} />
      <Route path="/payments" element={<Shell><SimpleList title="Payments" load={paymentsLoad} /></Shell>} />
      <Route path="/documents" element={<Shell><SimpleList title="Documents" load={docsLoad} /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
