import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  NewRecordButton,
  PageHeader,
  Panel,
  SectionTitle,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Mono, Muted, StatusChip } from '../components/common';
import { display, formatDateTime, formatPaise, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

export function DashboardPage() {
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const customers = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const payments = useAsyncList(() => api.payments.list() as Promise<AnyRow[]>);
  const leads = useAsyncList(() => api.leads.list() as Promise<AnyRow[]>);

  const loadingMetrics = projects.loading || customers.loading || payments.loading || leads.loading;
  const collected = payments.rows
    .filter((p) => !p.voidedAt && String(p.status || '').toUpperCase() !== 'VOIDED')
    .reduce((sum, p) => sum + Number(p.amountPaise || 0), 0);
  const activeProjects = projects.rows.filter((p) => String(p.lifecycleStatus || p.status || '').toUpperCase() === 'ACTIVE').length;
  const recentLeads = leads.rows.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live counts from the production API across projects, customers, leads and payments."
        actions={<NewRecordButton to="/projects?new=1">New project</NewRecordButton>}
      />

      {loadingMetrics ? (
        <LoadingState variant="metrics" rows={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric accent label="Projects" value={projects.rows.length} hint={`${activeProjects} active`} />
          <Metric label="Customers" value={customers.rows.length} hint="All relationships" />
          <Metric label="Leads" value={leads.rows.length} hint="Open pipeline" />
          <Metric label="Payments" value={payments.rows.length} hint={`${formatPaise(collected)} recorded`} />
        </div>
      )}

      <div className="grid gap-4 pt-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionTitle
            aside={
              <Link to="/projects" className="inline-flex items-center gap-1 font-medium text-primary">
                All projects <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Projects
          </SectionTitle>
          {projects.err ? (
            <ErrorState compact title="Couldn't load projects" error={projects.err} onRetry={projects.reload} />
          ) : projects.loading ? (
            <LoadingState variant="rows" rows={4} />
          ) : (
            <DataTable<Row>
              rows={withIds(projects.rows)}
              linkTo={(p) => `/projects/${p.id}`}
              emptyMessage="No projects yet — create one to start the setup workspace."
              columns={[
                {
                  key: 'name',
                  header: 'Project',
                  cell: (p) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(p.name)}</p>
                      <Mono className="text-muted-foreground">{display(p.code)}</Mono>
                    </div>
                  ),
                },
                { key: 'city', header: 'City', cell: (p) => <Muted>{display(p.city)}</Muted> },
                { key: 'status', header: 'Lifecycle', cell: (p) => <StatusChip value={p.lifecycleStatus || p.status} /> },
              ]}
            />
          )}
        </div>

        <Panel className="min-w-0">
          <SectionTitle
            aside={
              <Link to="/leads" className="font-medium text-primary">
                View all
              </Link>
            }
          >
            Recent leads
          </SectionTitle>
          {leads.err ? (
            <p className="text-sm text-destructive">{leads.err}</p>
          ) : recentLeads.length === 0 ? (
            <EmptyState compact title="No leads yet" description="Leads captured by agents appear here." />
          ) : (
            <ul className="space-y-1">
              {recentLeads.map((l, i) => (
                <li key={l.id || i} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-low">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{display(l.name)}</p>
                    <Muted>{l.createdAt ? formatDateTime(l.createdAt) : display(l.phone)}</Muted>
                  </div>
                  <StatusChip value={l.stage} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
