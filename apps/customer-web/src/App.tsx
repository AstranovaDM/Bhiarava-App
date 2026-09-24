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
  const [email, setEmail] = useState('customer@bhairava.demo');
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
      <h1>Customer portal</h1>
      <p className="muted">Demo: customer@bhairava.demo / Demo@12345</p>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn">Sign in</button>
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
        <strong>My Bhairava</strong>
        <Link to="/">Home</Link>
        <Link to="/explore">Explore</Link>
        <Link to="/property">My property</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/schedules">Schedules</Link>
        <Link to="/documents">Documents</Link>
        <Link to="/profile">Profile</Link>
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
        {!rows.length ? <p className="muted">No rows for this customer.</p> : null}
      </div>
    </div>
  );
}

function Home() {
  const bookings = useRows(() => (api as any).bookings.list() as any);
  const payments = useRows(() => api.payments.list() as any);
  return (
    <div>
      <h1>Home</h1>
      <div className="grid">
        <div className="card"><h3>My bookings</h3><p>{bookings.length}</p></div>
        <div className="card"><h3>Payments</h3><p>{payments.length}</p></div>
      </div>
    </div>
  );
}
function ExplorePage() {
  const rows = useRows(() => api.projects.list() as any);
  return <Table title="Explore projects" rows={rows} cols={[{ key: 'name', label: 'Project' }, { key: 'city', label: 'City' }, { key: 'lifecycleStatus', label: 'Status' }]} />;
}
function PropertyPage() {
  const rows = useRows(() => (api as any).bookings.list() as any);
  return <Table title="My property / bookings" rows={rows} cols={[{ key: 'id', label: 'Booking' }, { key: 'plotId', label: 'Plot' }, { key: 'state', label: 'State' }, { key: 'agreementValuePaise', label: 'Agreement' }]} />;
}
function PaymentsPage() {
  const rows = useRows(() => api.payments.list() as any);
  return <Table title="Payments" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'amountPaise', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'paidAt', label: 'Paid' }]} />;
}
function SchedulesPage() {
  const rows = useRows(() => (api as any).paymentSchedules.list() as any);
  return <Table title="Payment schedules" rows={rows} cols={[{ key: 'name', label: 'Installment' }, { key: 'dueDate', label: 'Due' }, { key: 'amountDuePaise', label: 'Amount' }, { key: 'status', label: 'Status' }]} />;
}
function DocumentsPage() {
  const rows = useRows(() => api.documents.list() as any);
  return <Table title="Documents" rows={rows} cols={[{ key: 'title', label: 'Title' }, { key: 'visibility', label: 'Visibility' }, { key: 'version', label: 'Version' }]} />;
}
function ProfilePage() {
  return <div className="card"><h1>Profile</h1><p className="muted">Customer sees own masked profile via API; cross-customer IDs are denied.</p></div>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/explore" element={<Shell><ExplorePage /></Shell>} />
      <Route path="/property" element={<Shell><PropertyPage /></Shell>} />
      <Route path="/payments" element={<Shell><PaymentsPage /></Shell>} />
      <Route path="/schedules" element={<Shell><SchedulesPage /></Shell>} />
      <Route path="/documents" element={<Shell><DocumentsPage /></Shell>} />
      <Route path="/profile" element={<Shell><ProfilePage /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
