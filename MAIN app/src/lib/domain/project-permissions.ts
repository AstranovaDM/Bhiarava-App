/**
 * Project workspace permission gates (permission matrix §6 Setup).
 * UI helpers simulate API/backend authorization — never UI-only security.
 */

export type AppRole =
  | "Founder"
  | "Administrator"
  | "Finance"
  | "Viewer"
  | "Agent"
  | "Customer"
  | "Sales"; // legacy AppUser role — treat as Agent-equivalent for Setup deny

export type SetupAccess = "full" | "read" | "denied";

export function normalizeRole(raw: unknown): AppRole {
  if (typeof raw !== "string") return "Viewer";
  const s = raw.trim();
  switch (s) {
    case "Founder":
    case "Administrator":
    case "Finance":
    case "Viewer":
    case "Agent":
    case "Customer":
    case "Sales":
      return s;
    case "Admin":
      return "Administrator";
    default:
      return "Viewer";
  }
}

/** Map session / AppUser role to Setup tab access. */
export function setupAccessForRole(role: unknown): SetupAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance" || r === "Viewer") return "read";
  // Agent, Customer, Sales — no Setup access
  return "denied";
}

export function canEditSetup(role: unknown): boolean {
  return setupAccessForRole(role) === "full";
}

export function canViewSetup(role: unknown): boolean {
  const a = setupAccessForRole(role);
  return a === "full" || a === "read";
}

export function canChangeLifecycle(role: unknown): boolean {
  return canEditSetup(role);
}

export function canChangePublishFlags(role: unknown): boolean {
  return canEditSetup(role);
}

export function canPriceOverride(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator";
}

export function canOpenProjectWorkspace(role: unknown): boolean {
  const r = normalizeRole(role);
  // MAIN roles; Agent/Customer use other apps — deny Setup, allow Overview stub only if ever embedded
  return r === "Founder" || r === "Administrator" || r === "Finance" || r === "Viewer" || r === "Sales";
}
