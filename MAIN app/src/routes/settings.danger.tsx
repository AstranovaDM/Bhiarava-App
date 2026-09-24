import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getSession } from "@/lib/auth";
import { useData } from "@/lib/store";
import { canAccessDangerZone, dangerZoneAllowed } from "@/lib/domain/management";

export const Route = createFileRoute("/settings/danger")({
  head: () => ({
    meta: [
      { title: "Danger Zone — Bhairava" },
      { name: "description", content: "Founder-only destructive workspace controls." },
    ],
  }),
  component: DangerZoneSettings,
});

function DangerZoneSettings() {
  const session = getSession();
  const allowed = canAccessDangerZone(session?.role);
  const store = useData() as ReturnType<typeof useData> & { reset?: () => void };
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function resetDemo() {
    if (!dangerZoneAllowed(session?.role, "reset_demo_data")) {
      setMsg("Not allowed.");
      return;
    }
    if (confirm.trim() !== "RESET DEMO") {
      setMsg("Type RESET DEMO to confirm.");
      return;
    }
    store.reset?.();
    setMsg("Demo workspace data reset (local).");
    setConfirm("");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Danger zone"
        description="Founder-only controls that can wipe local demo state. Use with care."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          {!allowed ? (
            <Panel>
              <p className="text-sm text-muted-foreground" data-testid="danger-denied">
                Founder-only. Your role cannot access the danger zone.
              </p>
            </Panel>
          ) : (
            <Panel data-testid="danger-surface">
              <SectionTitle>
                <span className="inline-flex items-center gap-2 text-danger">
                  <AlertTriangle className="h-4 w-4" />
                  Reset demo data
                </span>
              </SectionTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Clears persisted MAIN localStorage demo edits and restores seed. Does not push or touch remote systems.
              </p>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type RESET DEMO to confirm
                <input
                  className="mt-1.5 h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  data-testid="danger-confirm-input"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn variant="primary" onClick={resetDemo} data-testid="danger-reset-demo">
                  Reset demo workspace
                </Btn>
              </div>
              {msg && (
                <p className="mt-3 text-sm" data-testid="danger-msg">
                  {msg}
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
