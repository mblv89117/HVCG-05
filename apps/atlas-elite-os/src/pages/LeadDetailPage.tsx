/**
 * HVCG_Leads record — Hub is authoritative.
 * Convert is POST /api/pm/leads/:id/convert (not a LeadStatus PATCH).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  EmptyState,
  ErrorState,
  LoadingState,
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
  Text,
} from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { convertPmLead, fetchPmLead, HubHttpError, patchPmLead, type PmLead } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';

const PATCHABLE = ['New', 'Contacted', 'Qualified', 'Disqualified'] as const;

function classify(err: unknown): { kind: 'auth' | 'forbidden' | 'error'; message: string } {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  if (status === 403) return { kind: 'forbidden', message: 'Authenticated but not authorized for this lead (403).' };
  if (status === 404) return { kind: 'error', message: 'Lead not found or not in your authorized scope.' };
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function dayStamp(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10);
  return new Date(t).toISOString().slice(0, 10);
}

export function LeadDetailPage() {
  const { leadId = '' } = useParams();
  const navigate = useNavigate();
  const auth = useHubAuth();
  const [lead, setLead] = useState<PmLead | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [failure, setFailure] = useState<{ kind: 'auth' | 'forbidden' | 'error'; message: string } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [followUp, setFollowUp] = useState('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setLead(null);
      setFailure({ kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' });
      return;
    }
    setBusy(true);
    setFailure(null);
    setActionError(null);
    try {
      const data = await fetchPmLead(auth, leadId);
      setLead(data.lead);
      setStatus(data.lead.status);
      setFollowUp(dayStamp(data.lead.nextFollowUpDate));
    } catch (err) {
      setLead(null);
      setFailure(classify(err));
    } finally {
      setBusy(false);
    }
  }, [auth, leadId]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    setActionError(null);
    try {
      const data = await patchPmLead(auth, lead.id, {
        status,
        nextFollowUpDate: followUp || '',
        etag: lead.etag,
      });
      setLead(data.lead);
      setStatus(data.lead.status);
      setFollowUp(dayStamp(data.lead.nextFollowUpDate));
    } catch (err) {
      setActionError(classify(err).message);
    } finally {
      setSaving(false);
    }
  };

  const convert = async () => {
    if (!lead) return;
    setConverting(true);
    setActionError(null);
    try {
      const data = await convertPmLead(auth, lead.id, lead.etag);
      setLead(data.lead);
      navigate(data.href);
    } catch (err) {
      setActionError(classify(err).message);
      setConfirmConvert(false);
    } finally {
      setConverting(false);
    }
  };

  if (!auth.tokenReady || (busy && !lead && !failure)) {
    return (
      <ModuleScaffold title="Lead" subtitle="Loading authorized HVCG_Leads record…" showPendingBanner={false}>
        <LoadingState rows={4} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading lead'} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth') {
    return (
      <ModuleScaffold title="Lead" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState title="Authenticated access required" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden') {
    return (
      <ModuleScaffold title="Lead" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure || !lead) {
    return (
      <ModuleScaffold title="Lead" subtitle="Record unavailable" showPendingBanner={false}>
        <ErrorState
          title="Lead could not load"
          description={failure?.message || 'Hub did not return this HVCG_Leads record.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  const chip = atlasStatusDisplay(lead.status);
  const terminal = lead.status === 'Converted' || lead.status === 'Disqualified';

  return (
    <ModuleScaffold
      title={lead.title}
      subtitle={[lead.contactName, lead.email, lead.source].filter(Boolean).join(' · ') || 'HVCG_Leads'}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/leads">
            <Button appearance="secondary">All leads</Button>
          </Link>
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy || saving}>
            Refresh
          </Button>
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Update did not complete</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={chip?.label || lead.status} tone={chip?.tone || 'neutral'} />
          {lead.serviceInterest ? <StatusChip label={lead.serviceInterest} tone="neutral" /> : null}
          {lead.clientCode ? (
            <Link to={`/clients/${encodeURIComponent(lead.clientCode)}`}>
              <Caption1>{lead.clientCode}</Caption1>
            </Link>
          ) : (
            <Caption1>
              {lead.status === 'Converted'
                ? 'Converted · internal prospect (not an entitled client)'
                : 'Unconverted · internal CRM'}
            </Caption1>
          )}
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          {[lead.ownerEmail ? `Owner ${lead.ownerEmail}` : null, lead.lastModified ? `Updated ${dayStamp(lead.lastModified)}` : null]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
      </AtlasCard>

      <AtlasCard title="What / next">
        <Text weight="semibold" style={{ display: 'block' }}>
          {lead.nextAction || 'No next action recorded on this lead.'}
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 6 }}>
          Next action is taken from HVCG_Leads Notes when the ingest payload included one. Atlas does not invent
          follow-up language.
        </Caption1>
      </AtlasCard>

      {terminal ? (
        <EmptyState
          title={lead.status === 'Converted' ? 'Converted' : 'Disqualified'}
          description={
            lead.status === 'Converted'
              ? 'This inbound lead is now a Company, Contact, and Discovery Opportunity.'
              : 'Disqualified leads are read-only and cannot be converted.'
          }
          actions={
            lead.status === 'Converted' && lead.convertedOpportunityId ? (
              <Link to={`/opportunities/${encodeURIComponent(lead.convertedOpportunityId)}`}>
                <Button appearance="primary">Open opportunity</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <AtlasCard title="Update follow-up">
          <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Status</Caption1>
              <select
                aria-label="Lead status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', minHeight: 32 }}
              >
                {PATCHABLE.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Next follow-up date</Caption1>
              <Input
                type="date"
                value={followUp}
                onChange={(_, d) => setFollowUp(d.value)}
                aria-label="Next follow-up date"
              />
            </label>
            <Button appearance="primary" onClick={() => void save()} disabled={saving || converting}>
              {saving ? <Spinner size="tiny" /> : 'Save'}
            </Button>
            {confirmConvert ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <Caption1>
                  Converts this lead into one Discovery Opportunity. Atlas will create or reuse the internal
                  company record ({lead.title}) and contact ({lead.contactName || lead.email || 'name on the lead'}).
                  Stage starts at Discovery. This does not grant client portal access, SharePoint client access, or
                  an HVCG-Client Entra group.
                </Caption1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button appearance="primary" onClick={() => void convert()} disabled={converting}>
                    {converting ? <Spinner size="tiny" /> : 'Confirm convert'}
                  </Button>
                  <Button
                    appearance="secondary"
                    onClick={() => setConfirmConvert(false)}
                    disabled={converting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button appearance="secondary" onClick={() => setConfirmConvert(true)} disabled={saving || converting}>
                Convert to opportunity
              </Button>
            )}
          </div>
        </AtlasCard>
      )}

      <AtlasCard title="Contact">
        <Caption1 style={{ display: 'block' }}>{lead.contactName || '—'}</Caption1>
        <Caption1 style={{ display: 'block' }}>{lead.email || 'No email on record'}</Caption1>
        <Caption1 style={{ display: 'block' }}>{lead.phone || ''}</Caption1>
      </AtlasCard>
    </ModuleScaffold>
  );
}
