/**
 * Development Client Intake / Prospects — UAT-FIND-001 remediation.
 * Canonical HVCG_Leads contract via Hub → BA lead_intake Dev adapter.
 * Not Client 360. Not Track 1 Production CRM.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  FilterToolbar,
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
import { useAtlasRole } from '../security/RoleProvider';
import { baLeadCreate, baLeadGet, baLeadList, type DevLead } from '../integrations/hub/baApi';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';

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

export function ClientIntakeWorkbench() {
  const hubAuth = useHubAuth();
  const { usingDevOwner, role } = useAtlasRole();
  const auth: AtlasHubAuthHeaders = useMemo(
    () => ({
      ...hubAuth,
      userId: hubAuth.userId || (usingDevOwner ? 'local-owner-dev' : ''),
      email: hubAuth.email || (usingDevOwner ? 'owner@local.dev' : undefined),
      roles: hubAuth.userId ? hubAuth.roles : usingDevOwner ? [role || 'HVCG Owner'] : hubAuth.roles,
      clientIds: hubAuth.clientIds?.length ? hubAuth.clientIds : ['*'],
    }),
    [hubAuth, usingDevOwner, role],
  );
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('lead') || '';

  const [leads, setLeads] = useState<DevLead[]>([]);
  const [selected, setSelected] = useState<DevLead | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [source, setSource] = useState('Referral Partner');
  const [leadSourceDetail, setLeadSourceDetail] = useState('');
  const [serviceInterest, setServiceInterest] = useState('Capital Advisory');
  const [businessNeed, setBusinessNeed] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = (await baLeadList(auth)) as { leads?: DevLead[]; count?: number };
      setLeads(data.leads || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
        setError(String(err));
      }
    })();
  }, [selectedId, auth]);

  const onCreate = async () => {
    setBusy(true);
    setError(null);
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
        setError(data.message || 'Duplicate prospect — open existing record');
        if (data.existingLeadId) setParams({ lead: data.existingLeadId });
        await refresh();
        return;
      }
      const id = data.lead?.LeadId;
      setNotice(`Created ${id} — Development lead adapter only (not Track 1 Production CRM).`);
      setTitle('');
      setContactName('');
      setLeadSourceDetail('');
      setBusinessNeed('');
      setNotes('');
      await refresh();
      if (id) setParams({ lead: id });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleScaffold
      title="Prospect Intake"
      subtitle="Development Lead intake · HVCG_Leads contract · PROSPECT ≠ Client 360 · Track 1 Production frozen"
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
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Prospect / Lead ≠ Client</MessageBarTitle>
          New records stay in intake until qualification and approved conversion. Client 360 (`/clients`)
          lists active/discovered clients — not unqualified prospects. Free Fit is the next commercial
          step; no automatic contract, proposal send, or Production CRM write.
        </MessageBarBody>
      </MessageBar>

      {error ? (
        <AtlasCard title="Error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}
      {notice ? (
        <AtlasCard title="Saved">
          <Text>{notice}</Text>
        </AtlasCard>
      ) : null}

      <AtlasCard title="New prospect" subtitle="Minimum HVCG qualification fields">
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
          {busy ? <Spinner size="tiny" /> : null}
        </div>
      </AtlasCard>

      <FilterToolbar>
        <StatusChip label={`${leads.length} prospects`} tone="info" />
        <Caption1>Development adapter · not Production HVCG_Leads</Caption1>
      </FilterToolbar>

      <AtlasCard title="Prospect list" variant="quiet">
        <DataTable
          ariaLabel="Prospects"
          getRowKey={(r) => r.LeadId}
          rows={leads}
          columns={[
            {
              key: 'name',
              header: 'Prospect',
              render: (r) => (
                <Button appearance="transparent" onClick={() => setParams({ lead: r.LeadId })}>
                  {r.Title}
                </Button>
              ),
            },
            {
              key: 'status',
              header: 'Lifecycle',
              render: (r) => <StatusChip label={r.LeadStatus || 'New'} tone="info" />,
            },
            { key: 'source', header: 'Source', render: (r) => r.Source || '—' },
            { key: 'svc', header: 'Service', render: (r) => r.ServiceInterest || '—' },
            { key: 'next', header: 'Next action', render: (r) => r.NextAction || '—' },
          ]}
        />
      </AtlasCard>

      {selected ? (
        <AtlasCard title={`${selected.Title}`} subtitle={selected.LeadId}>
          <Text block>Contact: {selected.ContactName || '—'}</Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Source: {selected.Source}
            {selected.LeadSourceDetail ? ` · ${selected.LeadSourceDetail}` : ''}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Need: {selected.BusinessNeed || '—'} · Service: {selected.ServiceInterest || '—'}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Lifecycle: {selected.LifecycleLabel || selected.LeadStatus} · Client 360 client?{' '}
            {selected.IsClient360Client ? 'Yes' : 'No'}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Next action: {selected.NextAction}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Conversion boundary: {selected.ConversionBoundary} (Track 1 Production conversion not
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
