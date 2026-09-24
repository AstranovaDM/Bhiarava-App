import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { api, tokens } from './api';

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
      <h1>Customer sign-in</h1>
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
  useEffect(() => { tokens.getAccessToken().then((t) => setOk(!!t)); }, []);
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
        <Link to="/profile">Profile</Link>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Explore() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.projects.list().then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <h1>Explore</h1>
      <div className="card">
        <table>
          <thead><tr><th>Project</th><th>City</th><th>Status</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.city}</td><td>{p.lifecycleStatus}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.payments.list().then(setRows).catch(() => setRows([])); }, []);
  return (
    <div>
      <h1>Payments</h1>
      <div className="card">
        <table>
          <thead><tr><th>Id</th><th>Amount</th><th>Method</th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td>{p.id}</td><td>{p.amountPaise}</td><td>{p.method}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><div className="card"><h1>Home</h1></div></Shell>} />
      <Route path="/explore" element={<Shell><Explore /></Shell>} />
      <Route path="/property" element={<Shell><div className="card"><h1>My property</h1><p className="muted">TODO</p></div></Shell>} />
      <Route path="/payments" element={<Shell><Payments /></Shell>} />
      <Route path="/profile" element={<Shell><div className="card"><h1>Profile</h1></div></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
