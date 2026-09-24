import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getSession } from "@/lib/auth";
import {
  canAccessFounderBilling,
  DEFAULT_FOUNDER_BILLING,
  normalizeFounderBilling,
} from "@/lib/domain/management";

export const Route = createFileRoute("/settings/billing")({
  head: () => ({
    meta: [
      { title: "Founder Billing — Bhairava" },
      { name: "description", content: "Founder-only billing surface for the Bhairava workspace plan." },
    ],
  }),
  component: BillingSettings,
});

function BillingSettings() {
  const session = getSession();
  const allowed = canAccessFounderBilling(session?.role);
  const billing = normalizeFounderBilling(DEFAULT_FOUNDER_BILLING);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Founder billing"
        description="Plan metadata for the workspace. Seat counts come from Members — no invented usage metrics."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          {!allowed ? (
            <Panel>
              <p className="text-sm text-muted-foreground" data-testid="billing-denied">
                Founder-only. Your role cannot view billing.
              </p>
            </Panel>
          ) : (
            <Panel data-testid="billing-surface">
              <SectionTitle aside={<Chip tone="positive">{billing.status}</Chip>}>
                <span className="inline-flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  {billing.planName}
                </span>
              </SectionTitle>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Billing email</dt>
                  <dd className="font-medium">{billing.billingEmail}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Renews on</dt>
                  <dd className="font-medium">{billing.renewsOn ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Seats included</dt>
                  <dd className="font-medium">{billing.seatsIncluded}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg bg-surface-c p-3 text-xs text-muted-foreground">{billing.notes}</p>
              <div className="mt-4">
                <Btn variant="tonal" disabled data-testid="billing-portal-soon">
                  Open billing portal (soon)
                </Btn>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
