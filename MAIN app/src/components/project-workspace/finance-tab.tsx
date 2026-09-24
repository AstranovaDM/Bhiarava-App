import { useMemo } from "react";
import { Chip, Panel, SectionTitle } from "@/components/kit";
import { payments as seedPayments, byId, formatINR, type Payment } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import type { Project } from "@/lib/mock-data";
import {
  canOperateFinance,
  canViewFinance,
  deriveProjectFinanceSummary,
  filterPaymentsForFinanceRole,
  financeAccessForRole,
} from "@/lib/domain/finance";

export function ProjectFinanceTab({ project }: { project: Project }) {
  const session = getSession();
  const access = financeAccessForRole(session?.role);
  const { bookings, agents, customers } = useData();

  const sessionAgentId = useMemo(() => {
    const email = (session?.email ?? "").toLowerCase();
    return agents.find((a) => (a.email ?? "").toLowerCase() === email)?.id ?? null;
  }, [agents, session?.email]);

  if (!canViewFinance(session?.role)) {
    return (
      <Panel className="text-center">
        <SectionTitle>Finance access denied</SectionTitle>
        <p className="pt-2 text-sm text-muted-foreground">Customer roles cannot open project Finance in MAIN.</p>
      </Panel>
    );
  }

  const summary = deriveProjectFinanceSummary({
    projectId: project.id,
    bookings,
    payments: seedPayments,
    role: session?.role,
    agentId: sessionAgentId,
  });

  const rows = filterPaymentsForFinanceRole(seedPayments, bookings, {
    projectId: project.id,
    role: session?.role,
    agentId: sessionAgentId,
  }).slice(0, 40);

  return (
    <div className="space-y-4" data-testid="finance-workspace">
      {access === "read" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Finance is read-only for Viewer.
        </div>
      )}
      {access === "own" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Agent finance view — own commissions / collections only.
        </div>
      )}
      {access === "operate" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Finance role — money views operable; master sales mutation stays outside this tab.
        </div>
      )}

      <Panel>
        <SectionTitle>Project finance</SectionTitle>
        <p className="pt-1 text-sm text-muted-foreground">
          Collections, receipts and commissions derived from payment records — no invented metrics.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="finance-dashboard">
        <Metric label="Collections" value={summary.collectionsTotal} count={summary.collectionsCount} />
        <Metric label="Pending" value={summary.pendingAmount} />
        <Metric label="Receipts" value={null} count={summary.receiptsCount} countOnly />
        <Metric label="Commissions (est. 2%)" value={summary.commissionsTotal} />
        <Metric label="Bookings with payments" value={null} count={summary.bookingsWithPayments} countOnly />
      </div>

      {summary.unavailableReason && (
        <Panel>
          <p className="text-sm text-muted-foreground">{summary.unavailableReason}</p>
        </Panel>
      )}

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-outline-variant/10 px-3 py-3">
          <SectionTitle>Payments</SectionTitle>
          {!canOperateFinance(session?.role) && access !== "own" && (
            <p className="pt-1 text-xs text-muted-foreground">View only</p>
          )}
        </div>
        <div className="max-h-[min(480px,50vh)] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-low/95 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Mode</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No payments in scope for this project / role.
                  </td>
                </tr>
              ) : (
                rows.map((p: Payment) => (
                  <tr key={p.id} className="border-b border-outline-variant/10">
                    <td className="px-3 py-2.5 numeric text-xs">{p.id}</td>
                    <td className="px-3 py-2.5">{byId(customers, p.customerId)?.name ?? p.customerId}</td>
                    <td className="px-3 py-2.5 numeric">{formatINR(p.amount)}</td>
                    <td className="px-3 py-2.5">{p.mode}</td>
                    <td className="px-3 py-2.5">
                      <Chip tone={p.status === "Succeeded" ? "positive" : p.status === "Pending" ? "warning" : "neutral"}>
                        {p.status}
                      </Chip>
                    </td>
                    <td className="px-3 py-2.5">{p.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-outline-variant/10 px-3 py-2 text-xs text-muted-foreground numeric">
          {rows.length} payment{rows.length === 1 ? "" : "s"} shown
        </p>
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  count,
  countOnly,
}: {
  label: string;
  value: number | null;
  count?: number;
  countOnly?: boolean;
}) {
  return (
    <Panel>
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="pt-2 text-2xl font-semibold numeric tabular-nums">
        {countOnly
          ? (count ?? 0)
          : value === null
            ? "—"
            : formatINR(value, { compact: true })}
      </p>
      {!countOnly && typeof count === "number" && (
        <p className="pt-1 text-xs text-muted-foreground">{count} txns</p>
      )}
      {value === null && !countOnly && (
        <p className="pt-1 text-xs text-muted-foreground">Unavailable</p>
      )}
    </Panel>
  );
}
