/**
 * Free Fit & Readiness Assessment — UAT-FIND-002 Owner-facing bridge.
 * Canonical calculation: Hub → BA free_fit_runtime → revenue_conversion.complete_free_fit.
 * Browser state is display-only — Development persistence is BA-owned.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Field,
  Spinner,
  Text,
  Textarea,
  Dropdown,
  Option,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { useAtlasRole } from '../security/RoleProvider';
import {
  baFreeFitByLead,
  baFreeFitComplete,
  baFreeFitDefinition,
  baFreeFitOwnerDecision,
  baLeadGet,
  type DevLead,
  type FreeFitAssessment,
  type FreeFitDefinition,
} from '../integrations/hub/baApi';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';

const OWNER_DECISION_LABELS: Record<string, string> = {
  ACCEPT_RECOMMENDATION: 'Accept Atlas recommendation',
  REQUEST_MORE_INFO: 'Request more information',
  DO_NOT_ADVANCE: 'Decline / do not advance',
  CHOOSE_ALTERNATE_PATH: 'Choose a different approved commercial path',
};

export function FreeFitWorkbench() {
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
  const [params] = useSearchParams();
  const leadId = params.get('lead') || '';

  const [lead, setLead] = useState<DevLead | null>(null);
  const [definition, setDefinition] = useState<FreeFitDefinition | null>(null);
  const [assessment, setAssessment] = useState<FreeFitAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needType, setNeedType] = useState('Funding but disorganized');
  const [revenueRange, setRevenueRange] = useState('$1M–$5M');
  const [urgency, setUrgency] = useState('Normal');
  const [capitalGoal, setCapitalGoal] = useState('');
  const [ownerDecision, setOwnerDecision] = useState('ACCEPT_RECOMMENDATION');
  const [alternateClass, setAlternateClass] = useState('STRUCTURED_OFFER');
  const [ownerNotes, setOwnerNotes] = useState('');

  const load = useCallback(async () => {
    if (!leadId) {
      setError('Missing lead query — open Free Fit from an accepted prospect.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [leadRes, defRes, byLead] = await Promise.all([
        baLeadGet(auth, leadId) as Promise<{ lead?: DevLead; ok?: boolean; message?: string }>,
        baFreeFitDefinition(auth) as Promise<FreeFitDefinition & { ok?: boolean }>,
        baFreeFitByLead(auth, leadId) as Promise<{ latest?: FreeFitAssessment | null }>,
      ]);
      if (!leadRes.lead) {
        setError(leadRes.message || 'Lead not found or unauthorized');
        setLead(null);
        return;
      }
      setLead(leadRes.lead);
      setDefinition(defRes);
      setAssessment(byLead.latest || null);
      setCapitalGoal((prev) => prev || leadRes.lead?.BusinessNeed || '');
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [auth, leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onComplete = async () => {
    if (!leadId || !needType) return;
    setBusy(true);
    setError(null);
    try {
      const data = (await baFreeFitComplete(auth, {
        leadId,
        needType,
        revenueRange,
        urgency,
        capitalGoal: capitalGoal || lead?.BusinessNeed || undefined,
        primaryIssue: capitalGoal || lead?.BusinessNeed || undefined,
      })) as { ok?: boolean; assessment?: FreeFitAssessment; message?: string };
      if (!data.ok || !data.assessment) {
        setError(data.message || 'Free Fit completion failed');
        return;
      }
      setAssessment(data.assessment);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const onOwnerDecide = async () => {
    if (!assessment?.assessmentId) return;
    setBusy(true);
    setError(null);
    try {
      const data = (await baFreeFitOwnerDecision(auth, {
        assessmentId: assessment.assessmentId,
        decision: ownerDecision,
        alternateCommercialClass:
          ownerDecision === 'CHOOSE_ALTERNATE_PATH' ? alternateClass : undefined,
        notes: ownerNotes || undefined,
      })) as { ok?: boolean; assessment?: FreeFitAssessment; message?: string };
      if (!data.ok || !data.assessment) {
        setError(data.message || 'Owner decision failed');
        return;
      }
      setAssessment(data.assessment);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const needOptions = definition?.needOptions || [];
  const pendingOwner = assessment && assessment.ownerDecisionStatus === 'PENDING_OWNER';

  return (
    <ModuleScaffold
      title="Free Fit & Readiness"
      subtitle="Qualification only · BA-owned calculation · AI recommendation ≠ Owner approval · BL-C1 active"
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={leadId ? `/clients/intake?lead=${encodeURIComponent(leadId)}` : '/clients/intake'}>
            <Button appearance="secondary">Back to prospect</Button>
          </Link>
          <Button onClick={() => void load()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Free Fit = qualification</MessageBarTitle>
          Atlas recommends fit, domain, Paid Diagnostic (where appropriate), and commercial class.
          It does not deliver consulting work, create contracts, send proposals, or convert prospects
          to clients.
        </MessageBarBody>
      </MessageBar>

      {error ? (
        <AtlasCard title="Error">
          <Text>{error}</Text>
        </AtlasCard>
      ) : null}

      {lead ? (
        <AtlasCard title={lead.Title} subtitle={lead.LeadId}>
          <Caption1 style={{ display: 'block' }}>
            Source: {lead.Source}
            {lead.LeadSourceDetail ? ` · ${lead.LeadSourceDetail}` : ''}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Need: {lead.BusinessNeed || '—'} · Service interest: {lead.ServiceInterest || '—'}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Lifecycle: {lead.LifecycleLabel || lead.LeadStatus} · Client 360?{' '}
            {lead.IsClient360Client ? 'Yes' : 'No'}
          </Caption1>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label="Prospect / Lead" tone="info" />
            <StatusChip label="BL-C1: no auto-send" tone="warning" />
          </div>
        </AtlasCard>
      ) : null}

      {!assessment ? (
        <AtlasCard title="Qualification questions" subtitle="Canonical Free Fit questionnaire">
          <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
            <Field label="Primary business need (canonical)">
              <Dropdown
                value={needType}
                selectedOptions={[needType]}
                onOptionSelect={(_, d) => setNeedType(String(d.optionValue || needType))}
              >
                {needOptions.map((n) => (
                  <Option key={n.need} value={n.need}>
                    {n.need}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Revenue range">
              <Dropdown
                value={revenueRange}
                selectedOptions={[revenueRange]}
                onOptionSelect={(_, d) => setRevenueRange(String(d.optionValue || revenueRange))}
              >
                {(definition?.revenueRangeOptions || []).map((r) => (
                  <Option key={r} value={r}>
                    {r}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Urgency">
              <Dropdown
                value={urgency}
                selectedOptions={[urgency]}
                onOptionSelect={(_, d) => setUrgency(String(d.optionValue || urgency))}
              >
                {(definition?.urgencyOptions || []).map((u) => (
                  <Option key={u} value={u}>
                    {u}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Capital / readiness goal">
              <Textarea
                value={capitalGoal}
                onChange={(_, d) => setCapitalGoal(d.value)}
                rows={2}
                placeholder="Growth capital + financial readiness"
              />
            </Field>
            <Button appearance="primary" onClick={() => void onComplete()} disabled={busy || !leadId}>
              Complete Free Fit assessment
            </Button>
            {busy ? <Spinner size="tiny" /> : null}
          </div>
        </AtlasCard>
      ) : (
        <>
          <AtlasCard title="Atlas Recommendation" subtitle="System calculation — not Owner approval">
            <Text block>Fit / readiness: {assessment.qualificationResult || '—'}</Text>
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Recommended HVCG domain: {assessment.recommendedServiceDomain || '—'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Paid Diagnostic: {assessment.recommendedDiagnostic || 'Not recommended'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Offer code: {assessment.recommendedOffer || '—'} · Commercial class:{' '}
              {assessment.recommendedCommercialClass || '—'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Engine next action: {assessment.engineNextAction || '—'}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Assessment ID: {assessment.assessmentId} · Linked lead: {assessment.leadId}
            </Caption1>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label="No contract" tone="success" />
              <StatusChip
                label={assessment.proposalSent ? 'Proposal sent' : 'No proposal sent'}
                tone="success"
              />
              <StatusChip
                label={assessment.convertedToClient ? 'Converted' : 'Still prospect'}
                tone="info"
              />
            </div>
          </AtlasCard>

          <AtlasCard title="Owner Decision" subtitle="AI recommendation ≠ Owner approval">
            {pendingOwner ? (
              <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
                <Field label="Your decision">
                  <Dropdown
                    value={OWNER_DECISION_LABELS[ownerDecision] || ownerDecision}
                    selectedOptions={[ownerDecision]}
                    onOptionSelect={(_, d) => setOwnerDecision(String(d.optionValue || ownerDecision))}
                  >
                    {(definition?.ownerDecisions || Object.keys(OWNER_DECISION_LABELS)).map((d) => (
                      <Option key={d} value={d}>
                        {OWNER_DECISION_LABELS[d] || d}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                {ownerDecision === 'CHOOSE_ALTERNATE_PATH' ? (
                  <Field label="Alternate approved commercial class">
                    <Dropdown
                      value={alternateClass}
                      selectedOptions={[alternateClass]}
                      onOptionSelect={(_, d) => setAlternateClass(String(d.optionValue || alternateClass))}
                    >
                      {(definition?.commercialClasses || []).map((c) => (
                        <Option key={c} value={c}>
                          {c}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                ) : null}
                <Field label="Notes (optional)">
                  <Textarea value={ownerNotes} onChange={(_, d) => setOwnerNotes(d.value)} rows={2} />
                </Field>
                <Button appearance="primary" onClick={() => void onOwnerDecide()} disabled={busy}>
                  Record Owner decision
                </Button>
              </div>
            ) : (
              <>
                <Text block>
                  Recorded: {OWNER_DECISION_LABELS[assessment.ownerDecision || ''] || assessment.ownerDecision}
                </Text>
                <Caption1 style={{ display: 'block', marginTop: 8 }}>
                  Next action: {assessment.nextAction}
                </Caption1>
                <Button
                  style={{ marginTop: 12 }}
                  appearance="secondary"
                  onClick={() => {
                    setAssessment(null);
                  }}
                >
                  Start another assessment (new version)
                </Button>
              </>
            )}
            {pendingOwner ? (
              <Caption1 style={{ display: 'block', marginTop: 12 }}>
                Current displayed next action (pending your decision): {assessment.nextAction}
              </Caption1>
            ) : null}
          </AtlasCard>
        </>
      )}
    </ModuleScaffold>
  );
}
