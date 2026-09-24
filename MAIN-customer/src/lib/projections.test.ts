import { describe, expect, it } from "vitest";
import { PLATFORM_SEED } from "./seed";
import { projectPlotForCustomer } from "./projections";

describe("customer plot projection", () => {
  it("shows detail for AVAILABLE / RESALE_AVAILABLE only", () => {
    const available = projectPlotForCustomer(PLATFORM_SEED.plots.find((p) => p.status === "AVAILABLE")!);
    expect(available.detailVisible).toBe(true);
    expect(available.price).toBeTruthy();

    const booked = projectPlotForCustomer(PLATFORM_SEED.plots.find((p) => p.status === "BOOKED")!);
    expect(booked.detailVisible).toBe(false);
    expect(booked.price).toBeNull();
    expect(booked.status).toBe("BOOKED");
  });

  it("never exposes customer holder identity", () => {
    const booked = projectPlotForCustomer(PLATFORM_SEED.plots.find((p) => p.id === "PLT-103")!);
    expect(JSON.stringify(booked)).not.toContain("Ananya");
    expect(JSON.stringify(booked)).not.toContain("CUS-");
  });
});
