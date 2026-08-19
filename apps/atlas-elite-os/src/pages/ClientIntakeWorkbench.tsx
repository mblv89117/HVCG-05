/**
 * Development Client Intake / Prospects — UAT-FIND-001 remediation.
 * Canonical HVCG_Leads *contract* via Hub → BA lead_intake Dev adapter.
 * Production SoR is SharePoint HVCG_Leads (website keyed ingest). This page is not that pipeline.
 * Not Client 360. Not Track 1 Production CRM.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  FilterToolbar,
  EmptyState,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Field,
  Input,
  Spinner,
  Text,
  Textarea,
  Dropdown,
  Option,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { baLeadCreate, baLeadGet, baLeadList, type DevLead } from '../integrations/hub/baApi';
import { HubHttpError } from '../integrations/hub/hubFetch';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';
import { microsoftConfig } from '../microsoft/config';

const SOURCES = [
  'Website',
  'Direct Outreach',
  'Existing Client',
  'Referral Partner',
  'Lender',
  'SBA Lender',
  'CPA',
  'Attorney',
  'Insurance Partner',
  'Podcast',
  'LinkedIn',
  'YouTube',
  'Instagram',
  'TikTok',
  'Newsletter',
  'Event',
  'Other',
];

const SERVICES = [
  'Assessment',
  'Capital Advisory',
  'Fractional CFO',
  'Operational Consulting',
  'Growth',
  'Retainer',
  'Success Fee',
  'Hybrid',
  'Other',
];

const ATLAS_LABELS = new Set<string>(Object.values(ATLAS_STATUS));

const ROW_LINK: CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  display: 'block',
  minHeight: 20,
  cursor: 'pointer',
  background: 'none',
  border: 0,
  padding: 0,
  textAlign: 'left',
  width: '100%',
  font: 'inherit',
};

type LoadFailure = { kind: 'auth' | 'forbidden' | 'error'; message: string };

function dayStamp(iso?: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10) || null;
  return new Date(t).toISOString().slice(0, 10);
}

function titleFromToken(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function leadStatusChip(status?: string) {
  if (!status?.trim()) return null;
  if (status === 'New') return { label: status, tone: 'info' as const };
  if (status === 'Disqualified') return { label: status, tone: 'danger' as const };
  if (status === 'Converted') return { label: ATLAS_STATUS.complete, tone: 'success' as const };
  if (status === 'Contacted' || status === 'Qualified') return { label: status, tone: 'info' as const };
  const mapped = atlasStatusDisplay(status);
  if (!mapped) return null;
  if (ATLAS_LABELS.has(mapped.label)) return mapped;
  return { label: titleFromToken(mapped.label), tone: mapped.tone };
}

function followUpDue(lead: DevLead, today: string): boolean {
  const due = dayStamp(lead.NextFollowUpDate);
  return Boolean(due && due <= today);
}

function classifyHubError(err: unknown): LoadFailure {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) {
    return {
      kind: 'auth',
      message: 'Authentication failed talking to Integration Hub (401). Bearer was missing or rejected.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      message: 'Authenticated but not authorized for the Development lead adapter (403).',
    };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function ProspectRowButton({
  leadId,
  onOpen,
  children,
}: {
  leadId: string;
  onOpen: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <button type="button" style={ROW_LINK} onClick={() => onOpen(leadId)}>
      {children}
    </button>
  );
}

export function ClientIntakeWorkbench() {
  const { account, ready, signIn } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const { usingDevOwner, role } = useAtlasRole();
  const isDevSurface =
    microsoftConfig.environment === 'local' || microsoftConfig.environment === 'development';
  const auth: AtlasHubAuthHeaders = useMemo(
    () => ({
      ...hubAuth,
      userId: hubAuth.userId || (usingDevOwner ? 'local-owner-dev' : ''),
      email: hubAuth.email || (usingDevOwner ? 'owner@local.dev' : undefined),
      roles: hubAuth.userId ? hubAuth.roles : usingDevOwner ? [role || 'HVCG Owner'] : hubAuth.roles,
      clientIds: hubAuth.clientIds || [],
    }),
    [hubAuth, usingDevOwner, role],
  );
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('lead') || '';

  const [leads, setLeads] = useState<DevLead[]>([]);
  const [selected, setSelected] = useState<DevLead | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [source, setSource] = useState('Referral Partner');
  const [leadSourceDetail, setLeadSourceDetail] = useState('');
  const [serviceInterest, setServiceInterest] = useState('Capital Advisory');
  const [businessNeed, setBusinessNeed] = useState('');
  const [notes, setNotes] = useState('');

  const openLead = useCallback(
    (id: string) => {
      setParams({ lead: id });
    },
    [setParams],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setFailure(null);
    try {
      const data = (await baLeadList(auth)) as { leads?: DevLead[]; count?: number };
      setLeads(data.leads || []);
    } catch (err) {
      setFailure(classifyHubError(err));
      setLeads([]);
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }, [auth]);

  useEffect(() => {
    if (!ready) return;
    if (!account && !usingDevOwner && !import.meta.env.DEV) {
      setLeads([]);
      setLoaded(true);
      return;
    }
    void refresh();
  }, [refresh, ready, account, usingDevOwner]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void (async () => {
      try {
        const data = (await baLeadGet(auth, selectedId)) as { lead?: DevLead };
        setSelected(data.lead || null);
      } catch (err) {
        setFailure(classifyHubError(err));
      }
    })();
  }, [selectedId, auth]);

  const onCreate = async () => {
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      const data = (await baLeadCreate(auth, {
        title,
        contactName,
        source,
        leadSourceDetail,
        serviceInterest,
        businessNeed,
        notes,
      })) as { lead?: DevLead; status?: string; existingLeadId?: string; message?: string };
      if (data.status === 'DUPLICATE') {
        setFailure({ kind: 'error', message: data.message || 'Duplicate prospect — open existing record' });
        if (data.existingLeadId) setParams({ lead: data.existingLeadId });
        await refresh();
        return;
      }
      const id = data.lead?.LeadId;
      setNotice(`Created ${id} on the Development lead adapter. Production HVCG_Leads was not written.`);
      setTitle('');
      setContactName('');
      setLeadSourceDetail('');
      setBusinessNeed('');
      setNotes('');
      await refresh();
      if (id) setParams({ lead: id });
    } catch (err) {
      setFailure(classifyHubError(err));
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const operator = useMemo(() => {
    const stageCounts = new Map<string, number>();
    let neu = 0;
    let followUp = 0;
    const owners = new Set<string>();
    let withNext = 0;
    for (const lead of leads) {
      const stage = leadStatusChip(lead.LeadStatus);
      const stageLabel = stage?.label || 'New';
      stageCounts.set(stageLabel, (stageCounts.get(stageLabel) || 0) + 1);
      if ((lead.LeadStatus || 'New') === 'New') neu += 1;
      if (followUpDue(lead, today)) followUp += 1;
      if (lead.OwnerEmail) owners.add(lead.OwnerEmail);
      if (lead.NextAction) withNext += 1;
    }
    return { stageCounts, neu, followUp, owners, withNext };
  }, [leads, today]);

  const selectedStatus = leadStatusChip(selected?.LeadStatus);

  if (!ready) {
    return (
      <ModuleScaffold title="Prospect Intake" subtitle="Preparing Microsoft session…" showPendingBanner={false}>
        <Spinner label="Loading session…" />
      </ModuleScaffold>
    );
  }

  if (!account && !usingDevOwner && !import.meta.env.DEV) {
    return (
      <ModuleScaffold
        title="Prospect Intake"
        subtitle="Development BA adapter · not production CRM"
        showPendingBanner={false}
      >
        <EmptyState
          title="Sign in required"
          description="Dev prospect intake stays behind Microsoft sign-in. This page is not production HVCG_Leads."
        />
        <Button appearance="primary" onClick={() => void signIn()}>
          Sign in with Microsoft
        </Button>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Prospect Intake"
      subtitle="Development BA adapter · HVCG_Leads field contract · not production CRM · PROSPECT ≠ Client 360"
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/clients">
            <Button appearance="secondary">Back to Clients</Button>
          </Link>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Development adapter — not the production lead pipeline</MessageBarTitle>
          This page reads and writes the BA Dev lead store (`/api/ba/leads`). Canonical production SoR is
          SharePoint HVCG_Leads via keyed website ingest (`POST /api/website/leads`). There is no operator
          GET on production HVCG_Leads in Atlas yet — this workbench is not presented as that pipeline.
          New records stay in intake until qualification. Authorized clients (`/clients`) list entitled
          HVCG_Clients only — not Client 360, and not this adapter.
        </MessageBarBody>
      </MessageBar>

      {!isDevSurface ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Not a local/development environment</MessageBarTitle>
            The Clients directory hides the Dev prospect intake button outside local/development. This
            route still talks to the BA Dev adapter only. Production website leads are not listed here.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {failure ? (
        <MessageBar intent={failure.kind === 'forbidden' ? 'warning' : 'error'}>
          <MessageBarBody>
            <MessageBarTitle>
              {failure.kind === 'auth'
                ? 'Authentication required'
                : failure.kind === 'forbidden'
                  ? 'Access denied'
                  : 'Dev intake unavailable'}
            </MessageBarTitle>
            {failure.message}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {notice ? (
        <MessageBar intent="success">
          <MessageBarBody>
            <MessageBarTitle>Saved to Dev adapter</MessageBarTitle>
            {notice}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard title="New prospect" subtitle="Minimum HVCG qualification fields · Dev adapter only">
          <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
            <Field label="Company / prospect name" required>
              <Input value={title} onChange={(_, d) => setTitle(d.value)} placeholder="Atlas UAT Prospect 01" />
            </Field>
            <Field label="Primary contact">
              <Input value={contactName} onChange={(_, d) => setContactName(d.value)} placeholder="Jordan Test" />
            </Field>
            <Field label="Source (canonical)">
              <Dropdown
                value={source}
                selectedOptions={[source]}
                onOptionSelect={(_, d) => setSource(String(d.optionValue || source))}
              >
                {SOURCES.map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Referral / source detail">
              <Input
                value={leadSourceDetail}
                onChange={(_, d) => setLeadSourceDetail(d.value)}
                placeholder="UAT Referral Partner"
              />
            </Field>
            <Field label="Likely HVCG service">
              <Dropdown
                value={serviceInterest}
                selectedOptions={[serviceInterest]}
                onOptionSelect={(_, d) => setServiceInterest(String(d.optionValue || serviceInterest))}
              >
                {SERVICES.map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Business need">
              <Textarea
                value={businessNeed}
                onChange={(_, d) => setBusinessNeed(d.value)}
                placeholder="Growth capital + financial readiness"
                rows={3}
              />
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(_, d) => setNotes(d.value)} rows={2} />
            </Field>
            <Button appearance="primary" onClick={() => void onCreate()} disabled={busy || !title.trim()}>
              Create prospect
            </Button>
          </div>
        </AtlasCard>

      <FilterToolbar>
        <StatusChip label={`${leads.length} Dev prospects`} tone="warning" />
        {operator.neu ? <StatusChip label={`New · ${operator.neu}`} tone="info" /> : null}
        {[...operator.stageCounts.entries()]
          .filter(([stage]) => stage !== 'New')
          .map(([stage, count]) => {
            const chip = leadStatusChip(stage);
            if (!chip) return null;
            return <StatusChip key={stage} label={`${chip.label} · ${count}`} tone={chip.tone} />;
          })}
        {operator.followUp ? (
          <StatusChip label={`${ATLAS_STATUS.overdue} follow-up · ${operator.followUp}`} tone="warning" />
        ) : null}
        {operator.owners.size ? (
          <StatusChip label={`Owner · ${operator.owners.size}`} tone="info" />
        ) : null}
        {operator.withNext ? (
          <StatusChip label={`Next action · ${operator.withNext}`} tone="gold" />
        ) : null}
        {busy ? <Spinner size="tiny" /> : null}
      </FilterToolbar>

      {!loaded || (busy && leads.length === 0 && !failure) ? (
        <Spinner label="Loading Dev prospects…" />
      ) : failure && leads.length === 0 ? (
        <EmptyState
          title={
            failure.kind === 'auth'
              ? 'Authentication required'
              : failure.kind === 'forbidden'
                ? 'Access denied'
                : 'Dev intake unavailable'
          }
          description={
            failure.kind === 'error'
              ? 'This is not an empty production lead list. The BA Dev adapter request failed. Production HVCG_Leads are not queried here.'
              : failure.message
          }
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No Dev prospects yet"
          description="Create a prospect here for UAT only. Production website leads land in SharePoint HVCG_Leads and are not listed on this page."
        />
      ) : (
        <AtlasCard title="Prospect list" subtitle="DEV_LEAD_ADAPTER · not Production HVCG_Leads" variant="quiet">
          <DataTable
            ariaLabel="Development prospects"
            getRowKey={(r) => r.LeadId}
            rows={leads}
            emptyTitle="No Dev prospects match"
            emptyDescription="Clear filters to see every Development adapter record. Production HVCG_Leads are not listed."
            columns={[
              {
                key: 'name',
                header: 'Prospect',
                sticky: 'left',
                width: 220,
                render: (r) => (
                  <ProspectRowButton leadId={r.LeadId} onOpen={openLead}>
                    <span style={{ fontWeight: 600 }}>{r.Title}</span>
                    <Caption1 style={{ display: 'block' }}>{r.ContactName || r.Email || r.LeadId}</Caption1>
                  </ProspectRowButton>
                ),
              },
              {
                key: 'status',
                header: 'Stage',
                width: 140,
                render: (r) => {
                  const chip = leadStatusChip(r.LeadStatus);
                  return (
                    <ProspectRowButton leadId={r.LeadId} onOpen={openLead}>
                      {chip ? <StatusChip label={chip.label} tone={chip.tone} /> : <Caption1>—</Caption1>}
                    </ProspectRowButton>
                  );
                },
              },
              {
                key: 'next',
                header: 'Next action',
                render: (r) => (
                  <ProspectRowButton leadId={r.LeadId} onOpen={openLead}>
                    {r.NextAction || '—'}
                  </ProspectRowButton>
                ),
              },
              {
                key: 'owner',
                header: 'Owner',
                width: 160,
                render: (r) => (
                  <ProspectRowButton leadId={r.LeadId} onOpen={openLead}>
                    {r.OwnerEmail || '—'}
                  </ProspectRowButton>
                ),
              },
              {
                key: 'follow',
                header: 'Follow-up',
                width: 140,
                render: (r) => {
                  const due = dayStamp(r.NextFollowUpDate);
                  return (
                    <ProspectRowButton leadId={r.LeadId} onOpen={openLead}>
                      {!due ? (
                        <Caption1>—</Caption1>
                      ) : due <= today ? (
                        <StatusChip label={ATLAS_STATUS.overdue} tone="danger" />
                      ) : (
                        due
                      )}
                    </ProspectRowButton>
                  );
                },
              },
            ]}
          />
        </AtlasCard>
      )}

      {selected ? (
        <AtlasCard title={selected.Title} subtitle={`${selected.LeadId} · Dev adapter`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {selectedStatus ? <StatusChip label={selectedStatus.label} tone={selectedStatus.tone} /> : null}
            {selected.LifecycleLabel ? <StatusChip label={selected.LifecycleLabel} tone="warning" /> : null}
            {selected.ProductionCrm ? (
              <StatusChip label="Production CRM" tone="danger" />
            ) : (
              <StatusChip label="Not production CRM" tone="warning" />
            )}
          </div>
          <Text block>Contact: {selected.ContactName || '—'}</Text>
          {selected.Email ? (
            <Caption1 style={{ display: 'block', marginTop: 4 }}>Email: {selected.Email}</Caption1>
          ) : null}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Source: {selected.Source}
            {selected.LeadSourceDetail ? ` · ${selected.LeadSourceDetail}` : ''}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Need: {selected.BusinessNeed || '—'} · Service: {selected.ServiceInterest || '—'}
          </Caption1>
          {selected.OwnerEmail ? (
            <Caption1 style={{ display: 'block', marginTop: 4 }}>Owner: {selected.OwnerEmail}</Caption1>
          ) : null}
          {selected.NextFollowUpDate ? (
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Follow-up: {dayStamp(selected.NextFollowUpDate)}
            </Caption1>
          ) : null}
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Next action: {selected.NextAction || '—'}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Conversion boundary: {selected.ConversionBoundary || '—'} (Track 1 Production conversion not
            performed here)
          </Caption1>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label="Begin Free Fit (manual next)" tone="gold" />
            <StatusChip label="BL-C1: no auto-send" tone="warning" />
          </div>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
