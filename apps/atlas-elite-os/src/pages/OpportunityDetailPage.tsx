/**
 * HVCG_Opportunities record after governed Lead conversion. Hub is authoritative.
 * This is sales CRM, not the capital desk or client-activation workflow.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  ErrorState,
  LoadingState,
  ResponsiveGrid,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Checkbox,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { FieldGrid, ModuleScaffold } from './shared/ModuleScaffold';
import { fetchPmOpportunity, HubHttpError, patchPmOpportunity, type PmOpportunity } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { atlasStatusDisplay, atlasStatusTone, type AtlasStatusTone } from '../ui/statusLanguage';

const STAGES = ['Discovery', 'Assessment', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
const OUTCOMES = ['Open', 'Won', 'Lost', 'Abandoned'] as const;
const LOST_REASONS = ['', 'Price', 'Timing', 'Competitor', 'Fit', 'Capacity', 'Other'] as const;

function classify(err: unknown): { kind: 'auth' | 'forbidden' | 'error'; message: string } {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  if (status === 403) return { kind: 'forbidden', message: 'Authenticated but not authorized for this opportunity (403).' };
  if (status === 404) return { kind: 'error', message: 'Opportunity not found or not in your authorized scope.' };
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

function dayStamp(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso.slice(0, 10);
  return new Date(t).toISOString().slice(0, 10);
}

function attentionTone(opportunity: PmOpportunity): AtlasStatusTone {
  const severity = opportunity.attention?.severity;
  if (severity === 'danger') return 'danger';
  if (severity === 'warning') return 'warning';
  if (severity === 'success') return 'success';
  return atlasStatusTone(opportunity.attention?.label || opportunity.stage);
}

export function OpportunityDetailPage() {
  const { opportunityId = '' } = useParams();
  const auth = useHubAuth();
  const [opportunity, setOpportunity] = useState<PmOpportunity | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ kind: 'auth' | 'forbidden' | 'error'; message: string } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [stage, setStage] = useState('Discovery');
  const [winLossStatus, setWinLossStatus] = useState('Open');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [requiresExecutiveAttention, setRequiresExecutiveAttention] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setOpportunity(null);
      setFailure({ kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' });
      return;
    }
    setBusy(true);
    setFailure(null);
      setActionError(null);
    try {
      const data = await fetchPmOpportunity(auth, opportunityId);
      setOpportunity(data.opportunity);
      setStage(data.opportunity.stage || 'Discovery');
      setWinLossStatus(data.opportunity.winLossStatus || 'Open');
      setOwnerEmail(data.opportunity.ownerEmail || '');
      setNextAction(data.opportunity.nextAction || '');
      setNextActionDate(dayStamp(data.opportunity.nextActionDate));
      setExpectedCloseDate(dayStamp(data.opportunity.expectedCloseDate));
      setRequiresExecutiveAttention(Boolean(data.opportunity.requiresExecutiveAttention));
      setLostReason(data.opportunity.lostReason || '');
      setNotes(data.opportunity.notes || '');
    } catch (err) {
      setOpportunity(null);
      setFailure(classify(err));
    } finally {
      setBusy(false);
    }
  }, [auth, opportunityId]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  const save = async () => {
    if (!opportunity) return;
    setSaving(true);
    setActionError(null);
    try {
      const data = await patchPmOpportunity(auth, opportunity.id, {
        etag: opportunity.etag,
        stage,
        winLossStatus,
        ownerEmail,
        nextAction,
        nextActionDate,
        expectedCloseDate,
        requiresExecutiveAttention,
        lostReason: lostReason || undefined,
        notes,
      });
      setOpportunity(data.opportunity);
      setStage(data.opportunity.stage || 'Discovery');
      setWinLossStatus(data.opportunity.winLossStatus || 'Open');
      setOwnerEmail(data.opportunity.ownerEmail || '');
      setNextAction(data.opportunity.nextAction || '');
      setNextActionDate(dayStamp(data.opportunity.nextActionDate));
      setExpectedCloseDate(dayStamp(data.opportunity.expectedCloseDate));
      setRequiresExecutiveAttention(Boolean(data.opportunity.requiresExecutiveAttention));
      setLostReason(data.opportunity.lostReason || '');
      setNotes(data.opportunity.notes || '');
    } catch (err) {
      setActionError(classify(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (!auth.tokenReady || (busy && !opportunity && !failure)) {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Loading authorized HVCG_Opportunities record…" showPendingBanner={false}>
        <LoadingState rows={4} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading opportunity'} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth') {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState title="Authenticated access required" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden') {
    return (
      <ModuleScaffold title="Opportunity" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure || !opportunity) {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Record unavailable" showPendingBanner={false}>
        <ErrorState
          title="Opportunity could not load"
          description={failure?.message || 'Hub did not return this HVCG_Opportunities record.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  const chip = atlasStatusDisplay(opportunity.stage);
  const closedWon = opportunity.winLossStatus === 'Won' || opportunity.stage === 'Won';
  const closedLost =
    opportunity.winLossStatus === 'Lost' || opportunity.winLossStatus === 'Abandoned' || opportunity.stage === 'Lost';

  return (
    <ModuleScaffold
      title={opportunity.title}
      subtitle={[opportunity.opportunityType, opportunity.winLossStatus || 'Open', opportunity.clientStage || 'Prospect']
        .filter(Boolean)
        .join(' · ') || 'HVCG_Opportunities'}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/leads">
            <Button appearance="secondary">Leads</Button>
          </Link>
          <Link to="/opportunities">
            <Button appearance="secondary">Pipeline</Button>
          </Link>
          {opportunity.leadId ? (
            <Link to={`/leads/${encodeURIComponent(opportunity.leadId)}`}>
              <Button appearance="secondary">Source lead</Button>
            </Link>
          ) : null}
          {opportunity.clientStage === 'Active Client' && opportunity.clientCode ? (
            <Link to={`/clients/${encodeURIComponent(opportunity.clientCode)}`}>
              <Button appearance="secondary">Company</Button>
            </Link>
          ) : null}
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Opportunity update did not complete</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={chip?.label || opportunity.stage} tone={chip?.tone || 'info'} />
          <StatusChip label={opportunity.attention?.label || 'Open'} tone={attentionTone(opportunity)} />
          {opportunity.opportunityType ? (
            <StatusChip label={opportunity.opportunityType} tone="neutral" />
          ) : null}
          {closedWon ? <StatusChip label="Client activation required" tone="gold" /> : null}
          {closedLost ? <StatusChip label="Removed from active pipeline" tone="neutral" /> : null}
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          {[
            opportunity.ownerEmail ? `Owner ${opportunity.ownerEmail}` : null,
            opportunity.clientCode,
            opportunity.clientStage && opportunity.clientStage !== 'Active Client'
              ? opportunity.clientStage
              : null,
            opportunity.attention?.reason,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
      </AtlasCard>

      <FieldGrid
        fields={[
          { label: 'Prospect', value: [opportunity.clientStage || 'Prospect', opportunity.clientCode].filter(Boolean).join(' · ') || 'Prospect' },
          { label: 'Owner', value: opportunity.ownerEmail || 'Unassigned' },
          { label: 'Next action', value: opportunity.nextAction || 'No next action recorded' },
          { label: 'Due date', value: dayStamp(opportunity.nextActionDate) || 'No due date' },
          { label: 'Expected close', value: dayStamp(opportunity.expectedCloseDate) || 'Not forecast' },
          { label: 'Outcome', value: opportunity.winLossStatus || 'Open' },
        ]}
      />

      <ResponsiveGrid>
        <AtlasCard title="Operate opportunity">
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Stage</Caption1>
              <select aria-label="Opportunity stage" value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: '100%', minHeight: 32 }}>
                {STAGES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Win / loss status</Caption1>
              <select
                aria-label="Opportunity win/loss status"
                value={winLossStatus}
                onChange={(e) => setWinLossStatus(e.target.value)}
                style={{ width: '100%', minHeight: 32 }}
              >
                {OUTCOMES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Owner</Caption1>
              <Input value={ownerEmail} onChange={(_, d) => setOwnerEmail(d.value)} aria-label="Opportunity owner email" />
            </label>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Next action</Caption1>
              <Textarea value={nextAction} onChange={(_, d) => setNextAction(d.value)} aria-label="Opportunity next action" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <label>
                <Caption1 style={{ display: 'block', marginBottom: 4 }}>Next action due</Caption1>
                <Input type="date" value={nextActionDate} onChange={(_, d) => setNextActionDate(d.value)} aria-label="Next action due date" />
              </label>
              <label>
                <Caption1 style={{ display: 'block', marginBottom: 4 }}>Expected close</Caption1>
                <Input type="date" value={expectedCloseDate} onChange={(_, d) => setExpectedCloseDate(d.value)} aria-label="Expected close date" />
              </label>
            </div>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Lost reason</Caption1>
              <select aria-label="Lost reason" value={lostReason} onChange={(e) => setLostReason(e.target.value)} style={{ width: '100%', minHeight: 32 }}>
                {LOST_REASONS.map((value) => (
                  <option key={value || 'blank'} value={value}>
                    {value || 'Not lost'}
                  </option>
                ))}
              </select>
            </label>
            <Checkbox
              checked={requiresExecutiveAttention}
              onChange={(_, d) => setRequiresExecutiveAttention(Boolean(d.checked))}
              label="Needs Manny"
            />
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Source / notes</Caption1>
              <Textarea value={notes} onChange={(_, d) => setNotes(d.value)} aria-label="Opportunity notes" />
            </label>
            <Button appearance="primary" onClick={() => void save()} disabled={saving || busy}>
              {saving ? <Spinner size="tiny" /> : 'Save opportunity'}
            </Button>
          </div>
        </AtlasCard>

        <AtlasCard title="What Atlas will not do here">
          <Text weight="semibold" style={{ display: 'block' }}>
            Sales outcome is not client activation.
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Saving this Opportunity can update sales stage, owner, next action, due date, notes, and win/loss outcome.
            It does not change ClientStage to Active Client, provision HVCG-Client groups, grant SharePoint or portal access,
            or send external communications.
          </Caption1>
          {closedWon ? (
            <MessageBar intent="warning" style={{ marginTop: 12 }}>
              <MessageBarBody>
                <MessageBarTitle>Client activation required</MessageBarTitle>
                This won Opportunity is ready for a separate approved onboarding/activation workflow when that policy exists.
              </MessageBarBody>
            </MessageBar>
          ) : null}
        </AtlasCard>
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}
