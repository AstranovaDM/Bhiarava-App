import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, tokens } from './api';

type Row = Record<string, any>;

function useRows(loader: () => Promise<Row[]>) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    loader().then(setRows).catch(() => setRows([]));
  }, []);
  return rows;
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('agent@bhairava.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const s = await api.auth.login(email, password);
      await tokens.setTokens(s.accessToken, s.refreshToken ?? null);
      nav('/');
    } catch (ex: any) {
      setErr(ex.message || 'Login failed');
    }
  }
  return (
    <div className="card login">
      <h1>Agent portal</h1>
      <p className="muted">Live API — agent@bhairava.demo / Demo@12345</p>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="agent-email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="agent-password" />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" data-testid="agent-login">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    void Promise.resolve(tokens.getAccessToken()).then((t: string | null) => setOk(!!t));
  }, []);
  if (ok === null) return null;
  if (!ok) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <strong>Bhairava Agent</strong>
        <Link to="/">Home</Link>
        <Link to="/projects">Explore</Link>
        <Link to="/leads">Leads</Link>
        <Link to="/visits">Visits</Link>
        <Link to="/customers">My customers</Link>
        <Link to="/bookings">Bookings</Link>
        <Link to="/commissions">Commissions</Link>
        <button
          className="btn secondary"
          onClick={async () => {
            try { await api.auth.logout(); } catch {}
            await tokens.clear();
            location.href = '/login';
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Table({ title, rows, cols }: { title: string; rows: Row[]; cols: Array<{ key: string; label: string }> }) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="card">
        <table>
          <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>{cols.map((c) => <td key={c.key}>{String(r[c.key] ?? '—')}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="muted">No rows (scoped to this agent).</p> : null}
      </div>
    </div>
  );
}

function Home() {
  const leads = useRows(() => api.leads.list() as any);
  const visits = useRows(() => api.visits.list() as any);
  const bookings = useRows(() => ((api as any).bookings.list?.() ?? Promise.resolve([])) as any);
  return (
    <div>
      <h1>Home</h1>
      <div className="grid">
        <div className="card" data-testid="stat-leads"><h3>My leads</h3><p>{leads.length}</p></div>
        <div className="card" data-testid="stat-visits"><h3>Site visits</h3><p>{visits.length}</p></div>
        <div className="card"><h3>Bookings</h3><p>{bookings.length}</p></div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const rows = useRows(() => api.projects.list() as any);
  return <Table title="Explore projects" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'city', label: 'City' }, { key: 'lifecycleStatus', label: 'Status' }]} />;
}
function LeadsPage() {
  const rows = useRows(() => api.leads.list() as any);
  return <Table title="My leads" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'stage', label: 'Stage' }, { key: 'phone', label: 'Phone' }]} />;
}
function VisitsPage() {
  const rows = useRows(() => api.visits.list() as any);
  return <Table title="Site visits" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'scheduledAt', label: 'When' }]} />;
}
function CustomersPage() {
  const rows = useRows(() => api.customers.list() as any);
  return <Table title="Customers (agent-scoped)" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'city', label: 'City' }]} />;
}
function BookingsPage() {
  const rows = useRows(() => (api as any).bookings.list() as any);
  return <Table title="Bookings" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'state', label: 'State' }, { key: 'plotId', label: 'Plot' }]} />;
}
function CommissionsPage() {
  const rows = useRows(() => (api as any).commissions.list() as any);
  return <Table title="Commissions" rows={rows} cols={[{ key: 'amountPaise', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'bookingId', label: 'Booking' }]} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/projects" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/leads" element={<Shell><LeadsPage /></Shell>} />
      <Route path="/visits" element={<Shell><VisitsPage /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersPage /></Shell>} />
      <Route path="/bookings" element={<Shell><BookingsPage /></Shell>} />
      <Route path="/commissions" element={<Shell><CommissionsPage /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
