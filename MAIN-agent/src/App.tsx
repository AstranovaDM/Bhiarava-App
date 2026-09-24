import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AGENT_DEMO, PLATFORM_SEED } from "@/lib/seed";
import { customersForAgent, projectPlotForAgent } from "@/lib/projections";

const SESSION_KEY = "bhairava.agent.session.v1";
type Session = { email: string; name: string; agentId: string };

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState(AGENT_DEMO.email);
  const [password, setPassword] = useState(AGENT_DEMO.password);
  const [err, setErr] = useState("");
  return (
    <div className="login card">
      <h1>Agent sign-in</h1>
      <p className="muted">Demo: agent@bhairava.com / agent@2026</p>
      <label className="muted">Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="agent-email" />
      <label className="muted">Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="agent-password" />
      {err ? <p className="chip danger">{err}</p> : null}
      <button
        className="btn"
        data-testid="agent-login"
        onClick={() => {
          if (email === AGENT_DEMO.email && password === AGENT_DEMO.password) {
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ email: AGENT_DEMO.email, name: AGENT_DEMO.name, agentId: AGENT_DEMO.id }),
            );
            nav("/");
          } else setErr("Invalid credentials");
        }}
      >
        Sign in
      </button>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  const links: Array<[string, string]> = [
    ["/", "Home"],
    ["/projects", "Projects"],
    ["/plots", "Plot availability"],
    ["/leads", "My leads"],
    ["/customers", "My customers"],
    ["/visits", "Site visits"],
    ["/reservations", "Reservations"],
    ["/bookings", "Bookings"],
    ["/collections", "Collections"],
    ["/commissions", "Commissions"],
    ["/documents", "Documents"],
    ["/profile", "Profile"],
  ];
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava Agent</div>
        <p className="muted" style={{ color: "#94a3b8" }}>{session.name}</p>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
            {label}
          </NavLink>
        ))}
        <button
          className="btn ghost"
          style={{ marginTop: "1rem", width: "100%" }}
          onClick={() => {
            localStorage.removeItem(SESSION_KEY);
            location.href = "/login";
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Home() {
  const session = getSession()!;
  const mine = customersForAgent(PLATFORM_SEED, session.agentId);
  const bookings = PLATFORM_SEED.bookings.filter((b) => b.agentId === session.agentId);
  return (
    <div>
      <h1>Sell workspace</h1>
      <p className="muted">Assigned customers and inventory. Other agents&apos; PII stays redacted.</p>
      <div className="grid cols-2">
        <div className="card"><h3>My customers</h3><p>{mine.length}</p></div>
        <div className="card"><h3>My bookings</h3><p>{bookings.length}</p></div>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div>
      <h1>Projects</h1>
      <div className="grid cols-2">
        {PLATFORM_SEED.projects.filter((p) => p.agentVisible).map((p) => (
          <div className="card" key={p.id} data-testid={`agent-project-${p.id}`}>
            <h3>{p.name}</h3>
            <p className="muted">{p.code} · {p.city}</p>
            <span className="chip">Read-only</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Plots() {
  const session = getSession()!;
  const rows = PLATFORM_SEED.plots.map((p) => projectPlotForAgent(p, PLATFORM_SEED, session.agentId));
  return (
    <div>
      <h1>Plot availability</h1>
      <p className="muted">Canonical 9 statuses. Customer PII only when assigned to you.</p>
      <div className="card">
        <table data-testid="agent-plots-table">
          <thead>
            <tr><th>Plot</th><th>Status</th><th>Area</th><th>Price</th><th>Customer</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td><span className="chip">{r.status}</span></td>
                <td>{r.area}</td>
                <td>₹{r.price.toLocaleString("en-IN")}</td>
                <td>{r.customer ? r.customer.name : r.redacted ? <span className="chip warn">PII hidden</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleTable({ title, rows }: { title: string; rows: Array<{ id: string; name: string; meta: string }> }) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.name}</td><td className="muted">{r.meta}</td></tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={2} className="muted">None assigned</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Documents() {
  const docs = PLATFORM_SEED.documents.filter((d) => d.visibility === "AGENT_VISIBLE" || d.visibility === "CUSTOMER_PROFILE_RELATED");
  return (
    <div>
      <h1>Documents</h1>
      <p className="muted">Agent-visible only — INTERNAL vault excluded.</p>
      <div className="card">
        <ul>
          {docs.map((d) => (
            <li key={d.id}>{d.title} <span className="chip">{d.visibility}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function App() {
  const session = getSession();
  const agentId = session?.agentId ?? AGENT_DEMO.id;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/projects" element={<Shell><Projects /></Shell>} />
      <Route path="/plots" element={<Shell><Plots /></Shell>} />
      <Route path="/leads" element={<Shell><SimpleTable title="My leads" rows={PLATFORM_SEED.leads.filter((l) => l.agentId === agentId).map((l) => ({ id: l.id, name: l.name, meta: `${l.stage} · ${l.phone}` }))} /></Shell>} />
      <Route path="/customers" element={<Shell><SimpleTable title="My customers" rows={customersForAgent(PLATFORM_SEED, agentId).map((c) => ({ id: c.id, name: c.name, meta: c.phone }))} /></Shell>} />
      <Route path="/visits" element={<Shell><div className="card"><h1>Site visits</h1><p className="muted">Assigned customers only (client-test stub).</p></div></Shell>} />
      <Route path="/reservations" element={<Shell><div className="card"><h1>Reservations</h1><p className="muted">Own reservations only.</p></div></Shell>} />
      <Route path="/bookings" element={<Shell><SimpleTable title="Bookings" rows={PLATFORM_SEED.bookings.filter((b) => b.agentId === agentId).map((b) => ({ id: b.id, name: b.id, meta: `₹${b.amount.toLocaleString("en-IN")} · ${b.status}` }))} /></Shell>} />
      <Route path="/collections" element={<Shell><div className="card"><h1>Collections</h1><p className="muted">Own customers/bookings only.</p></div></Shell>} />
      <Route path="/commissions" element={<Shell><div className="card"><h1>Commissions</h1><p className="muted">Own commission only.</p></div></Shell>} />
      <Route path="/documents" element={<Shell><Documents /></Shell>} />
      <Route path="/profile" element={<Shell><div className="card"><h1>Profile</h1><p>{AGENT_DEMO.name}</p><p className="muted">{AGENT_DEMO.email}</p></div></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
