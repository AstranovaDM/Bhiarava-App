/**
 * P4 Finance domain — project money views (collections / payments / commissions).
 * Derived only from existing payment/booking mock data; typed empty when missing.
 */
import type { Booking, Payment } from "@/lib/mock-data";
import { normalizeRole, type AppRole } from "./project-permissions";

export type FinanceAccess = "full" | "operate" | "own" | "read" | "denied";

export function financeAccessForRole(role: unknown): FinanceAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance") return "operate";
  if (r === "Agent" || r === "Sales") return "own";
  if (r === "Viewer") return "read";
  return "denied";
}

export function canViewFinance(role: unknown): boolean {
  return financeAccessForRole(role) !== "denied";
}

export function canOperateFinance(role: unknown): boolean {
  const a = financeAccessForRole(role);
  return a === "full" || a === "operate";
}

export interface FinanceDashboardSummary {
  collectionsTotal: number | null;
  collectionsCount: number;
  pendingAmount: number | null;
  receiptsCount: number;
  /** Agent-own commissions derived from booking paid * rate when agent scoped; null if unavailable */
  commissionsTotal: number | null;
  bookingsWithPayments: number;
  unavailableReason?: string;
}

const DEFAULT_COMMISSION_RATE = 0.02;

export function deriveProjectFinanceSummary(input: {
  projectId: string;
  bookings: Booking[];
  payments: Payment[];
  role: unknown;
  agentId?: string | null;
}): FinanceDashboardSummary {
  const access = financeAccessForRole(input.role);
  let bookings = input.bookings.filter((b) => b.projectId === input.projectId);
  if (access === "own" && input.agentId) {
    bookings = bookings.filter((b) => b.agentId === input.agentId);
  }
  const bookingIds = new Set(bookings.map((b) => b.id));
  let payments = input.payments.filter((p) => bookingIds.has(p.bookingId));
  if (access === "own" && input.agentId) {
    const custOk = new Set(bookings.map((b) => b.customerId));
    payments = payments.filter((p) => custOk.has(p.customerId));
  }

  if (payments.length === 0 && bookings.length === 0) {
    return {
      collectionsTotal: null,
      collectionsCount: 0,
      pendingAmount: null,
      receiptsCount: 0,
      commissionsTotal: null,
      bookingsWithPayments: 0,
      unavailableReason: "No payment records for this project scope yet",
    };
  }

  const succeeded = payments.filter((p) => p.status === "Succeeded");
  const pending = payments.filter((p) => p.status === "Pending");
  const collectionsTotal = succeeded.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.amount, 0);
  const commissionsTotal =
    access === "own" || access === "full" || access === "operate" || access === "read"
      ? Math.round(bookings.reduce((s, b) => s + (b.paid || 0), 0) * DEFAULT_COMMISSION_RATE)
      : null;

  return {
    collectionsTotal,
    collectionsCount: succeeded.length,
    pendingAmount,
    receiptsCount: succeeded.length,
    commissionsTotal,
    bookingsWithPayments: new Set(payments.map((p) => p.bookingId)).size,
  };
}

export function filterPaymentsForFinanceRole(
  payments: Payment[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): Payment[] {
  const access = financeAccessForRole(opts.role);
  let projectBookings = bookings.filter((b) => b.projectId === opts.projectId);
  if (access === "own" && opts.agentId) {
    projectBookings = projectBookings.filter((b) => b.agentId === opts.agentId);
  }
  const ids = new Set(projectBookings.map((b) => b.id));
  return payments.filter((p) => ids.has(p.bookingId));
}

export type { AppRole };
