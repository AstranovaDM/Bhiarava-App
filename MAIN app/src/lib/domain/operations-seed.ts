/**
 * Coherent P5 ops demo seed: INTERNAL / AGENT_VISIBLE / CUSTOMER_PROFILE_RELATED
 * docs, registration pipeline linked to bookings, resale cases from plots.
 */
import type { Booking, DocumentRecord, Plot, Registration } from "@/lib/mock-data";
import {
  legacyDocumentToProject,
  legacyRegistrationToCase,
  resaleCasesFromPlots,
  type ProjectDocument,
  type RegistrationCase,
  type ResaleCase,
} from "./operations";

export interface OperationsSeedBundle {
  documents: ProjectDocument[];
  registrations: RegistrationCase[];
  resales: ResaleCase[];
}

export function buildOperationsDemoSeed(input: {
  projectId: string;
  bookings: Booking[];
  plots: Plot[];
  documents: DocumentRecord[];
  registrations: Registration[];
}): OperationsSeedBundle {
  const { projectId } = input;
  const projectBookings = input.bookings.filter((b) => b.projectId === projectId);
  const projectPlots = input.plots.filter((p) => p.projectId === projectId);

  const fromLegacy = input.documents
    .filter((d) => d.projectId === projectId)
    .map((d) => legacyDocumentToProject(d));

  // Ensure each visibility class has at least one coherent row
  const extras: ProjectDocument[] = [];
  if (!fromLegacy.some((d) => d.visibility === "INTERNAL")) {
    extras.push({
      id: `DOC-INT-${projectId}`,
      projectId,
      name: `${projectId}-master-layout-internal.pdf`,
      docType: "Master layout",
      visibility: "INTERNAL",
      verified: "Verified",
      modified: "2026-09-01",
      sizeKb: 2400,
      uploadedBy: "admin@bhairava.com",
      notes: "Internal vault — not agent/customer browsable",
    });
  }
  if (!fromLegacy.some((d) => d.visibility === "AGENT_VISIBLE")) {
    extras.push({
      id: `DOC-AG-${projectId}`,
      projectId,
      name: `${projectId}-price-sheet-agent.pdf`,
      docType: "Other",
      visibility: "AGENT_VISIBLE",
      verified: "Verified",
      modified: "2026-09-05",
      sizeKb: 420,
      uploadedBy: "admin@bhairava.com",
    });
  }
  const b0 = projectBookings[0];
  if (b0 && !fromLegacy.some((d) => d.visibility === "CUSTOMER_PROFILE_RELATED")) {
    extras.push({
      id: `DOC-CUST-${b0.id}`,
      projectId,
      name: `${b0.id}-booking-form.pdf`,
      docType: "Agreement",
      visibility: "CUSTOMER_PROFILE_RELATED",
      customerId: b0.customerId,
      bookingId: b0.id,
      plotId: b0.plotId,
      verified: "Pending",
      modified: "2026-09-10",
      sizeKb: 310,
      uploadedBy: "admin@bhairava.com",
      notes: "Profile-related — not a vault browse item for customers in MAIN",
    });
  }

  const bookingById = new Map(projectBookings.map((b) => [b.id, b]));
  const registrations: RegistrationCase[] = input.registrations
    .filter((r) => bookingById.has(r.bookingId))
    .map((r) => legacyRegistrationToCase(r, projectId));

  // If none linked, seed a few from project bookings
  if (registrations.length === 0) {
    projectBookings.slice(0, 5).forEach((b, i) => {
      registrations.push({
        id: `REG-DEMO-${b.id}`,
        projectId,
        bookingId: b.id,
        customerId: b.customerId,
        plotId: b.plotId,
        stage: (["Documentation", "Ready", "Scheduled", "Completed"] as const)[i % 4]!,
        slot: `2026-09-${String(10 + i).padStart(2, "0")} · 11:00`,
        subRegistrar: "Shamshabad",
      });
    });
  }

  const resales = resaleCasesFromPlots(projectPlots, projectId);

  return {
    documents: [...extras, ...fromLegacy],
    registrations,
    resales,
  };
}

export function mergeOperationsSeed(
  existing: OperationsSeedBundle,
  seed: OperationsSeedBundle,
): OperationsSeedBundle {
  const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>();
    for (const x of b) map.set(x.id, x);
    for (const x of a) map.set(x.id, x);
    return Array.from(map.values());
  };
  return {
    documents: merge(existing.documents, seed.documents),
    registrations: merge(existing.registrations, seed.registrations),
    resales: merge(existing.resales, seed.resales),
  };
}
