import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { api, tokens } from './api';

type AnyRow = Record<string, any>;

function useAuthed() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    void Promise.resolve(tokens.getAccessToken()).then((t: string | null) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);
  return { ready, authed, setAuthed };
}

function useAsyncList(loader: () => Promise<AnyRow[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setErr('');
    loader()
      .then(setRows)
      .catch((e) => setErr(String((e as Error).message || e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, err, loading, reload };
}

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@bhairava.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const session = await api.auth.login(email, password);
      await tokens.setTokens(session.accessToken, session.refreshToken ?? null);
      nav('/');
    } catch (ex: any) {
      setErr(ex?.message || 'Login failed');
    }
  }
  return (
    <div className="card login">
      <h1>Bhairava Admin</h1>
      <p className="muted">Live API only â€” no mock business store. Demo: admin@bhairava.demo / Demo@12345</p>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password" />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" data-testid="admin-login">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { ready, authed } = useAuthed();
  if (!ready) return <div className="main">Loadingâ€¦</div>;
  if (!authed) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava <span>Admin</span></div>
        <p className="muted" style={{ color: '#9fb5a8', padding: '0 .6rem' }}>Production API Â· desktop-first</p>
        <div className="section">Overview</div>
        <NavLink to="/" end>Dashboard</NavLink>
        <div className="section">Inventory</div>
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/plots">Plots</NavLink>
        <NavLink to="/layouts">Layouts</NavLink>
        <div className="section">CRM / Sales</div>
        <NavLink to="/customers">Customers</NavLink>
        <NavLink to="/leads">Leads</NavLink>
        <NavLink to="/visits">Site visits</NavLink>
        <NavLink to="/reservations">Reservations</NavLink>
        <NavLink to="/bookings">Bookings</NavLink>
        <div className="section">Finance</div>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/receipts">Receipts</NavLink>
        <NavLink to="/commissions">Commissions</NavLink>
        <NavLink to="/collections">Collections</NavLink>
        <div className="section">Ops</div>
        <NavLink to="/documents">Documents</NavLink>
        <NavLink to="/registrations">Registrations</NavLink>
        <NavLink to="/resale">Resale</NavLink>
        <NavLink to="/agents">Agents</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
        <div className="section">Reports</div>
        <NavLink to="/reports/sales">Sales</NavLink>
        <NavLink to="/reports/inventory">Inventory</NavLink>
        <NavLink to="/reports/collections">Collections</NavLink>
        <div className="section">Settings</div>
        <NavLink to="/settings/company">Company</NavLink>
        <NavLink to="/settings/users">Users</NavLink>
        <NavLink to="/settings/audit">Audit</NavLink>
        <NavLink to="/settings/billing">Billing</NavLink>
        <NavLink to="/settings/danger">Founder danger zone</NavLink>
        <button
          className="btn secondary"
          style={{ marginTop: 16, width: '100%' }}
          onClick={async () => {
            try { await api.auth.logout(); } catch { /* ignore */ }
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

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div className="topbar"><h1>{title}</h1></div>
      <div className="card"><p className="muted">{note}</p></div>
    </div>
  );
}

function ResourceTable({
  title,
  loader,
  columns,
}: {
  title: string;
  loader: () => Promise<AnyRow[]>;
  columns: Array<{ key: string; label: string }>;
}) {
  const { rows, err } = useAsyncList(loader);
  return (
    <div>
      <div className="topbar"><h1>{title}</h1></div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id || idx}>
                {columns.map((c) => <td key={c.key}>{String(r[c.key] ?? 'â€”')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !err ? <p className="muted">No rows from API.</p> : null}
      </div>
    </div>
  );
}

function DashboardPage() {
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const customers = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const payments = useAsyncList(() => api.payments.list() as Promise<AnyRow[]>);
  const leads = useAsyncList(() => api.leads.list() as Promise<AnyRow[]>);
  return (
    <div>
      <div className="topbar"><h1>Dashboard</h1><span className="muted">Live API counts</span></div>
      <div className="grid">
        <div className="stat"><div className="k">Projects</div><div className="v">{projects.rows.length}</div></div>
        <div className="stat"><div className="k">Customers</div><div className="v">{customers.rows.length}</div></div>
        <div className="stat"><div className="k">Leads</div><div className="v">{leads.rows.length}</div></div>
        <div className="stat"><div className="k">Payments</div><div className="v">{payments.rows.length}</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Projects</h2>
        {projects.err ? <p className="err">{projects.err}</p> : null}
        <table>
          <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Status</th><th /></tr></thead>
          <tbody>
            {projects.rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.code}</td><td>{p.city}</td>
                <td><span className="chip">{p.lifecycleStatus || p.status}</span></td>
                <td><Link to={`/projects/${p.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { rows, err, reload } = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [msg, setMsg] = useState('');
  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await (api.projects as any).create({ name: form.name, code: form.code, city: form.city || undefined });
      setForm({ name: '', code: '', city: '' });
      setMsg('Created');
      reload();
    } catch (ex: any) {
      setMsg(ex.message || String(ex));
    }
  }
  return (
    <div>
      <div className="topbar"><h1>Projects</h1></div>
      <div className="card">
        <h2>Create project</h2>
        <form className="row" onSubmit={create}>
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Code</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <button className="btn" type="submit">Create</button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table data-testid="admin-projects">
          <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.code}</td><td>{p.city}</td>
                <td><span className="chip">{p.lifecycleStatus || p.status}</span></td>
                <td>
                  <Link to={`/projects/${p.id}`}>Workspace</Link>
                  {' Â· '}
                  <Link to={`/projects/${p.id}/plots`}>Plots</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectWorkspace() {
  const { projectId } = useParams();
  const [project, setProject] = useState<AnyRow | null>(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!projectId) return;
    (api.projects as any).get(projectId).then(setProject).catch((e: any) => setErr(String(e.message || e)));
  }, [projectId]);
  const tabs = ['overview', 'setup', 'pricing', 'amenities', 'visibility', 'layout', 'sales', 'finance', 'documents'];
  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{project?.name || 'Project'}</h1>
          <p className="muted">{project?.code} Â· {project?.city}</p>
        </div>
        <Link className="btn ghost" to="/projects">Back</Link>
      </div>
      {err ? <p className="err">{err}</p> : null}
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="card">
        {tab === 'overview' && (
          <div>
            <p>Lifecycle: <span className="chip">{project?.lifecycleStatus || project?.status}</span></p>
            <p className="muted">Mutations go through production API. MAIN remains visual SoT for dense widgets.</p>
            <p><Link to={`/projects/${projectId}/plots`}>Open plot inventory â†’</Link></p>
          </div>
        )}
        {tab === 'documents' && <DocumentsPage projectId={projectId} />}
        {tab !== 'overview' && tab !== 'documents' && (
          <p className="muted">
            â€œ{tab}â€ maps to MAIN project workspace tabs. Persist via PATCH /api/projects/:id â€” no localStorage business SoT.
          </p>
        )}
      </div>
    </div>
  );
}

function PlotsPage() {
  const params = useParams();
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [selected, setSelected] = useState(params.projectId || '');
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [plots, setPlots] = useState<AnyRow[]>([]);
  useEffect(() => {
    if (!selected && projects.rows[0]?.id) setSelected(projects.rows[0].id);
  }, [projects.rows, selected]);
  useEffect(() => {
    if (!selected) return;
    api.plots.listByProject(selected).then(setPlots).catch((e) => setErr(String(e.message || e)));
  }, [selected]);
  async function reserve(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.reservations.create({ plotId, customerId });
      setMsg('Reserved');
      setPlots(await api.plots.listByProject(selected));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  async function book(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.bookings.create({
        plotId,
        customerId,
        agreementValuePaise: '200000000',
        advancePaise: '1000000',
      } as any);
      setMsg('Booked');
      setPlots(await api.plots.listByProject(selected));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  return (
    <div>
      <div className="topbar"><h1>Plots</h1></div>
      <div className="card row">
        <div>
          <label>Project</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {projects.rows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>Customer id</label>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} data-testid="reserve-customer-id" />
        </div>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table data-testid="admin-plots">
          <thead><tr><th>#</th><th>Status</th><th>Area</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td>{p.number || p.plotNumber}</td>
                <td><span className="chip">{p.status}</span></td>
                <td>{String(p.areaSqYd ?? p.area ?? 'â€”')}</td>
                <td>{p.totalPrice == null ? 'â€”' : String(p.totalPrice)}</td>
                <td>
                  <button className="btn secondary" disabled={!customerId} onClick={() => reserve(p.id)}>Reserve</button>{' '}
                  <button className="btn" disabled={!customerId} onClick={() => book(p.id)}>Book</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersPage() {
  const { rows, err, reload } = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', pan: '', aadhaar: '' });
  const [msg, setMsg] = useState('');
  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api.customers.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        ...(form.pan ? { pan: form.pan } : {}),
        ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as any);
      setForm({ name: '', phone: '', email: '', city: '', pan: '', aadhaar: '' });
      setMsg('Created (PII encrypted at rest)');
      reload();
    } catch (ex: any) { setMsg(ex.message || String(ex)); }
  }
  return (
    <div>
      <div className="topbar"><h1>Customers</h1></div>
      <div className="card">
        <h2>Create</h2>
        <form onSubmit={create} className="row">
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label>PAN</label><input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
          <div><label>Aadhaar</label><input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>PAN</th><th>Aadhaar</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.city}</td>
                <td>{c.panMasked || (c.hasPan ? 'â€¢â€¢â€¢â€¢' : 'â€”')}</td>
                <td>{c.aadhaarMasked || (c.hasAadhaar ? 'â€¢â€¢â€¢â€¢' : 'â€”')}</td>
                <td><Link to={`/customers/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetail() {
  const { customerId } = useParams();
  const [row, setRow] = useState<AnyRow | null>(null);
  const [revealed, setRevealed] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!customerId) return;
    api.customers.get(customerId).then(setRow).catch((e) => setErr(String(e.message || e)));
  }, [customerId]);
  async function reveal(field: 'pan' | 'aadhaar') {
    setErr(''); setRevealed('');
    try {
      const access = await tokens.getAccessToken();
      const base = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${base}/api/customers/${customerId}/pii?field=${field}`, {
        headers: { authorization: `Bearer ${access}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || res.statusText);
      setRevealed(`${field}: ${body.value}`);
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  return (
    <div>
      <div className="topbar"><h1>{row?.name || 'Customer'}</h1><Link to="/customers">Back</Link></div>
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <p>Phone: {row?.phone}</p>
        <p>Email: {row?.email}</p>
        <p>City: {row?.city}</p>
        <p>PAN (masked): {row?.panMasked || 'â€”'}</p>
        <p>Aadhaar (masked): {row?.aadhaarMasked || 'â€”'}</p>
        <button className="btn secondary" onClick={() => reveal('pan')}>Reveal PAN</button>{' '}
        <button className="btn secondary" onClick={() => reveal('aadhaar')}>Reveal Aadhaar</button>
        {revealed ? <p className="ok">{revealed}</p> : null}
      </div>
    </div>
  );
}

function DocumentsPage({ projectId }: { projectId?: string }) {
  const { rows, err, reload } = useAsyncList(
    () => api.documents.list(projectId ? { projectId } : undefined) as Promise<AnyRow[]>,
    [projectId],
  );
  const [msg, setMsg] = useState('');
  async function createDoc() {
    setMsg('');
    try {
      const created = await api.documents.create({
        title: 'Admin upload ' + new Date().toISOString(),
        visibility: 'INTERNAL',
        originalName: 'note.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 16,
        projectId,
      } as any);
      const url = (created as any)?.upload?.uploadUrl;
      if (url) {
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 admin' });
      }
      setMsg('Uploaded via presigned URL');
      reload();
    } catch (e: any) { setMsg(e.message || String(e)); }
  }
  async function download(id: string) {
    const res = await api.documents.download(id);
    const url = (res as any)?.download?.downloadUrl;
    if (url) window.open(url, '_blank');
  }
  return (
    <div>
      {!projectId ? <div className="topbar"><h1>Documents</h1></div> : <h2>Documents</h2>}
      <div className="card">
        <button className="btn" onClick={createDoc}>Create + upload test PDF</button>
        {msg ? <p className="muted">{msg}</p> : null}
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>Title</th><th>Visibility</th><th>Version</th><th /></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td><span className="chip">{d.visibility}</span></td>
                <td>{d.version}</td>
                <td><button className="btn ghost" onClick={() => download(d.id)}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPage() {
  const { rows, err } = useAsyncList(async () => {
    const res = await (api as any).audit.list({ take: 100 });
    return Array.isArray(res) ? res : res?.items || [];
  });
  return (
    <div>
      <div className="topbar"><h1>Audit log</h1></div>
      <div className="card">
        <p className="muted">Append-only trail from production API.</p>
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt}</td>
                <td>{r.action}</td>
                <td>{r.entityType} {r.entityId}</td>
                <td>{r.actorId || 'â€”'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DangerZone() {
  return (
    <div>
      <div className="topbar"><h1>Founder danger zone</h1></div>
      <div className="card danger-zone">
        <h2>Destructive controls</h2>
        <p className="muted">
          Founder-only API gates. No mock localStorage side effects. Buttons stay disabled until runbook sign-off.
        </p>
        <button className="btn danger" disabled>Export org data</button>{' '}
        <button className="btn danger" disabled>Purge demo data</button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Shell><DashboardPage /></Shell>} />
      <Route path="/projects" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/projects/:projectId" element={<Shell><ProjectWorkspace /></Shell>} />
      <Route path="/projects/:projectId/plots" element={<Shell><PlotsPage /></Shell>} />
      <Route path="/plots" element={<Shell><PlotsPage /></Shell>} />
      <Route path="/layouts" element={<Shell><Placeholder title="Layouts" note="Layouts via project API; canvas hit-testing remains MAIN SoT until signed off." /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersPage /></Shell>} />
      <Route path="/customers/:customerId" element={<Shell><CustomerDetail /></Shell>} />
      <Route path="/leads" element={<Shell><ResourceTable title="Leads" loader={() => api.leads.list() as Promise<AnyRow[]>} columns={[{ key: 'name', label: 'Name' }, { key: 'stage', label: 'Stage' }, { key: 'phone', label: 'Phone' }]} /></Shell>} />
      <Route path="/visits" element={<Shell><ResourceTable title="Site visits" loader={() => api.visits.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'scheduledAt', label: 'When' }]} /></Shell>} />
      <Route path="/reservations" element={<Shell><Placeholder title="Reservations" note="Create via Plots actions (POST /api/reservations)." /></Shell>} />
      <Route path="/bookings" element={<Shell><Placeholder title="Bookings" note="Create via Plots actions (POST /api/bookings)." /></Shell>} />
      <Route path="/payments" element={<Shell><ResourceTable title="Payments" loader={() => api.payments.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'amountPaise', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'status', label: 'Status' }]} /></Shell>} />
      <Route path="/receipts" element={<Shell><Placeholder title="Receipts" note="Derived from payments; print templates from MAIN." /></Shell>} />
      <Route path="/commissions" element={<Shell><Placeholder title="Commissions" note="Finance commissions via payments/finance API." /></Shell>} />
      <Route path="/collections" element={<Shell><Placeholder title="Collections" note="Collections schedule from finance API." /></Shell>} />
      <Route path="/documents" element={<Shell><DocumentsPage /></Shell>} />
      <Route path="/registrations" element={<Shell><Placeholder title="Registrations" note="Registration workflow â€” API CRUD expanding." /></Shell>} />
      <Route path="/resale" element={<Shell><Placeholder title="Resale" note="Resale UX from MAIN; live listings via API." /></Shell>} />
      <Route path="/agents" element={<Shell><Placeholder title="Agents" note="Agent directory from users/agents profiles." /></Shell>} />
      <Route path="/notifications" element={<Shell><ResourceTable title="Notifications" loader={async () => { const r = await (api as any).notifications.list(); return Array.isArray(r) ? r : []; }} columns={[{ key: 'title', label: 'Title' }, { key: 'channel', label: 'Channel' }, { key: 'createdAt', label: 'When' }]} /></Shell>} />
      <Route path="/reports/sales" element={<Shell><Placeholder title="Sales report" note="Aggregations from bookings/payments only." /></Shell>} />
      <Route path="/reports/inventory" element={<Shell><Placeholder title="Inventory report" note="Plot status funnel from API." /></Shell>} />
      <Route path="/reports/collections" element={<Shell><Placeholder title="Collections report" note="Finance collections aggregates." /></Shell>} />
      <Route path="/settings/company" element={<Shell><Placeholder title="Company settings" note="PATCH company settings via admin API." /></Shell>} />
      <Route path="/settings/users" element={<Shell><Placeholder title="Users & roles" note="User provisioning via auth + RBAC APIs." /></Shell>} />
      <Route path="/settings/audit" element={<Shell><AuditPage /></Shell>} />
      <Route path="/settings/billing" element={<Shell><Placeholder title="Billing" note="Billing UI may be blocked by external credential." /></Shell>} />
      <Route path="/settings/danger" element={<Shell><DangerZone /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
