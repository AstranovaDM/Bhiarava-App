import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CreditCard, Save } from 'lucide-react';
import { Btn, EmptyState, Field, LoadingState, PageHeader, Panel, SectionTitle } from '@bhairava/ui-web';
import { api } from '../api';
import { FormActions, Mono, Muted, NativeTextarea, Notice } from '../components/common';
import { errMsg, shortId, type AnyRow } from '../lib/data';
import { ResourceTable } from './ResourceList';

export function MembersPage() {
  return (
    <ResourceTable
      eyebrow="Management"
      title="Members"
      description="Organization users and their RBAC roles, enforced server-side."
      loader={() => api.users.list() as Promise<AnyRow[]>}
      statusKey="roleCode"
      searchKeys={['displayName', 'email', 'roleCode', 'status']}
      columns={[
        {
          key: 'displayName',
          label: 'Member',
          render: (u) => (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.displayName || u.email || '—'}</p>
              <Muted className="block truncate">{u.email || '—'}</Muted>
            </div>
          ),
        },
        { key: 'roleCode', label: 'Role', kind: 'status' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'lastLoginAt', label: 'Last login', kind: 'datetime' },
      ]}
    />
  );
}

export function AuditPage() {
  return (
    <ResourceTable
      eyebrow="Management"
      title="Audit log"
      description="Append-only trail of every mutation recorded by the production API."
      loader={async () => {
        const res = await api.audit.list({ take: 100 });
        return Array.isArray(res) ? res : ((res as AnyRow)?.items ?? []);
      }}
      statusKey="entityType"
      searchKeys={['action', 'entityType', 'entityId', 'actorId']}
      columns={[
        { key: 'createdAt', label: 'When', kind: 'datetime' },
        { key: 'action', label: 'Action', kind: 'strong' },
        {
          key: 'entity',
          label: 'Entity',
          render: (r) => (
            <span className="text-sm">
              {r.entityType || '—'} <Mono className="text-muted-foreground">{shortId(r.entityId)}</Mono>
            </span>
          ),
        },
        { key: 'actorId', label: 'Actor', kind: 'id' },
      ]}
    />
  );
}

export function CompanySettingsPage() {
  const [json, setJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.companySettings
      .get()
      .then((r: AnyRow) => setJson(JSON.stringify(r.settingsJson ?? r.settings ?? {}, null, 2)))
      .catch((e) => setMsg({ tone: 'err', text: errMsg(e) }))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await api.companySettings.update(JSON.parse(json));
      setMsg({ tone: 'ok', text: 'Saved to production API' });
    } catch (ex) {
      setMsg({ tone: 'err', text: errMsg(ex) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Management"
        title="Company settings"
        description="The live company_settings row. Edit JSON carefully — it is validated server-side."
      />
      <Panel>
        <SectionTitle aside="PUT /api/company-settings">Settings JSON</SectionTitle>
        {loading ? (
          <LoadingState variant="rows" rows={3} />
        ) : (
          <form onSubmit={save}>
            <Field label="settingsJson">
              <NativeTextarea
                rows={18}
                value={json}
                onChange={(e) => setJson(e.target.value)}
                spellCheck={false}
                className="font-mono text-xs"
              />
            </Field>
            <FormActions>
              <Btn type="submit" variant="primary" disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}
              </Btn>
              {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
            </FormActions>
          </form>
        )}
      </Panel>
    </>
  );
}

export function BillingPage() {
  return (
    <>
      <PageHeader eyebrow="Management" title="Billing" description="Subscription and invoices for this organization." />
      <EmptyState
        icon={CreditCard}
        title="Billing is not connected yet"
        description="The billing provider requires an external credential that has not been configured for this environment."
      />
    </>
  );
}

export function DangerZonePage() {
  return (
    <>
      <PageHeader
        eyebrow="Management"
        title="Danger zone"
        description="Founder-only destructive controls, gated by the API and a signed-off runbook."
      />
      <Panel className="ring-1 ring-destructive/25">
        <SectionTitle>
          <span className="inline-flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Destructive controls
          </span>
        </SectionTitle>
        <p className="max-w-prose text-sm text-muted-foreground">
          These actions stay disabled until runbook sign-off. Nothing here writes to browser storage.
        </p>
        <div className="mt-5 divide-y divide-outline-variant/30 rounded-xl bg-surface-low">
          {[
            { label: 'Export organization data', hint: 'Full export of projects, customers, bookings and payments.', action: 'Export org data' },
            { label: 'Purge demo data', hint: 'Irreversibly remove seeded demo records.', action: 'Purge demo data' },
          ].map((row) => (
            <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <Muted>{row.hint}</Muted>
              </div>
              <Btn variant="danger" disabled>
                {row.action}
              </Btn>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
