import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Users,
  UserPlus,
  Handshake,
  MapPin,
  Bookmark,
  FileCheck2,
  Plus,
} from "lucide-react";
import { Btn, Chip, FilterBar, Panel, SectionTitle } from "@/components/kit";
import {
  Field,
  TextInput,
  SelectInput,
  NumberInput,
  TextareaInput,
  EditSheet,
} from "@/components/form-kit";
import type {
  Agent,
  Booking,
  Customer,
  Plot,
  Project,
  Reservation,
  SiteVisit,
  SiteVisitStatus,
} from "@/lib/mock-data";
import { byId, formatINR } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  salesAccessForRole,
  canEditSalesOps,
  type SalesAccess,
} from "@/lib/domain/project-permissions";
import {
  toCanonicalPlotStatus,
  toLegacyPlotStatus,
  PLOT_STATUS_LABEL,
} from "@/lib/domain/plot-status";
import { applyStatusTransition } from "@/lib/domain/plot-transitions";

const SECTIONS = [
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "customers", label: "Customers", icon: Users },
  { key: "agents", label: "Agents", icon: Handshake },
  { key: "visits", label: "Site Visits", icon: MapPin },
  { key: "reservations", label: "Reservations", icon: Bookmark },
  { key: "bookings", label: "Bookings", icon: FileCheck2 },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function AccessDenied() {
  return (
    <Panel className="text-center">
      <SectionTitle>Sales access denied</SectionTitle>
      <p className="pt-2 text-sm text-muted-foreground">
        Customer roles cannot open project Sales in MAIN.
      </p>
    </Panel>
  );
}

export function ProjectSalesTab({
  project,
  plots,
}: {
  project: Project;
  plots: Plot[];
}) {
  const session = getSession();
  const access: SalesAccess = salesAccessForRole(session?.role);
  if (access === "denied") return <AccessDenied />;

  const canEdit = canEditSalesOps(session?.role) && access === "full";
  const {
    customers,
    agents,
    bookings,
    reservations,
    siteVisits,
    saveCustomer,
    saveBooking,
    saveReservation,
    saveVisit,
    savePlot,
    nextId,
  } = useData();

  const [section, setSection] = useState<SectionKey>("leads");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const plotIds = useMemo(() => new Set(plots.map((p) => p.id)), [plots]);
  const assignedAgentIds = useMemo(
    () => new Set((project.agents ?? []).concat(agents.filter((a) => a.projects.includes(project.id)).map((a) => a.id))),
    [project.agents, agents, project.id],
  );

  const projectBookings = useMemo(
    () => bookings.filter((b) => b.projectId === project.id),
    [bookings, project.id],
  );
  const projectReservations = useMemo(
    () =>
      reservations.filter((r) => {
        const plot = byId(plots, r.plotId);
        return plot?.projectId === project.id || plotIds.has(r.plotId);
      }),
    [reservations, plots, plotIds, project.id],
  );
  const projectVisits = useMemo(
    () => siteVisits.filter((v) => v.projectId === project.id),
    [siteVisits, project.id],
  );

  const relatedCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of plots) if (p.customerId) ids.add(p.customerId);
    for (const b of projectBookings) ids.add(b.customerId);
    for (const r of projectReservations) ids.add(r.customerId);
    for (const v of projectVisits) ids.add(v.customerId);
    return ids;
  }, [plots, projectBookings, projectReservations, projectVisits]);

  const projectCustomers = useMemo(
    () => customers.filter((c) => relatedCustomerIds.has(c.id) || c.plots.some((pid) => plotIds.has(pid))),
    [customers, relatedCustomerIds, plotIds],
  );
  const leads = useMemo(
    () => projectCustomers.filter((c) => c.stage === "Lead" || c.stage === "Site visit"),
    [projectCustomers],
  );
  const projectAgents = useMemo(
    () => agents.filter((a) => assignedAgentIds.has(a.id) || a.projects.includes(project.id)),
    [agents, assignedAgentIds, project.id],
  );

  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-4">
      {access === "read" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Sales is <span className="font-medium text-foreground">read-only</span> for your role
          (Finance / Viewer). Founder and Administrator can create and edit.
        </div>
      )}
      {access === "limited" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Agent sales view — assigned pipeline visible; master Admin ops stay Founder/Admin.
        </div>
      )}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle>Sales workspace</SectionTitle>
            <p className="pt-1 text-sm text-muted-foreground">
              Project-scoped leads, customers, agents, visits, reservations and bookings. Plot status
              moves only through allow-listed transitions (no free-form HOLD).
            </p>
          </div>
          {canEdit && (
            <Btn variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New {SECTIONS.find((s) => s.key === section)?.label.slice(0, -1) ?? "record"}
            </Btn>
          )}
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-low p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSection(s.key);
                setQuery("");
                setCreateOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                section === s.key
                  ? "bg-surface-lowest text-foreground shadow-ambient"
                  : "text-muted-foreground hover:bg-surface-c"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </Panel>

      <FilterBar
        views={["All"]}
        active="All"
        onSelect={() => undefined}
        query={query}
        onQuery={setQuery}
        placeholder={`Search ${section}…`}
      />

      {section === "leads" && (
        <EntityTable
          empty="No leads linked to this project yet."
          rows={leads.filter((c) => !q || `${c.name} ${c.phone} ${c.email} ${c.source}`.toLowerCase().includes(q))}
          columns={[
            { h: "Name", cell: (c: Customer) => c.name },
            { h: "Phone", cell: (c) => c.phone },
            { h: "Stage", cell: (c) => <Chip tone="warning">{c.stage}</Chip> },
            { h: "Source", cell: (c) => c.source },
            {
              h: "Agent",
              cell: (c) => byId(agents, c.agentId)?.name ?? "—",
            },
            {
              h: "",
              cell: (c) => (
                <Link to="/customers/$customerId" params={{ customerId: c.id }} className="text-xs text-primary">
                  Open
                </Link>
              ),
            },
          ]}
        />
      )}

      {section === "customers" && (
        <EntityTable
          empty="No customers related to this project."
          rows={projectCustomers.filter(
            (c) => !q || `${c.name} ${c.phone} ${c.email} ${c.stage}`.toLowerCase().includes(q),
          )}
          columns={[
            { h: "Name", cell: (c: Customer) => c.name },
            { h: "Stage", cell: (c) => <Chip>{c.stage}</Chip> },
            { h: "Value", cell: (c) => <span className="numeric">{formatINR(c.totalValue, { compact: true })}</span> },
            { h: "Paid", cell: (c) => <span className="numeric">{formatINR(c.paid, { compact: true })}</span> },
            {
              h: "",
              cell: (c) => (
                <Link to="/customers/$customerId" params={{ customerId: c.id }} className="text-xs text-primary">
                  Open
                </Link>
              ),
            },
          ]}
        />
      )}

      {section === "agents" && (
        <EntityTable
          empty="No agents assigned to this project."
          rows={projectAgents.filter(
            (a) => !q || `${a.name} ${a.code} ${a.region}`.toLowerCase().includes(q),
          )}
          columns={[
            { h: "Agent", cell: (a: Agent) => a.name },
            { h: "Code", cell: (a) => a.code },
            { h: "Region", cell: (a) => a.region },
            { h: "Status", cell: (a) => <Chip tone={a.status === "Active" ? "positive" : "neutral"}>{a.status}</Chip> },
            {
              h: "Sales",
              cell: (a) => <span className="numeric">₹{a.salesCr.toFixed(1)} Cr</span>,
            },
            {
              h: "",
              cell: (a) => (
                <Link to="/agents/$agentId" params={{ agentId: a.id }} className="text-xs text-primary">
                  Open
                </Link>
              ),
            },
          ]}
        />
      )}

      {section === "visits" && (
        <EntityTable
          empty="No site visits for this project."
          rows={projectVisits.filter((v) => {
            if (!q) return true;
            const c = byId(customers, v.customerId);
            return `${v.id} ${c?.name ?? ""} ${v.status} ${v.date}`.toLowerCase().includes(q);
          })}
          columns={[
            { h: "Date", cell: (v: SiteVisit) => `${v.date} ${v.time}` },
            {
              h: "Customer",
              cell: (v) => byId(customers, v.customerId)?.name ?? v.customerId,
            },
            {
              h: "Agent",
              cell: (v) => byId(agents, v.agentId)?.name ?? "—",
            },
            { h: "Status", cell: (v) => <Chip>{v.status}</Chip> },
            {
              h: "Plots",
              cell: (v) => (v.plotIds?.length ? v.plotIds.length : v.plotInterest?.length ?? 0),
            },
          ]}
        />
      )}

      {section === "reservations" && (
        <EntityTable
          empty="No reservations for this project."
          rows={projectReservations.filter((r) => {
            if (!q) return true;
            const c = byId(customers, r.customerId);
            const p = byId(plots, r.plotId);
            return `${r.id} ${c?.name ?? ""} ${p?.number ?? ""} ${r.state}`.toLowerCase().includes(q);
          })}
          columns={[
            { h: "ID", cell: (r: Reservation) => <span className="numeric text-xs">{r.id}</span> },
            {
              h: "Plot",
              cell: (r) => byId(plots, r.plotId)?.number ?? r.plotId,
            },
            {
              h: "Customer",
              cell: (r) => byId(customers, r.customerId)?.name ?? "—",
            },
            {
              h: "Amount",
              cell: (r) => <span className="numeric">{formatINR(r.amount)}</span>,
            },
            { h: "State", cell: (r) => <Chip tone="warning">{r.state}</Chip> },
            { h: "Expires", cell: (r) => r.expiresAt },
          ]}
        />
      )}

      {section === "bookings" && (
        <EntityTable
          empty="No bookings for this project."
          rows={projectBookings.filter((b) => {
            if (!q) return true;
            const c = byId(customers, b.customerId);
            const p = byId(plots, b.plotId);
            return `${b.id} ${c?.name ?? ""} ${p?.number ?? ""} ${b.stage}`.toLowerCase().includes(q);
          })}
          columns={[
            { h: "ID", cell: (b: Booking) => <span className="numeric text-xs">{b.id}</span> },
            {
              h: "Plot",
              cell: (b) => byId(plots, b.plotId)?.number ?? b.plotId,
            },
            {
              h: "Customer",
              cell: (b) => byId(customers, b.customerId)?.name ?? "—",
            },
            {
              h: "Amount",
              cell: (b) => <span className="numeric">{formatINR(b.amount, { compact: true })}</span>,
            },
            { h: "Stage", cell: (b) => <Chip tone="info">{b.stage}</Chip> },
            {
              h: "",
              cell: (b) => (
                <Link to="/bookings/$bookingId" params={{ bookingId: b.id }} className="text-xs text-primary">
                  Open
                </Link>
              ),
            },
          ]}
        />
      )}

      {createOpen && canEdit && (
        <SalesCreateSheet
          section={section}
          project={project}
          plots={plots}
          customers={customers}
          agents={projectAgents.length ? projectAgents : agents}
          nextId={nextId}
          onClose={() => setCreateOpen(false)}
          onCreateLead={(c) => {
            saveCustomer(c);
            setCreateOpen(false);
            setSection("leads");
          }}
          onCreateCustomer={(c) => {
            saveCustomer(c);
            setCreateOpen(false);
            setSection("customers");
          }}
          onCreateVisit={(v) => {
            saveVisit(v);
            setCreateOpen(false);
            setSection("visits");
          }}
          onCreateReservation={(r, plot) => {
            saveReservation(r);
            // Drive plot → RESERVED via allow-list when currently AVAILABLE / RESALE_AVAILABLE
            const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
            const result = applyStatusTransition({
              from,
              to: "RESERVED",
              reason: `Reservation ${r.id}`,
              actorId: session?.email ?? "admin",
              source: "SALES_FLOW",
            });
            if (result.ok) {
              savePlot({
                ...plot,
                status: toLegacyPlotStatus(result.to) as Plot["status"],
                canonicalStatus: result.to,
                customerId: r.customerId,
                agentId: r.agentId,
                statusHistory: [
                  ...(plot.statusHistory ?? []),
                  {
                    fromStatus: result.entry.fromStatus,
                    toStatus: result.entry.toStatus,
                    reason: result.entry.reason,
                    actorId: result.entry.actorId,
                    source: result.entry.source,
                    createdAt: result.entry.createdAt,
                  },
                ],
              });
            }
            setCreateOpen(false);
            setSection("reservations");
          }}
          onCreateBooking={(b, plot) => {
            saveBooking(b);
            const actorId = session?.email ?? "admin";
            let working = { ...plot };
            const from0 = toCanonicalPlotStatus(working.canonicalStatus ?? working.status);
            if (from0 === "AVAILABLE" || from0 === "RESALE_AVAILABLE") {
              const mid = applyStatusTransition({
                from: from0,
                to: "RESERVED",
                reason: `Booking ${b.id} (pre-reserve)`,
                actorId,
                source: "SALES_FLOW",
              });
              if (mid.ok) {
                working = {
                  ...working,
                  status: toLegacyPlotStatus(mid.to) as Plot["status"],
                  canonicalStatus: mid.to,
                  statusHistory: [
                    ...(working.statusHistory ?? []),
                    {
                      fromStatus: mid.entry.fromStatus,
                      toStatus: mid.entry.toStatus,
                      reason: mid.entry.reason,
                      actorId: mid.entry.actorId,
                      source: mid.entry.source,
                      createdAt: mid.entry.createdAt,
                    },
                  ],
                };
              }
            }
            const result = applyStatusTransition({
              from: working.canonicalStatus ?? working.status,
              to: "BOOKED",
              reason: `Booking ${b.id}`,
              actorId,
              source: "SALES_FLOW",
            });
            if (result.ok) {
              savePlot({
                ...working,
                status: toLegacyPlotStatus(result.to) as Plot["status"],
                canonicalStatus: result.to,
                customerId: b.customerId,
                agentId: b.agentId,
                statusHistory: [
                  ...(working.statusHistory ?? []),
                  {
                    fromStatus: result.entry.fromStatus,
                    toStatus: result.entry.toStatus,
                    reason: result.entry.reason,
                    actorId: result.entry.actorId,
                    source: result.entry.source,
                    createdAt: result.entry.createdAt,
                  },
                ],
              });
            }
            setCreateOpen(false);
            setSection("bookings");
          }}
        />
      )}
    </div>
  );
}

function EntityTable<T extends { id?: string }>({
  rows,
  columns,
  empty,
}: {
  rows: T[];
  columns: { h: string; cell: (row: T) => ReactNode }[];
  empty: string;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="max-h-[min(560px,55vh)] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-low/95 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase backdrop-blur-sm">
            <tr>
              {columns.map((c) => (
                <th key={c.h || "action"} className="px-3 py-3">
                  {c.h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={(row as { id?: string }).id ?? i}
                  className="border-b border-outline-variant/10 hover:bg-surface-low/40"
                >
                  {columns.map((c) => (
                    <td key={c.h || "action"} className="px-3 py-2.5">
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-outline-variant/10 px-3 py-2 text-xs text-muted-foreground numeric">
        {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>
    </Panel>
  );
}

function SalesCreateSheet({
  section,
  project,
  plots,
  customers,
  agents,
  nextId,
  onClose,
  onCreateLead,
  onCreateCustomer,
  onCreateVisit,
  onCreateReservation,
  onCreateBooking,
}: {
  section: SectionKey;
  project: Project;
  plots: Plot[];
  customers: Customer[];
  agents: Agent[];
  nextId: (prefix: string, list: { id: string }[]) => string;
  onClose: () => void;
  onCreateLead: (c: Customer) => void;
  onCreateCustomer: (c: Customer) => void;
  onCreateVisit: (v: SiteVisit) => void;
  onCreateReservation: (r: Reservation, plot: Plot) => void;
  onCreateBooking: (b: Booking, plot: Plot) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [plotId, setPlotId] = useState(
    plots.find((p) => toCanonicalPlotStatus(p.canonicalStatus ?? p.status) === "AVAILABLE")?.id ??
      plots[0]?.id ??
      "",
  );
  const [amount, setAmount] = useState(50000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const title =
    section === "leads"
      ? "New lead"
      : section === "customers"
        ? "New customer"
        : section === "visits"
          ? "Schedule site visit"
          : section === "reservations"
            ? "New reservation"
            : section === "bookings"
              ? "New booking"
              : "Assign note";

  const save = () => {
    setError(null);
    if (section === "agents") {
      setError("Assign agents from Team / global Agents — use project.agents in a later slice.");
      return;
    }
    if (section === "leads" || section === "customers") {
      if (!name.trim() || !phone.trim()) {
        setError("Name and phone are required.");
        return;
      }
      const id = nextId("CUS-", customers);
      const c: Customer = {
        id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || `${id.toLowerCase()}@example.com`,
        city: project.city,
        source,
        stage: section === "leads" ? "Lead" : "Lead",
        agentId: agentId || agents[0]?.id || "brag0001",
        plots: [],
        totalValue: 0,
        paid: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      if (section === "leads") onCreateLead(c);
      else onCreateCustomer(c);
      return;
    }
    if (section === "visits") {
      if (!customerId) {
        setError("Pick a customer.");
        return;
      }
      const v: SiteVisit = {
        id: nextId("VIS-", customers),
        customerId,
        projectId: project.id,
        agentId: agentId || agents[0]?.id || "brag0001",
        date,
        time,
        status: "Scheduled" satisfies SiteVisitStatus,
      };
      if (notes.trim()) v.notes = notes.trim();
      onCreateVisit(v);
      return;
    }
    if (section === "reservations") {
      const plot = byId(plots, plotId);
      if (!plot || !customerId) {
        setError("Plot and customer required.");
        return;
      }
      const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
      if (from !== "AVAILABLE" && from !== "RESALE_AVAILABLE") {
        setError(
          `Plot ${plot.number} is ${PLOT_STATUS_LABEL[from]} — reserve only from Available / Resale available.`,
        );
        return;
      }
      const expires = new Date();
      expires.setDate(expires.getDate() + (project.settings?.reservationDays ?? 7));
      const r: Reservation = {
        id: nextId("RSV-", customers),
        plotId: plot.id,
        customerId,
        agentId: agentId || agents[0]?.id || "brag0001",
        amount,
        createdAt: date,
        expiresAt: expires.toISOString().slice(0, 10),
        state: "Active",
      };
      if (notes.trim()) r.notes = notes.trim();
      onCreateReservation(r, plot);
      return;
    }
    if (section === "bookings") {
      const plot = byId(plots, plotId);
      if (!plot || !customerId) {
        setError("Plot and customer required.");
        return;
      }
      const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
      if (!["AVAILABLE", "RESERVED", "RESALE_AVAILABLE"].includes(from)) {
        setError(`Plot ${plot.number} is ${PLOT_STATUS_LABEL[from]} — cannot book from this status.`);
        return;
      }
      const b: Booking = {
        id: nextId("BKG-", customers),
        customerId,
        plotId: plot.id,
        projectId: project.id,
        agentId: agentId || agents[0]?.id || "brag0001",
        amount: amount || plot.areaSqYd * plot.pricePerSqYd,
        paid: Math.round(amount * 0.1),
        date,
        stage: "Confirmed",
      };
      if (notes.trim()) b.notes = notes.trim();
      onCreateBooking(b, plot);
    }
  };

  return (
    <EditSheet open onClose={onClose} title={title} description={project.name} onSave={save}>
      <div className="space-y-3">
        {(section === "leads" || section === "customers") && (
          <>
            <Field label="Name">
              <TextInput value={name} onChange={setName} />
            </Field>
            <Field label="Phone">
              <TextInput value={phone} onChange={setPhone} />
            </Field>
            <Field label="Email">
              <TextInput value={email} onChange={setEmail} />
            </Field>
            <Field label="Source">
              <TextInput value={source} onChange={setSource} />
            </Field>
            <Field label="Agent">
              <SelectInput
                value={agentId}
                onChange={setAgentId}
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
          </>
        )}
        {(section === "visits" || section === "reservations" || section === "bookings") && (
          <>
            <Field label="Customer">
              <SelectInput
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Agent">
              <SelectInput
                value={agentId}
                onChange={setAgentId}
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
          </>
        )}
        {section === "visits" && (
          <>
            <Field label="Date">
              <TextInput value={date} onChange={setDate} />
            </Field>
            <Field label="Time">
              <TextInput value={time} onChange={setTime} />
            </Field>
          </>
        )}
        {(section === "reservations" || section === "bookings") && (
          <>
            <Field label="Plot">
              <SelectInput
                value={plotId}
                onChange={setPlotId}
                options={plots.map((p) => ({
                  value: p.id,
                  label: `${p.number} · ${PLOT_STATUS_LABEL[toCanonicalPlotStatus(p.canonicalStatus ?? p.status)]}`,
                }))}
              />
            </Field>
            <Field label="Amount (₹)">
              <NumberInput value={amount} onChange={setAmount} />
            </Field>
            <Field label="Date">
              <TextInput value={date} onChange={setDate} />
            </Field>
          </>
        )}
        {section !== "agents" && (
          <Field label="Notes">
            <TextareaInput value={notes} onChange={setNotes} />
          </Field>
        )}
        {section === "agents" && (
          <p className="text-sm text-muted-foreground">
            Agent assignment to projects ships with the Team tab. Open global Agents to manage the roster.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </EditSheet>
  );
}
