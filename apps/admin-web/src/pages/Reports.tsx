import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  PageHeader,
  Panel,
  PlotStatusChip,
  SectionTitle,
  plotStatusColors,
} from '@bhairava/ui-web';
import { api } from '../api';
import { DASH, display, errMsg, formatPaise, humanize, type AnyRow } from '../lib/data';

export type ReportFocus = 'sales' | 'inventory' | 'collections' | 'agents' | 'customers' | 'registrations' | 'resale';

type Breakdown = { title: string; aside?: string; rows: { key: string; label: ReactNode; count: number; color?: string }[] };

const TITLES: Record<ReportFocus, { title: string; description: string }> = {
  sales: { title: 'Sales report', description: 'Bookings, reservations and pipeline volume across the organization.' },
  inventory: { title: 'Inventory report', description: 'Plot inventory by canonical status across every project.' },
  collections: { title: 'Collections report', description: 'Recorded (non-voided) payments and how they were received.' },
  agents: { title: 'Agents report', description: 'Channel partner roster and the pipeline they drive.' },
  customers: { title: 'Customers report', description: 'Customer base size, geography and conversion into bookings.' },
  registrations: { title: 'Registrations report', description: 'Sale-deed registrations by status.' },
  resale: { title: 'Resale report', description: 'Resale listings by status.' },
};

function groupBy(rows: AnyRow[], key: (r: AnyRow) => unknown): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(key(r) ?? '') || 'Unspecified';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map, ([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

/** Supplementary list endpoint per focus, for a breakdown the summary doesn't carry. */
const SECONDARY: Partial<Record<ReportFocus, () => Promise<AnyRow[]>>> = {
  collections: () => api.payments.list() as Promise<AnyRow[]>,
  agents: () => api.agents.list(),
  customers: () => api.customers.list() as Promise<AnyRow[]>,
  registrations: () => api.registrations.list(),
  resale: () => api.resales.list(),
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function BreakdownPanel({ data }: { data: Breakdown }) {
  const total = data.rows.reduce((s, r) => s + r.count, 0);
  return (
    <Panel>
      <SectionTitle aside={data.aside ?? `${total} total`}>{data.title}</SectionTitle>
      {data.rows.length === 0 ? (
        <EmptyState compact title="No data yet" description="Records will appear here as they are created." />
      ) : (
        <ul className="space-y-3">
          {data.rows.map((r) => {
            const pct = total ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0 truncate">{r.label}</div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-c">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pct}%`, ...(r.color ? { background: r.color } : {}) }}
                  />
                </div>
                <span className="numeric w-16 text-right text-xs text-muted-foreground">
                  {r.count} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function ReportsPage({ focus }: { focus: ReportFocus }) {
  const [data, setData] = useState<AnyRow | null>(null);
  const [secondary, setSecondary] = useState<AnyRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
    setErr('');
    const extra = SECONDARY[focus];
    Promise.all([api.reports.summary(), extra ? extra().catch(() => [] as AnyRow[]) : Promise.resolve([] as AnyRow[])])
      .then(([summary, rows]) => {
        setData(summary as AnyRow);
        setSecondary(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => setErr(errMsg(e)))
      .finally(() => setLoading(false));
  }, [focus, nonce]);

  const inv = ((data?.inventoryByStatus as AnyRow[]) || []).map((r) => ({ status: String(r.status), count: num(r.count) }));
  const invCount = (s: string[]) => inv.filter((r) => s.includes(r.status)).reduce((a, r) => a + r.count, 0);
  const totalPlots = inv.reduce((a, r) => a + r.count, 0);
  const collectedPaise = (data?.collections as AnyRow)?.amountPaise;
  const paymentCount = num((data?.collections as AnyRow)?.paymentCount);

  const metrics: { label: string; value: ReactNode; hint?: string }[] = useMemo(() => {
    if (!data) return [];
    switch (focus) {
      case 'inventory':
        return [
          { label: 'Total plots', value: totalPlots },
          { label: 'Available', value: invCount(['AVAILABLE', 'RESALE_AVAILABLE']) },
          { label: 'Reserved / Booked', value: `${invCount(['RESERVED'])} / ${invCount(['BOOKED'])}` },
          { label: 'Sold / Registered', value: `${invCount(['SOLD'])} / ${invCount(['REGISTERED'])}` },
        ];
      case 'collections':
        return [
          { label: 'Collected', value: formatPaise(collectedPaise), hint: 'Non-voided payments' },
          { label: 'Payments', value: paymentCount },
          { label: 'Bookings', value: display(data.bookings) },
          { label: 'Avg. ticket', value: paymentCount ? formatPaise(num(collectedPaise) / paymentCount) : DASH },
        ];
      case 'agents':
        return [
          { label: 'Agents', value: display(data.agents) },
          { label: 'Leads', value: display(data.leads) },
          { label: 'Bookings', value: display(data.bookings) },
          { label: 'Active reservations', value: display(data.activeReservations) },
        ];
      case 'customers':
        return [
          { label: 'Customers', value: display(data.customers) },
          { label: 'Leads', value: display(data.leads) },
          { label: 'Bookings', value: display(data.bookings) },
          {
            label: 'Booking conversion',
            value: num(data.customers) ? `${Math.round((num(data.bookings) / num(data.customers)) * 100)}%` : DASH,
            hint: 'Bookings ÷ customers',
          },
        ];
      case 'registrations':
        return [
          { label: 'Registrations', value: secondary.length },
          { label: 'Registered plots', value: invCount(['REGISTERED']) },
          { label: 'Sold (awaiting deed)', value: invCount(['SOLD']) },
          { label: 'Under documentation', value: invCount(['UNDER_DOCUMENTATION']) },
        ];
      case 'resale':
        return [
          { label: 'Resale listings', value: secondary.length },
          { label: 'Resale-available plots', value: invCount(['RESALE_AVAILABLE']) },
          { label: 'Registered plots', value: invCount(['REGISTERED']) },
          { label: 'Projects', value: display(data.projects) },
        ];
      case 'sales':
      default:
        return [
          { label: 'Bookings', value: display(data.bookings) },
          { label: 'Active reservations', value: display(data.activeReservations) },
          { label: 'Leads', value: display(data.leads) },
          { label: 'Collected', value: formatPaise(collectedPaise) },
        ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, secondary, focus]);

  const inventoryBreakdown: Breakdown = {
    title: 'Inventory by status',
    aside: `${totalPlots} plots`,
    rows: inv.map((r) => ({
      key: r.status,
      label: <PlotStatusChip status={r.status} />,
      count: r.count,
      color: plotStatusColors(r.status).solid,
    })),
  };

  const secondaryBreakdown: Breakdown | null = (() => {
    const chip = (k: string) => <Chip>{humanize(k)}</Chip>;
    switch (focus) {
      case 'collections':
        return {
          title: 'Payments by method',
          rows: groupBy(secondary.filter((p) => !p.voidedAt), (p) => p.method).map((g) => ({ key: g.key, label: chip(g.key), count: g.count })),
        };
      case 'agents':
        return {
          title: 'Agents by region',
          rows: groupBy(secondary, (a) => a.region).map((g) => ({ key: g.key, label: <span className="text-sm">{g.key}</span>, count: g.count })),
        };
      case 'customers':
        return {
          title: 'Customers by city',
          rows: groupBy(secondary, (c) => c.city).slice(0, 10).map((g) => ({ key: g.key, label: <span className="text-sm">{g.key}</span>, count: g.count })),
        };
      case 'registrations':
        return {
          title: 'Registrations by status',
          rows: groupBy(secondary, (r) => r.status).map((g) => ({ key: g.key, label: chip(g.key), count: g.count })),
        };
      case 'resale':
        return {
          title: 'Resale listings by status',
          rows: groupBy(secondary, (r) => r.status).map((g) => ({ key: g.key, label: chip(g.key), count: g.count })),
        };
      default:
        return null;
    }
  })();

  const meta = TITLES[focus];

  return (
    <>
      <PageHeader eyebrow="Reports" title={meta.title} description={meta.description} />
      {err ? (
        <ErrorState title="Couldn't load report" error={err} onRetry={() => setNonce((n) => n + 1)} />
      ) : loading ? (
        <LoadingState variant="metrics" rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <Metric key={m.label} accent={i === 0} label={m.label} value={m.value} hint={m.hint} />
            ))}
          </div>
          <div className="grid gap-4 pt-6 lg:grid-cols-2">
            {secondaryBreakdown ? <BreakdownPanel data={secondaryBreakdown} /> : null}
            <BreakdownPanel data={inventoryBreakdown} />
          </div>
        </>
      )}
    </>
  );
}
