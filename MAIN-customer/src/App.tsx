import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { CUSTOMER_DEMO, PLATFORM_SEED } from "@/lib/seed";
import { projectPlotForCustomer } from "@/lib/projections";

const SESSION_KEY = "bhairava.customer.session.v1";

type Session = { email: string; name: string; customerId: string };

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
  const [email, setEmail] = useState(CUSTOMER_DEMO.email);
  const [password, setPassword] = useState(CUSTOMER_DEMO.password);
  const [err, setErr] = useState("");
  return (
    <div className="login card">
      <h1>Customer sign-in</h1>
      <p className="muted">Demo: customer@bhairava.com / customer@2026</p>
      <label className="muted">Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="customer-email" />
      <label className="muted">Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="customer-password" />
      {err ? <p className="chip danger">{err}</p> : null}
      <button
        className="btn"
        data-testid="customer-login"
        onClick={() => {
          if (email === CUSTOMER_DEMO.email && password === CUSTOMER_DEMO.password) {
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ email: CUSTOMER_DEMO.email, name: CUSTOMER_DEMO.name, customerId: CUSTOMER_DEMO.id }),
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
    ["/explore/projects", "Projects"],
    ["/explore/plots", "Plot availability"],
    ["/account/bookings", "My bookings"],
    ["/account/properties", "My properties"],
    ["/account/payments", "Payments"],
    ["/account/schedule", "Payment schedule"],
    ["/account/documents", "My documents"],
    ["/account/support", "Support"],
    ["/account/profile", "Profile"],
  ];
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava Customer</div>
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

function ExplorePlots() {
  const rows = PLATFORM_SEED.plots.map(projectPlotForCustomer);
  return (
    <div>
      <h1>Plot availability</h1>
      <p className="muted">Detail only for AVAILABLE / RESALE_AVAILABLE. Never shows who holds other plots.</p>
      <div className="card">
        <table data-testid="customer-plots-table">
          <thead>
            <tr><th>Plot</th><th>Status</th><th>Area</th><th>Price</th><th>Facing</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td><span className="chip">{r.status}</span></td>
                <td>{r.detailVisible ? r.area : "—"}</td>
                <td>{r.detailVisible ? `₹${(r.price ?? 0).toLocaleString("en-IN")}` : "—"}</td>
                <td>{r.detailVisible ? r.facing : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyDocuments() {
  const session = getSession()!;
  const docs = PLATFORM_SEED.documents.filter(
    (d) => d.visibility === "CUSTOMER_PROFILE_RELATED" && d.customerId === session.customerId,
  );
  const vaultCount = PLATFORM_SEED.documents.filter((d) => d.visibility === "INTERNAL").length;
  return (
    <div>
      <h1>My documents</h1>
      <p className="muted">Never includes project document vault ({vaultCount} internal docs hidden).</p>
      <div className="card" data-testid="customer-docs">
        <ul>
          {docs.map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
          {docs.length === 0 ? <li className="muted">No documents</li> : null}
        </ul>
      </div>
    </div>
  );
}

export function App() {
  const session = getSession();
  const customerId = session?.customerId ?? CUSTOMER_DEMO.id;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><div><h1>Welcome</h1><p className="muted">Explore public inventory or manage your own bookings and documents.</p></div></Shell>} />
      <Route
        path="/explore/projects"
        element={
          <Shell>
            <div>
              <h1>Projects</h1>
              <div className="grid cols-2">
                {PLATFORM_SEED.projects.filter((p) => p.customerListed).map((p) => (
                  <div className="card" key={p.id} data-testid={`customer-project-${p.id}`}>
                    <h3>{p.name}</h3>
                    <p className="muted">{p.city}</p>
                  </div>
                ))}
              </div>
            </div>
          </Shell>
        }
      />
      <Route path="/explore/plots" element={<Shell><ExplorePlots /></Shell>} />
      <Route
        path="/account/bookings"
        element={
          <Shell>
            <div>
              <h1>My bookings</h1>
              <div className="card">
                <table data-testid="customer-bookings">
                  <thead><tr><th>Booking</th><th>Plot</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {PLATFORM_SEED.bookings.filter((b) => b.customerId === customerId).map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{PLATFORM_SEED.plots.find((p) => p.id === b.plotId)?.number}</td>
                        <td>₹{b.amount.toLocaleString("en-IN")}</td>
                        <td><span className="chip">{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Shell>
        }
      />
      <Route path="/account/properties" element={<Shell><div className="card"><h1>My properties</h1><p className="muted">Plots linked to your bookings only.</p></div></Shell>} />
      <Route path="/account/payments" element={<Shell><div className="card"><h1>Payments</h1><p className="muted">Own payments only.</p></div></Shell>} />
      <Route path="/account/schedule" element={<Shell><div className="card"><h1>Payment schedule</h1><p className="muted">Own schedule only.</p></div></Shell>} />
      <Route path="/account/documents" element={<Shell><MyDocuments /></Shell>} />
      <Route path="/account/support" element={<Shell><div className="card"><h1>Support</h1><p className="muted">Raise a ticket (client-test stub).</p></div></Shell>} />
      <Route path="/account/profile" element={<Shell><div className="card"><h1>Profile</h1><p>{CUSTOMER_DEMO.name}</p><p className="muted">{CUSTOMER_DEMO.email}</p></div></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
