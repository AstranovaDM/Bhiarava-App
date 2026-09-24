import { describe, expect, it } from "vitest";
import { PLATFORM_SEED } from "./seed";
import { customersForAgent, projectPlotForAgent } from "./projections";

describe("agent PII projection", () => {
  it("hides other agent customer PII while keeping status", () => {
    const reservedOther = PLATFORM_SEED.plots.find((p) => p.id === "PLT-102")!;
    const view = projectPlotForAgent(reservedOther, PLATFORM_SEED, "AGT-01");
    expect(view.status).toBe("RESERVED");
    expect(view.customer).toBeNull();
    expect(view.redacted).toBe(true);
  });

  it("shows own customer PII", () => {
    const booked = PLATFORM_SEED.plots.find((p) => p.id === "PLT-103")!;
    const view = projectPlotForAgent(booked, PLATFORM_SEED, "AGT-01");
    expect(view.customer?.name).toBe("Ananya Rao");
  });

  it("lists only assigned customers", () => {
    expect(customersForAgent(PLATFORM_SEED, "AGT-01").every((c) => c.agentId === "AGT-01")).toBe(true);
  });
});
