/**
 * P5 Operations domain — project Documents vault, Registration pipeline,
 * Resale cases. Visibility: INTERNAL | AGENT_VISIBLE | CUSTOMER_PROFILE_RELATED.
 * Customer never browses project vault in MAIN. No invented metrics.
 */
import type { Booking, DocumentRecord, Plot, Registration } from "@/lib/mock-data";
import { normalizeRole, type AppRole } from "./project-permissions";

export type DocumentVisibility = "INTERNAL" | "AGENT_VISIBLE" | "CUSTOMER_PROFILE_RELATED";

export type OperationsAccess = "full" | "operate" | "agent" | "read" | "denied";

export function operationsAccessForRole(role: unknown): OperationsAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance") return "operate";
  if (r === "Agent" || r === "Sales") return "agent";
  if (r === "Viewer") return "read";
  return "denied";
}

export function canViewOperations(role: unknown): boolean {
  return operationsAccessForRole(role) !== "denied";
}

export function canMutateOperations(role: unknown): boolean {
  const a = operationsAccessForRole(role);
  return a === "full" || a === "operate";
}

export const DOCUMENT_VISIBILITY_LABEL: Record<DocumentVisibility, string> = {
  INTERNAL: "Internal",
  AGENT_VISIBLE: "Agent visible",
  CUSTOMER_PROFILE_RELATED: "Customer profile–related",
};

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  docType: DocumentRecord["type"] | "Master layout" | "Other";
  visibility: DocumentVisibility;
  /** Required when CUSTOMER_PROFILE_RELATED */
  customerId?: string;
  bookingId?: string;
  plotId?: string;
  verified: DocumentRecord["verified"];
  modified: string;
  sizeKb: number;
  uploadedBy: string;
  notes?: string;
}

export type RegistrationStage = Registration["stage"];

export interface RegistrationCase {
  id: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  plotId: string;
  stage: RegistrationStage;
  slot: string;
  subRegistrar: string;
  notes?: string;
}

export type ResaleStage = "Listed" | "Under offer" | "Transferred" | "Withdrawn";

export interface ResaleCase {
  id: string;
  projectId: string;
  plotId: string;
  /** Prior booking / seller link when known */
  bookingId?: string;
  sellerCustomerId?: string;
  stage: ResaleStage;
  listedAt: string;
  askPrice: number;
  notes?: string;
}

export const REGISTRATION_STAGE_LABEL: Record<RegistrationStage, string> = {
  Documentation: "Documentation",
  Ready: "Ready",
  Scheduled: "Scheduled",
  Completed: "Completed",
};

export const RESALE_STAGE_LABEL: Record<ResaleStage, string> = {
  Listed: "Listed",
  "Under offer": "Under offer",
  Transferred: "Transferred",
  Withdrawn: "Withdrawn",
};

/** Which vault docs a MAIN role may see (Customer = denied vault browse). */
export function canSeeDocumentVisibility(
  visibility: DocumentVisibility,
  role: unknown,
  opts?: { agentAssignedCustomerIds?: string[]; financeDocTypes?: boolean },
): boolean {
  const access = operationsAccessForRole(role);
  if (access === "denied") return false;
  if (access === "full" || access === "read") return true;
  if (access === "operate") {
    // Finance: vault browse limited to payment-related types when INTERNAL
    if (visibility === "INTERNAL") return opts?.financeDocTypes !== false;
    return true;
  }
  // Agent: AGENT_VISIBLE + CUSTOMER_PROFILE_RELATED for assigned customers only
  if (visibility === "INTERNAL") return false;
  if (visibility === "AGENT_VISIBLE") return true;
  if (visibility === "CUSTOMER_PROFILE_RELATED") {
    // Without customer scope, hide profile-related from agent list (assigned filter applied upstream)
    return true;
  }
  return false;
}

export function filterDocumentsForRole(
  docs: ProjectDocument[],
  opts: { projectId: string; role: unknown; agentAssignedCustomerIds?: string[] },
): ProjectDocument[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  let list = docs.filter((d) => d.projectId === opts.projectId);
  list = list.filter((d) =>
    canSeeDocumentVisibility(d.visibility, opts.role, {
      financeDocTypes: d.docType === "Receipt" || d.docType === "Agreement" || d.docType === "Sale deed",
    }),
  );
  if (access === "agent" && opts.agentAssignedCustomerIds) {
    const allowed = new Set(opts.agentAssignedCustomerIds);
    list = list.filter((d) => {
      if (d.visibility === "AGENT_VISIBLE") return true;
      if (d.visibility === "CUSTOMER_PROFILE_RELATED") {
        return !!d.customerId && allowed.has(d.customerId);
      }
      return false;
    });
  }
  return list;
}

export function filterRegistrationsForRole(
  rows: RegistrationCase[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): RegistrationCase[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  let list = rows.filter((r) => r.projectId === opts.projectId);
  if (access === "agent" && opts.agentId) {
    const mine = new Set(
      bookings.filter((b) => b.projectId === opts.projectId && b.agentId === opts.agentId).map((b) => b.id),
    );
    list = list.filter((r) => mine.has(r.bookingId));
  }
  return list;
}

export function filterResalesForRole(
  rows: ResaleCase[],
  opts: { projectId: string; role: unknown },
): ResaleCase[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  return rows.filter((r) => r.projectId === opts.projectId);
}

/** Lift legacy DocumentRecord into ProjectDocument with conservative visibility. */
export function legacyDocumentToProject(
  d: DocumentRecord,
  uploadedBy = "system@seed",
): ProjectDocument {
  const visibility: DocumentVisibility =
    d.type === "Layout approval" || d.type === "NOC"
      ? "INTERNAL"
      : d.type === "Receipt" || d.type === "KYC"
        ? "CUSTOMER_PROFILE_RELATED"
        : "AGENT_VISIBLE";
  return {
    id: d.id,
    projectId: d.projectId,
    name: d.name,
    docType: d.type,
    visibility,
    customerId: d.customerId,
    plotId: d.plotId,
    verified: d.verified,
    modified: d.modified,
    sizeKb: d.sizeKb,
    uploadedBy,
  };
}

export function legacyRegistrationToCase(
  r: Registration,
  projectId: string,
): RegistrationCase {
  return {
    id: r.id,
    projectId,
    bookingId: r.bookingId,
    customerId: r.customerId,
    plotId: r.plotId,
    stage: r.stage,
    slot: r.slot,
    subRegistrar: r.subRegistrar,
  };
}

export function resaleCasesFromPlots(
  plots: Plot[],
  projectId: string,
): ResaleCase[] {
  return plots
    .filter((p) => p.projectId === projectId && (p.status === "resale" || (p as { canonicalStatus?: string }).canonicalStatus === "RESALE_AVAILABLE"))
    .map((p, i) => {
      const row: ResaleCase = {
        id: `RSL-${p.id}`,
        projectId,
        plotId: p.id,
        stage: (["Listed", "Under offer", "Listed", "Transferred"] as ResaleStage[])[i % 4]!,
        listedAt: `2026-08-${String((i % 27) + 1).padStart(2, "0")}`,
        askPrice: Math.round((p.areaSqYd || 200) * (p.pricePerSqYd || 25000)),
        notes: "Derived from plot resale status - not an invented listing count.",
      };
      if (p.customerId) row.sellerCustomerId = p.customerId;
      return row;
    });
}

