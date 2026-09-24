import { describe, expect, it } from "vitest";
import {
  deriveProjectFinanceSummary,
  financeAccessForRole,
  filterPaymentsForFinanceRole,
} from "../finance";
import type { Booking, Payment } from "@/lib/mock-data";

describe("finance permissions", () => {
  it("matrix: Founder/Admin full; Finance operate; Agent own; Viewer read; Customer denied", () => {
    expect(financeAccessForRole("Founder")).toBe("full");
    expect(financeAccessForRole("Administrator")).toBe("full");
    expect(financeAccessForRole("Finance")).toBe("operate");
    expect(financeAccessForRole("Agent")).toBe("own");
    expect(financeAccessForRole("Viewer")).toBe("read");
    expect(financeAccessForRole("Customer")).toBe("denied");
  });
});

describe("finance dashboard derived", () => {
  const bookings: Booking[] = [
    {
      id: "B1",
      customerId: "C1",
      plotId: "P1",
      projectId: "PRJ-01",
      agentId: "brag0001",
      amount: 1000000,
      paid: 100000,
      date: "2026-09-01",
      stage: "Confirmed",
    },
    {
      id: "B2",
      customerId: "C2",
      plotId: "P2",
      projectId: "PRJ-01",
      agentId: "brag0002",
      amount: 2000000,
      paid: 200000,
      date: "2026-09-02",
      stage: "Confirmed",
    },
  ];
  const payments: Payment[] = [
    { id: "PAY1", bookingId: "B1", customerId: "C1", amount: 50000, mode: "UPI", reference: "R1", date: "2026-09-01", status: "Succeeded" },
    { id: "PAY2", bookingId: "B2", customerId: "C2", amount: 80000, mode: "NEFT", reference: "R2", date: "2026-09-02", status: "Pending" },
  ];

  it("aggregates collections without inventing metrics", () => {
    const s = deriveProjectFinanceSummary({
      projectId: "PRJ-01",
      bookings,
      payments,
      role: "Administrator",
    });
    expect(s.collectionsTotal).toBe(50000);
    expect(s.pendingAmount).toBe(80000);
    expect(s.receiptsCount).toBe(1);
  });

  it("scopes agent to own bookings only", () => {
    const rows = filterPaymentsForFinanceRole(payments, bookings, {
      projectId: "PRJ-01",
      role: "Agent",
      agentId: "brag0001",
    });
    expect(rows.map((r) => r.id)).toEqual(["PAY1"]);
  });
});
