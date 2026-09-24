import { useMemo, useState } from "react";
import { Chip, Panel, SectionTitle, SwitchControl, Btn } from "@/components/kit";
import { Field, NumberInput, SelectInput, TextInput, TextareaInput } from "@/components/form-kit";
import type {
  PricingRules,
  Project,
  ProjectAmenity,
  ProjectBlock,
  ProjectPhase,
  PlotType,
} from "@/lib/mock-data";
import {
  AMENITY_CATALOG,
  FACINGS,
  PLOT_TYPE_PRESETS,
  PROJECT_TYPES,
  defaultPricing,
} from "@/lib/project-config";
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_STATUSES,
  enforceVisibilityForLifecycle,
  type ProjectLifecycle,
} from "@/lib/domain/lifecycle";
import {
  evaluateProjectReadiness,
  projectLifecycleOf,
} from "@/lib/domain/overview-metrics";
import type { SetupAccess } from "@/lib/domain/project-permissions";
import type { Plot } from "@/lib/mock-data";

const SETUP_SECTIONS = [
  "Basic Information",
  "Location",
  "Phases",
  "Blocks",
  "Plot Types",
  "Pricing Rules",
  "Amenities",
  "Media",
  "Visibility / Publishing",
  "Project Settings",
] as const;

type SetupSection = (typeof SETUP_SECTIONS)[number];

function PermissionDenied() {
  return (
    <Panel className="text-center">
      <SectionTitle>Setup access denied</SectionTitle>
      <p className="pt-2 text-sm text-muted-foreground">
        Agent and Customer roles cannot open project Setup. Use MAIN Founder / Administrator /
        Finance / Viewer accounts.
      </p>
    </Panel>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="mb-4 rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
      Setup is <span className="font-medium text-foreground">read-only</span> for your role
      (Finance / Viewer). Founder and Administrator can edit.
    </div>
  );
}

export function ProjectSetupTab({
  project,
  plots,
  access,
  onSave,
}: {
  project: Project;
  plots: Plot[];
  access: SetupAccess;
  onSave: (next: Project) => void;
}) {
  if (access === "denied") return <PermissionDenied />;

  const readOnly = access === "read";
  const [section, setSection] = useState<SetupSection>("Basic Information");
  const [draft, setDraft] = useState<Project>(() => ({
    ...project,
    lifecycleStatus: projectLifecycleOf(project),
    agentVisible: !!project.agentVisible,
    customerListed: !!project.customerListed,
    phases: project.phases ?? [],
    blocks: project.blocks ?? [],
    plotTypes: project.plotTypes ?? [],
    pricing: project.pricing ?? defaultPricing(),
    amenities: project.amenities ?? [],
    settings: project.settings ?? {
      reservationDays: 7,
      bookingAdvancePct: 10,
      allowAgentDiscount: false,
      requireApproval: true,
    },
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const readiness = useMemo(
    () =>
      evaluateProjectReadiness(
        draft as unknown as Record<string, unknown>,
        plots as unknown as Array<Record<string, unknown>>,
      ),
    [draft, plots],
  );

  const patch = (partial: Record<string, unknown>) => {
    if (readOnly) return;
    setDraft((d) => {
      const next = { ...d, ...partial } as Project;
      const lifecycle = projectLifecycleOf(next);
      const vis = enforceVisibilityForLifecycle(lifecycle, {
        agentVisible: !!next.agentVisible,
        customerListed: !!next.customerListed,
      });
      return { ...next, lifecycleStatus: lifecycle, ...vis };
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!draft.name?.trim()) e["name"] = "Name is required";
    if (!draft.code?.trim()) e["code"] = "Code is required";
    if (!draft.city?.trim()) e["city"] = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (readOnly) return;
    if (!validate()) {
      setSection("Basic Information");
      return;
    }
    const lifecycle = projectLifecycleOf(draft);
    const vis = enforceVisibilityForLifecycle(lifecycle, {
      agentVisible: !!draft.agentVisible,
      customerListed: !!draft.customerListed,
    });
    // Enforce publish gates client-side (simulates API)
    let agentVisible = vis.agentVisible;
    let customerListed = vis.customerListed;
    if (agentVisible && !readiness.canSetAgentVisible) agentVisible = false;
    if (customerListed && !readiness.canSetCustomerListed) customerListed = false;
    if (lifecycle === "DRAFT") {
      agentVisible = false;
      customerListed = false;
    }
    const next: Project = {
      ...draft,
      lifecycleStatus: lifecycle,
      agentVisible,
      customerListed,
      status:
        lifecycle === "DRAFT"
          ? "Draft"
          : lifecycle === "ACTIVE"
            ? "Active"
            : lifecycle === "ON_HOLD"
              ? "On hold"
              : lifecycle === "COMPLETED"
                ? "Sold out"
                : "Inactive",
    };
    onSave(next);
    setDraft(next);
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <Panel className="sticky top-4 p-2">
          <p className="px-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Setup sections
          </p>
          <nav className="flex flex-col gap-0.5">
            {SETUP_SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  section === s
                    ? "bg-surface-lowest font-medium text-foreground shadow-ambient"
                    : "text-muted-foreground hover:bg-surface-c"
                }`}
              >
                {s}
              </button>
            ))}
          </nav>
        </Panel>
      </div>

      <div className="lg:col-span-9 space-y-4">
        {readOnly && <ReadOnlyBanner />}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <SectionTitle aside={`${readiness.percent}% ready`}>{section}</SectionTitle>
            {!readOnly && (
              <div className="flex items-center gap-2">
                {savedAt && (
                  <span className="text-xs text-muted-foreground">Saved {savedAt}</span>
                )}
                <Btn variant="primary" onClick={save}>
                  Save Setup
                </Btn>
              </div>
            )}
          </div>

          {section === "Basic Information" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors["name"]}>
                <TextInput
                  value={draft.name}
                  onChange={(v) => patch({ name: v })}
                />
              </Field>
              <Field label="Code" error={errors["code"]}>
                <TextInput
                  value={draft.code}
                  onChange={(v) => patch({ code: v })}
                />
              </Field>
              <Field label="Project type">
                <SelectInput
                  value={draft.projectType ?? "Plotted development"}
                  onChange={(v) => {
                    if (readOnly) return;
                    patch({ projectType: v as Project["projectType"] });
                  }}
                  options={[...PROJECT_TYPES]}
                />
              </Field>
              <Field label="Manager">
                <TextInput
                  value={draft.manager}
                  onChange={(v) => patch({ manager: v })}
                />
              </Field>
              <Field label="Lifecycle">
                <SelectInput
                  value={projectLifecycleOf(draft)}
                  onChange={(v) => {
                    if (readOnly) return;
                    const lifecycleStatus = v as ProjectLifecycle;
                    const vis = enforceVisibilityForLifecycle(lifecycleStatus, {
                      agentVisible: !!draft.agentVisible,
                      customerListed: !!draft.customerListed,
                    });
                    patch({ lifecycleStatus, ...vis });
                  }}
                  options={LIFECYCLE_STATUSES.map((s) => ({ value: s, label: LIFECYCLE_LABEL[s] }))}
                />
              </Field>
              <Field label="RERA number (optional)">
                <TextInput
                  value={draft.reraNumber ?? ""}
                  onChange={(v) => patch({ reraNumber: v || undefined })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <TextareaInput
                    value={draft.description ?? ""}
                    onChange={(v) => patch({ description: v })}
                  />
                </Field>
              </div>
            </div>
          )}

          {section === "Location" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location / locality" error={errors["city"]}>
                <TextInput
                  value={draft.location}
                  onChange={(v) => patch({ location: v })}
                />
              </Field>
              <Field label="City">
                <TextInput
                  value={draft.city}
                  onChange={(v) => patch({ city: v })}
                />
              </Field>
              <Field label="Village">
                <TextInput
                  value={draft.village ?? ""}
                  onChange={(v) => patch({ village: v || undefined })}
                />
              </Field>
              <Field label="Mandal">
                <TextInput
                  value={draft.mandal ?? ""}
                  onChange={(v) => patch({ mandal: v || undefined })}
                />
              </Field>
              <Field label="District">
                <TextInput
                  value={draft.district ?? ""}
                  onChange={(v) => patch({ district: v || undefined })}
                />
              </Field>
              <Field label="State">
                <TextInput
                  value={draft.state ?? ""}
                  onChange={(v) => patch({ state: v || undefined })}
                />
              </Field>
              <Field label="Pincode">
                <TextInput
                  value={draft.pincode ?? ""}
                  onChange={(v) => patch({ pincode: v || undefined })}
                />
              </Field>
              <Field label="Address">
                <TextInput
                  value={draft.address ?? ""}
                  onChange={(v) => patch({ address: v || undefined })}
                />
              </Field>
            </div>
          )}

          {section === "Phases" && (
            <PhasesEditor
              phases={draft.phases ?? []}
              readOnly={readOnly}
              onChange={(phases) => patch({ phases })}
            />
          )}

          {section === "Blocks" && (
            <BlocksEditor
              blocks={draft.blocks ?? []}
              phases={draft.phases ?? []}
              readOnly={readOnly}
              onChange={(blocks) => patch({ blocks })}
            />
          )}

          {section === "Plot Types" && (
            <PlotTypesEditor
              types={draft.plotTypes ?? []}
              readOnly={readOnly}
              onChange={(plotTypes) => patch({ plotTypes })}
            />
          )}

          {section === "Pricing Rules" && (
            <PricingEditor
              pricing={draft.pricing ?? defaultPricing()}
              readOnly={readOnly}
              onChange={(pricing) => patch({ pricing })}
            />
          )}

          {section === "Amenities" && (
            <AmenitiesEditor
              amenities={draft.amenities ?? []}
              readOnly={readOnly}
              onChange={(amenities) => patch({ amenities })}
            />
          )}

          {section === "Media" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cover / hero image URL">
                <TextInput
                  value={draft.coverImage ?? ""}
                  onChange={(v) => patch({ coverImage: v || undefined })}
                />
              </Field>
              <Field label="Brochure URL">
                <TextInput
                  value={draft.brochure ?? ""}
                  onChange={(v) => patch({ brochure: v || undefined })}
                />
              </Field>
              <Field label="Layout image URL">
                <TextInput
                  value={draft.layoutImage ?? ""}
                  onChange={(v) => patch({ layoutImage: v || undefined })}
                />
              </Field>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Media is marketing surface (not the document vault). Upload plumbing ships with
                Documents (P3).
              </p>
            </div>
          )}

          {section === "Visibility / Publishing" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Publish flags are orthogonal to lifecycle. DRAFT forces both off. Gates simulate
                API readiness checks on save.
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip tone="info">{LIFECYCLE_LABEL[projectLifecycleOf(draft)]}</Chip>
                {!readiness.canSetAgentVisible && (
                  <Chip tone="warning">Agent publish blocked</Chip>
                )}
                {!readiness.canSetCustomerListed && (
                  <Chip tone="warning">Customer publish blocked</Chip>
                )}
              </div>
              <SwitchControl
                label="Agent visible"
                checked={!!draft.agentVisible}
                disabled={readOnly || projectLifecycleOf(draft) === "DRAFT"}
                onCheckedChange={(agentVisible) => patch({ agentVisible })}
              />
              <SwitchControl
                label="Customer listed"
                checked={!!draft.customerListed}
                disabled={readOnly || projectLifecycleOf(draft) === "DRAFT"}
                onCheckedChange={(customerListed) => patch({ customerListed })}
              />
              <ul className="space-y-1 text-xs text-muted-foreground">
                {readiness.blockers.slice(0, 8).map((b) => (
                  <li key={b.id}>
                    <span className="font-medium text-foreground">{b.id}</span> — {b.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === "Project Settings" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reservation days">
                <NumberInput
                  value={draft.settings?.reservationDays ?? 7}
                  onChange={(v) => {
                    if (readOnly) return;
                    patch({
                      settings: {
                        ...(draft.settings ?? {
                          reservationDays: 7,
                          bookingAdvancePct: 10,
                          allowAgentDiscount: false,
                          requireApproval: true,
                        }),
                        reservationDays: v,
                      },
                    });
                  }}
                />
              </Field>
              <Field label="Booking advance %">
                <NumberInput
                  value={draft.settings?.bookingAdvancePct ?? 10}
                  onChange={(v) => {
                    if (readOnly) return;
                    patch({
                      settings: {
                        ...(draft.settings ?? {
                          reservationDays: 7,
                          bookingAdvancePct: 10,
                          allowAgentDiscount: false,
                          requireApproval: true,
                        }),
                        bookingAdvancePct: v,
                      },
                    });
                  }}
                />
              </Field>
              <SwitchControl
                label="Allow agent discount"
                checked={!!draft.settings?.allowAgentDiscount}
                disabled={readOnly}
                onCheckedChange={(allowAgentDiscount) =>
                  patch({
                    settings: {
                      ...(draft.settings ?? {
                        reservationDays: 7,
                        bookingAdvancePct: 10,
                        allowAgentDiscount: false,
                        requireApproval: true,
                      }),
                      allowAgentDiscount,
                    },
                  })
                }
              />
              <SwitchControl
                label="Require approval"
                checked={!!draft.settings?.requireApproval}
                disabled={readOnly}
                onCheckedChange={(requireApproval) =>
                  patch({
                    settings: {
                      ...(draft.settings ?? {
                        reservationDays: 7,
                        bookingAdvancePct: 10,
                        allowAgentDiscount: false,
                        requireApproval: true,
                      }),
                      requireApproval,
                    },
                  })
                }
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function PhasesEditor({
  phases,
  readOnly,
  onChange,
}: {
  phases: ProjectPhase[];
  readOnly: boolean;
  onChange: (p: ProjectPhase[]) => void;
}) {
  return (
    <div className="space-y-3">
      {phases.length === 0 && (
        <p className="text-sm text-muted-foreground">No phases yet.</p>
      )}
      {phases.map((ph, i) => (
        <div key={ph.id} className="grid gap-2 rounded-lg bg-surface-low p-3 sm:grid-cols-4">
          <TextInput
            value={ph.name}
            onChange={(v) => {
              const next = [...phases];
              next[i] = { ...ph, name: v };
              onChange(next);
            }}
          />
          <SelectInput
            value={ph.status}
            onChange={(v) => {
              if (readOnly) return;
              const next = [...phases];
              next[i] = { ...ph, status: v as ProjectPhase["status"] };
              onChange(next);
            }}
            options={["Planned", "Active", "Completed"] as const}
          />
          {!readOnly && (
            <Btn
              variant="ghost"
              onClick={() => onChange(phases.filter((x) => x.id !== ph.id))}
            >
              Remove
            </Btn>
          )}
        </div>
      ))}
      {!readOnly && (
        <Btn
          variant="tonal"
          onClick={() =>
            onChange([
              ...phases,
              {
                id: `PH-${phases.length + 1}`,
                name: `Phase ${phases.length + 1}`,
                order: phases.length + 1,
                status: "Planned",
              },
            ])
          }
        >
          Add phase
        </Btn>
      )}
    </div>
  );
}

function BlocksEditor({
  blocks,
  phases,
  readOnly,
  onChange,
}: {
  blocks: ProjectBlock[];
  phases: ProjectPhase[];
  readOnly: boolean;
  onChange: (b: ProjectBlock[]) => void;
}) {
  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">No blocks yet.</p>
      )}
      {blocks.map((b, i) => (
        <div key={b.id} className="grid gap-2 rounded-lg bg-surface-low p-3 sm:grid-cols-3">
          <TextInput
            value={b.name}
            onChange={(v) => {
              const next = [...blocks];
              next[i] = { ...b, name: v };
              onChange(next);
            }}
          />
          <SelectInput
            value={(b.phaseId ?? "") as string}
            onChange={(v) => {
              if (readOnly) return;
              const next = [...blocks];
              if (v) {
                next[i] = { ...b, phaseId: v };
              } else {
                const { phaseId: _omit, ...rest } = b;
                next[i] = { ...rest };
              }
              onChange(next);
            }}
            options={[
              { value: "", label: "No phase" },
              ...phases.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          {!readOnly && (
            <Btn variant="ghost" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}>
              Remove
            </Btn>
          )}
        </div>
      ))}
      {!readOnly && (
        <Btn
          variant="tonal"
          onClick={() =>
            onChange([
              ...blocks,
              {
                id: `BLK-${blocks.length + 1}`,
                name: `Block ${String.fromCharCode(65 + (blocks.length % 26))}`,
                order: blocks.length + 1,
              },
            ])
          }
        >
          Add block
        </Btn>
      )}
    </div>
  );
}

function PlotTypesEditor({
  types,
  readOnly,
  onChange,
}: {
  types: PlotType[];
  readOnly: boolean;
  onChange: (t: PlotType[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Plot types are templates (name/code, area, unit, L/W, category, defaults). Presets 100–300
        sq yd.
      </p>
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {PLOT_TYPE_PRESETS.map((preset) => (
            <Btn
              key={preset.name}
              variant="tonal"
              onClick={() =>
                onChange([
                  ...types,
                  {
                    ...preset,
                    id: `PT-${types.length + 1}-${preset.areaSqYd}`,
                    code: preset.name.replace(/\s+/g, "").toUpperCase(),
                    areaUnit: "Sq Yards",
                  },
                ])
              }
            >
              Add {preset.name} ({preset.areaSqYd})
            </Btn>
          ))}
          <Btn
            variant="tonal"
            onClick={() =>
              onChange([
                ...types,
                {
                  id: `PT-${types.length + 1}-300`,
                  name: "Type E",
                  code: "TYPEE",
                  areaSqYd: 300,
                  areaUnit: "Sq Yards",
                  lengthFt: 60,
                  widthFt: 45,
                  facingAllowed: [...FACINGS],
                  category: "Premium",
                },
              ])
            }
          >
            Add 300 sq yd
          </Btn>
        </div>
      )}
      {types.map((t, i) => (
        <div key={t.id} className="grid gap-2 rounded-lg bg-surface-low p-3 sm:grid-cols-4">
          <TextInput
            value={t.name}
            onChange={(v) => {
              const next = [...types];
              next[i] = { ...t, name: v };
              onChange(next);
            }}
          />
          <TextInput
            value={t.code ?? ""}
            onChange={(v) => {
              const next = [...types];
              next[i] = { ...t, code: v };
              onChange(next);
            }}
          />
          <NumberInput
            value={t.areaSqYd}
            onChange={(v) => { const next = [...types]; next[i] = { ...t, areaSqYd: v };
              onChange(next);
            }}
          />
          {!readOnly && (
            <Btn variant="ghost" onClick={() => onChange(types.filter((x) => x.id !== t.id))}>
              Remove
            </Btn>
          )}
        </div>
      ))}
    </div>
  );
}

function PricingEditor({
  pricing,
  readOnly,
  onChange,
}: {
  pricing: PricingRules;
  readOnly: boolean;
  onChange: (p: PricingRules) => void;
}) {
  const facing = pricing.facingPremium ?? { North: 0, South: 0, East: 0, West: 0 };
  const byType = pricing.cornerPremiumByType ?? {};
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Base + facing N/S/E/W + corner + optional NE/NW/SE/SW + park/main-road premiums. Manual
        plot price override requires permission + reason + audit (enforced on Layout & Plots in
        P2).
      </p>
      <Field label="Base rate / sq yd">
        <NumberInput
          value={pricing.baseRatePerSqYd}
          onChange={(v) => { if (readOnly) return; onChange({ ...pricing, baseRatePerSqYd: v }); }}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-4">
        {FACINGS.map((f) => (
          <Field key={f} label={`${f} facing`}>
            <NumberInput
              value={facing[f] ?? 0}
              onChange={(v) => {
                if (readOnly) return;
                onChange({
                  ...pricing,
                  facingPremium: { ...facing, [f]: v },
                });
              }}
            />
          </Field>
        ))}
      </div>
      <Field label="Corner premium (default)">
        <NumberInput
          value={pricing.cornerPremium}
          onChange={(v) => { if (readOnly) return; onChange({ ...pricing, cornerPremium: v }); }}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-4">
        {(["NE", "NW", "SE", "SW"] as const).map((c) => (
          <Field key={c} label={`${c} corner`}>
            <NumberInput
              value={byType[c] ?? 0}
              onChange={(v) => {
                if (readOnly) return;
                onChange({
                  ...pricing,
                  cornerPremiumByType: { ...byType, [c]: v },
                });
              }}
            />
          </Field>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Park facing premium">
          <NumberInput
            value={pricing.featurePremium?.["Park facing"] ?? 0}
            onChange={(v) => {
              if (readOnly) return;
              onChange({
                ...pricing,
                featurePremium: {
                  ...pricing.featurePremium,
                  "Park facing": v,
                },
              });
            }}
          />
        </Field>
        <Field label="Main road facing premium">
          <NumberInput
            value={pricing.featurePremium?.["Main road facing"] ?? 0}
            onChange={(v) => {
              if (readOnly) return;
              onChange({
                ...pricing,
                featurePremium: {
                  ...pricing.featurePremium,
                  "Main road facing": v,
                },
              });
            }}
          />
        </Field>
      </div>
    </div>
  );
}

function AmenitiesEditor({
  amenities,
  readOnly,
  onChange,
}: {
  amenities: ProjectAmenity[];
  readOnly: boolean;
  onChange: (a: ProjectAmenity[]) => void;
}) {
  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {AMENITY_CATALOG.flatMap((g) =>
            g.items.slice(0, 3).map((name) => (
              <Btn
                key={name}
                variant="tonal"
                onClick={() => {
                  if (amenities.some((a) => a.name === name)) return;
                  onChange([
                    ...amenities,
                    {
                      id: `AMN-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                      name,
                      group: g.group,
                      category: g.group,
                      description: "",
                      status: "Planned",
                      completion: 0,
                      photos: 0,
                      visibility: "customer",
                    },
                  ]);
                }}
              >
                + {name}
              </Btn>
            )),
          )}
        </div>
      )}
      {amenities.map((a, i) => (
        <div key={a.id} className="space-y-2 rounded-lg bg-surface-low p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{a.name}</p>
            <Chip>{a.status}</Chip>
          </div>
          <TextareaInput
            value={a.description ?? ""}
            onChange={(v) => {
              const next = [...amenities];
              next[i] = { ...a, description: v };
              onChange(next);
            }}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <SelectInput
              value={a.status}
              onChange={(v) => {
                if (readOnly) return;
                const next = [...amenities];
                next[i] = { ...a, status: v as ProjectAmenity["status"] };
                onChange(next);
              }}
              options={["Planned", "In progress", "Completed"] as const}
            />
            <NumberInput
              value={a.completion}
              onChange={(v) => { const next = [...amenities]; next[i] = { ...a, completion: v };
                onChange(next);
              }}
            />
            <SelectInput
              value={a.visibility ?? "customer"}
              onChange={(v) => {
                if (readOnly) return;
                const next = [...amenities];
                next[i] = { ...a, visibility: v as NonNullable<ProjectAmenity["visibility"]> };
                onChange(next);
              }}
              options={[
                { value: "internal", label: "Internal" },
                { value: "agent", label: "Agent" },
                { value: "customer", label: "Customer" },
              ]}
            />
          </div>
          {!readOnly && (
            <Btn variant="ghost" onClick={() => onChange(amenities.filter((x) => x.id !== a.id))}>
              Remove
            </Btn>
          )}
        </div>
      ))}
    </div>
  );
}
