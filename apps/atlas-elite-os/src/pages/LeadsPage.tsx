/**
 * Production HVCG_Leads operator queue. SharePoint is SoR via Hub GET /api/pm/leads.
 * Website ingest remains the write path for new inbound leads.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  EmptyState,
  FilterToolbar,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components';
import { ArrowSyncRegular, SearchRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { fetchPmLeads, HubHttpError, type PmLead } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';

type LoadFailure = { kind: 'auth' | 'forbidden' | 'error'; message: string };

const ROW_LINK: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  display: 'block',
  minHeight: 20,
};

function dayStamp(iso?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10) || null;
  return new Date(t).toISOString().slice(0, 10);
}

function classifyHubError(err: unknown): LoadFailure {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) {
    return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  }
  if (status === 403) {
    return { kind: 'forbidden', message: 'Authenticated but not authorized for HVCG_Leads (403).' };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function leadHref(lead: PmLead): string {
  return `/leads/${encodeURIComponent(lead.id)}`;
}

function LeadRowLink({ lead, children }: { lead: PmLead; children: ReactNode }) {
  return (
    <Link to={leadHref(lead)} style={ROW_LINK}>
      {children}
    </Link>
  );
}

function followUpState(lead: PmLead, today: string) {
  const open = lead.status === 'New' || lead.status === 'Contacted' || lead.status === 'Qualified';
  if (!open) return { label: ATLAS_STATUS.complete, tone: 'success' as const, overdue: false };
  const due = dayStamp(lead.nextFollowUpDate);
  if (!due) return { label: ATLAS_STATUS.needsAction, tone: 'warning' as const, overdue: false };
  if (due < today) return { label: ATLAS_STATUS.overdue, tone: 'danger' as const, overdue: true };
  if (due === today) return { label: ATLAS_STATUS.needsAction, tone: 'warning' as const, overdue: false };
  return { label: ATLAS_STATUS.waiting, tone: 'info' as const, overdue: false };
}

export function LeadsPage() {
  const auth = useHubAuth();
  const [leads, setLeads] = useState<PmLead[]>([]);
  const [query, setQuery] = useState('');
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [busy, setBusy] = useState(true);
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setFailure({ kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing)' });
      setLeads([]);
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const data = await fetchPmLeads(auth);
      setLeads(data.leads || []);
      setConfigured(data.configured);
    } catch (err) {
      setFailure(classifyHubError(err));
      setLeads([]);
    } finally {
      setBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = !q
      ? leads
      : leads.filter((lead) =>
          [lead.title, lead.contactName, lead.email, lead.source, lead.status, lead.ownerEmail, lead.nextAction]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
        );
    return [...rows].sort((a, b) => {
      const aState = followUpState(a, today);
      const bState = followUpState(b, today);
      if (aState.overdue !== bState.overdue) return aState.overdue ? -1 : 1;
      if (aState.label !== bState.label) return aState.label.localeCompare(bState.label);
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [leads, query, today]);

  const counts = useMemo(() => {
    let overdue = 0;
    let needsAction = 0;
    for (const lead of leads) {
      const state = followUpState(lead, today);
      if (state.overdue) overdue += 1;
      if (state.label === ATLAS_STATUS.needsAction || state.overdue) needsAction += 1;
    }
    return { overdue, needsAction };
  }, [leads, today]);

  if (!auth.tokenReady) {
    return (
      <ModuleScaffold title="Leads" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <Spinner label="Loading session…" />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth' && leads.length === 0) {
    return (
      <ModuleScaffold title="Leads" subtitle="Hub rejected the request" showPendingBanner={false}>
        <EmptyState title="Sign-in required" description={failure.message} />
        <Button appearance="primary" onClick={() => void refresh()}>
          Retry with Hub bearer
        </Button>
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden' && leads.length === 0) {
    return (
      <ModuleScaffold title="Leads" subtitle="403" showPendingBanner={false}>
        <EmptyState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Leads"
      subtitle="HVCG_Leads follow-up queue · website ingest remains the intake path."
      showPendingBanner={false}
      actions={
        <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
          Refresh
        </Button>
      }
    >
      <Caption1 style={{ display: 'block' }}>
        Authorized HVCG_Leads from Hub. Unconverted leads are internal staff only. Conversion to a client is a
        separate workflow.
      </Caption1>

      {failure?.kind === 'error' ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Leads unavailable</MessageBarTitle>
            {failure.message}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <FilterToolbar>
        <StatusChip label={`${filtered.length} / ${leads.length} leads`} tone="info" />
        {configured === false ? <StatusChip label="HVCG_Leads not configured" tone="warning" /> : null}
        {counts.needsAction ? (
          <StatusChip label={`${ATLAS_STATUS.needsAction} · ${counts.needsAction}`} tone="warning" />
        ) : null}
        {counts.overdue ? (
          <StatusChip label={`${ATLAS_STATUS.overdue} · ${counts.overdue}`} tone="danger" />
        ) : null}
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search name, email, source, owner…"
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          style={{ minWidth: 220 }}
        />
        {busy ? <Spinner size="tiny" /> : null}
      </FilterToolbar>

      {busy && leads.length === 0 && !failure ? (
        <Spinner label="Loading authorized leads…" />
      ) : failure?.kind === 'error' && leads.length === 0 ? (
        <EmptyState
          title="Leads unavailable"
          description="This is not an empty pipeline. Hub /api/pm/leads failed; HVCG_Leads were not returned."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No authorized leads"
          description={
            configured === false
              ? 'HVCG_Leads is not configured on this Hub. Website ingest will also be unavailable.'
              : 'Authorized HVCG_Leads for your role. Client users do not see unconverted inbound leads.'
          }
        />
      ) : (
        <AtlasCard title="Follow-up queue" variant="quiet">
          <DataTable
            ariaLabel="Authorized HVCG leads"
            getRowKey={(r) => r.id}
            rows={filtered}
            emptyTitle="No leads match this search"
            emptyDescription="Clear the search to see every authorized HVCG_Leads record."
            columns={[
              {
                key: 'lead',
                header: 'Lead',
                sticky: 'left',
                width: 220,
                render: (r) => (
                  <LeadRowLink lead={r}>
                    <span style={{ fontWeight: 600 }}>{r.title}</span>
                    <Caption1 style={{ display: 'block' }}>{r.contactName || r.email || '—'}</Caption1>
                  </LeadRowLink>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                width: 130,
                render: (r) => {
                  const chip = atlasStatusDisplay(r.status);
                  return (
                    <LeadRowLink lead={r}>
                      <StatusChip label={chip?.label || r.status} tone={chip?.tone || 'neutral'} />
                    </LeadRowLink>
                  );
                },
              },
              {
                key: 'follow',
                header: 'Follow-up',
                width: 140,
                render: (r) => {
                  const state = followUpState(r, today);
                  return (
                    <LeadRowLink lead={r}>
                      <StatusChip label={state.label} tone={state.tone} />
                      <Caption1 style={{ display: 'block' }}>{dayStamp(r.nextFollowUpDate) || 'Not dated'}</Caption1>
                    </LeadRowLink>
                  );
                },
              },
              {
                key: 'next',
                header: 'Next action',
                width: 220,
                render: (r) => (
                  <LeadRowLink lead={r}>
                    <Caption1>{r.nextAction || '—'}</Caption1>
                  </LeadRowLink>
                ),
              },
              {
                key: 'source',
                header: 'Source',
                width: 160,
                render: (r) => (
                  <LeadRowLink lead={r}>
                    <Caption1>{[r.source, r.serviceInterest].filter(Boolean).join(' · ') || '—'}</Caption1>
                  </LeadRowLink>
                ),
              },
              {
                key: 'owner',
                header: 'Owner',
                width: 160,
                render: (r) => (
                  <LeadRowLink lead={r}>
                    <Caption1>{r.ownerEmail || '—'}</Caption1>
                  </LeadRowLink>
                ),
              },
            ]}
          />
        </AtlasCard>
      )}
    </ModuleScaffold>
  );
}
