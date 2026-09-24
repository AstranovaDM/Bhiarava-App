import { describe, expect, it } from "vitest";
import {
  canMutateOperations,
  canSeeDocumentVisibility,
  canViewOperations,
  filterDocumentsForRole,
  filterRegistrationsForRole,
  filterResalesForRole,
  legacyDocumentToProject,
  operationsAccessForRole,
  resaleCasesFromPlots,
  type ProjectDocument,
  type RegistrationCase,
} from "../operations";
import { buildOperationsDemoSeed } from "../operations-seed";
import type { Booking, DocumentRecord, Plot, Registration } from "@/lib/mock-data";

const baseDoc = (over: Partial<ProjectDocument> = {}): ProjectDocument => ({
  id: "DOC-1",
  projectId: "PRJ-01",
  name: "a.pdf",
  docType: "Agreement",
  visibility: "AGENT_VISIBLE",
  verified: "Verified",
  modified: "2026-09-01",
  sizeKb: 100,
  uploadedBy: "admin@bhairava.com",
  ...over,
});

describe("operations access", () => {
  it("Founder/Admin full; Finance operate; Agent agent; Viewer read; Customer denied", () => {
    expect(operationsAccessForRole("Founder")).toBe("full");
    expect(operationsAccessForRole("Administrator")).toBe("full");
    expect(operationsAccessForRole("Finance")).toBe("operate");
    expect(operationsAccessForRole("Agent")).toBe("agent");
    expect(operationsAccessForRole("Viewer")).toBe("read");
    expect(operationsAccessForRole("Customer")).toBe("denied");
    expect(canViewOperations("Customer")).toBe(false);
    expect(canMutateOperations("Finance")).toBe(true);
    expect(canMutateOperations("Agent")).toBe(false);
    expect(canMutateOperations("Viewer")).toBe(false);
  });
});

describe("document visibility", () => {
  it("Agent cannot see INTERNAL; can see AGENT_VISIBLE", () => {
    expect(canSeeDocumentVisibility("INTERNAL", "Agent")).toBe(false);
    expect(canSeeDocumentVisibility("AGENT_VISIBLE", "Agent")).toBe(true);
  });

  it("filters CUSTOMER_PROFILE_RELATED to assigned customers for agents", () => {
    const docs = [
      baseDoc({ id: "1", visibility: "INTERNAL" }),
      baseDoc({ id: "2", visibility: "AGENT_VISIBLE" }),
      baseDoc({
        id: "3",
        visibility: "CUSTOMER_PROFILE_RELATED",
        customerId: "C-1",
        docType: "KYC",
      }),
      baseDoc({
        id: "4",
        visibility: "CUSTOMER_PROFILE_RELATED",
        customerId: "C-2",
        docType: "Receipt",
      }),
    ];
    const visible = filterDocumentsForRole(docs, {
      projectId: "PRJ-01",
      role: "Agent",
      agentAssignedCustomerIds: ["C-1"],
    });
    expect(visible.map((d) => d.id).sort()).toEqual(["2", "3"]);
  });

  it("Customer role gets empty vault list", () => {
    const docs = [baseDoc({ visibility: "AGENT_VISIBLE" })];
    expect(filterDocumentsForRole(docs, { projectId: "PRJ-01", role: "Customer" })).toEqual([]);
  });
});

describe("registration / resale filters", () => {
  it("Agent only sees registrations for own bookings", () => {
    const bookings = [
      { id: "B1", projectId: "PRJ-01", agentId: "A1", customerId: "C1", plotId: "P1" },
      { id: "B2", projectId: "PRJ-01", agentId: "A2", customerId: "C2", plotId: "P2" },
    ] as Booking[];
    const rows: RegistrationCase[] = [
      {
        id: "R1",
        projectId: "PRJ-01",
        bookingId: "B1",
        customerId: "C1",
        plotId: "P1",
        stage: "Ready",
        slot: "2026-09-10",
        subRegistrar: "X",
      },
      {
        id: "R2",
        projectId: "PRJ-01",
        bookingId: "B2",
        customerId: "C2",
        plotId: "P2",
        stage: "Ready",
        slot: "2026-09-11",
        subRegistrar: "X",
      },
    ];
    const mine = filterRegistrationsForRole(rows, bookings, {
      projectId: "PRJ-01",
      role: "Agent",
      agentId: "A1",
    });
    expect(mine.map((r) => r.id)).toEqual(["R1"]);
  });

  it("resale cases derived from plot status without invented counts", () => {
    const plots = [
      {
        id: "P1",
        projectId: "PRJ-01",
        number: "1",
        status: "resale",
        areaSqYd: 200,
        pricePerSqYd: 25000,
        facing: "East",
        points: [],
      },
      {
        id: "P2",
        projectId: "PRJ-01",
        number: "2",
        status: "available",
        areaSqYd: 200,
        pricePerSqYd: 25000,
        facing: "East",
        points: [],
      },
    ] as Plot[];
    const cases = resaleCasesFromPlots(plots, "PRJ-01");
    expect(cases).toHaveLength(1);
    expect(cases[0]!.askPrice).toBe(200 * 25000);
    expect(filterResalesForRole(cases, { projectId: "PRJ-01", role: "Viewer" })).toHaveLength(1);
  });
});

describe("legacy lift + demo seed", () => {
  it("lifts DocumentRecord with conservative visibility", () => {
    const d = {
      id: "DOC-X",
      name: "layout.pdf",
      type: "Layout approval",
      customerId: "C1",
      projectId: "PRJ-01",
      plotId: "P1",
      verified: "Verified",
      modified: "2026-08-01",
      sizeKb: 10,
    } as DocumentRecord;
    const lifted = legacyDocumentToProject(d);
    expect(lifted.visibility).toBe("INTERNAL");
    expect(lifted.docType).toBe("Layout approval");
  });

  it("buildOperationsDemoSeed ensures all three visibility classes", () => {
    const bookings = [
      {
        id: "B1",
        projectId: "PRJ-01",
        customerId: "C1",
        plotId: "P1",
        agentId: "A1",
        amount: 1,
        paid: 0,
        stage: "Confirmed",
        createdAt: "2026-01-01",
      },
    ] as unknown as Booking[];
    const plots = [
      {
        id: "P1",
        projectId: "PRJ-01",
        number: "1",
        status: "resale",
        areaSqYd: 100,
        pricePerSqYd: 1000,
        facing: "East",
        points: [],
      },
    ] as Plot[];
    const seed = buildOperationsDemoSeed({
      projectId: "PRJ-01",
      bookings,
      plots,
      documents: [],
      registrations: [] as Registration[],
    });
    const vis = new Set(seed.documents.map((d) => d.visibility));
    expect(vis.has("INTERNAL")).toBe(true);
    expect(vis.has("AGENT_VISIBLE")).toBe(true);
    expect(vis.has("CUSTOMER_PROFILE_RELATED")).toBe(true);
    expect(seed.registrations.length).toBeGreaterThan(0);
    expect(seed.resales.length).toBe(1);
  });
});
