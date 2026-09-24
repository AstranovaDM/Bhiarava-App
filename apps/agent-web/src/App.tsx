import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { api, tokens } from './api';

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
    } catch (ex: any) { setErr(ex.message || 'Login failed'); }
  }
  return (
    <div className="card login">
      <h1>Agent sign-in</h1>
      <p className="muted">Demo: agent@bhairava.demo / Demo@12345</p>
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
  useEffect(() => { tokens.getAccessToken().then((t) => setOk(!!t)); }, []);
  if (ok === null) return null;
  if (!ok) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <strong>Agent</strong>
        <Link to="/">Home</Link>
        <Link to="/projects">Explore</Link>
        <Link to="/leads">Leads</Link>
        <Link to="/visits">Visits</Link>
        <Link to="/more">More</Link>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Home() {
  const [leads, setLeads] = useState(0);
  const [visits, setVisits] = useState(0);
  useEffect(() => {
    Promise.all([api.leads.list(), api.visits.list()]).then(([l, v]) => {
      setLeads(l.length); setVisits(v.length);
    }).catch(() => undefined);
  }, []);
  return (
    <div>
      <h1>Home</h1>
      <div className="card" data-testid="stat-leads"><h3>My leads</h3><p>{leads}</p></div>
      <div className="card" data-testid="stat-visits"><h3>Site visits</h3><p>{visits}</p></div>
    </div>
  );
}

function Projects() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.projects.list().then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <h1>Explore projects</h1>
      <div className="card">
        <table data-testid="agent-projects">
          <thead><tr><th>Name</th><th>City</th><th>Plots</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.city}</td><td>{p._count?.plots ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Leads() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.leads.list().then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <h1>My leads</h1>
      <div className="card">
        <table data-testid="agent-leads">
          <thead><tr><th>Name</th><th>Stage</th><th>Phone</th></tr></thead>
          <tbody>{rows.map((l) => <tr key={l.id}><td>{l.name}</td><td>{l.stage}</td><td>{l.phone}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Visits() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.visits.list().then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <h1>Site visits</h1>
      <div className="card">
        <table data-testid="agent-visits">
          <thead><tr><th>When</th><th>Status</th></tr></thead>
          <tbody>{rows.map((v) => <tr key={v.id}><td>{v.scheduledAt}</td><td>{v.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function More() {
  return (
    <div className="card">
      <h1>More</h1>
      <p className="muted">TODO: commissions, notifications, profile — port remaining MAIN-agent screens.</p>
      <button className="btn secondary" onClick={async () => { await api.auth.logout(); await tokens.clear(); location.href='/login'; }}>Sign out</button>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/projects" element={<Shell><Projects /></Shell>} />
      <Route path="/leads" element={<Shell><Leads /></Shell>} />
      <Route path="/visits" element={<Shell><Visits /></Shell>} />
      <Route path="/more" element={<Shell><More /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
