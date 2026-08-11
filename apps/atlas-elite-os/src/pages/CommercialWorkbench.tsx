/**
 * Atlas Elite BA V2 commercial workbench — progressive disclosure on Opportunity.
 * Config-driven; BL-C1 prevents external send.
 */
import { useMemo, useState } from 'react';
import { AtlasCard, StatusChip, SectionHeader } from '@hvcg/atlas-design-system';
import { Button, Caption1, Field, Input, Text, Textarea } from '@fluentui/react-components';
import {
  attributionSources,
  draftProposalBody,
  listOffers,
  listServiceLines,
  recommendOfferFromNeed,
  recommendPricing,
  transitionProposal,
  validateFreeFitSubstantive,
  type ClientClassification,
  type CommercialClass,
  type DiagnosticRecord,
  type FreeFitRecord,
  type LeadSource,
  type ProposalDraft,
  type ProposalStatus,
  ACCG_LOCKED_MONTHLY,
  CURRENT_RATE_CARD_ID,
  BL_C1_ACTIVE,
} from '../commercial/baV2Commercial';

type Panel = 'qualification' | 'commercial' | 'pricing' | 'proposal' | 'attribution' | 'diagnostic';

export interface CommercialWorkbenchProps {
  opportunityId: string;
  clientName: string;
  defaultClassification?: ClientClassification;
  contractedMonthly?: number | null;
  initialReferralSource?: string;
}

export function CommercialWorkbench({
  opportunityId,
  clientName,
  defaultClassification = 'HVCG_NEW_CLIENT',
  contractedMonthly = null,
  initialReferralSource = '',
}: CommercialWorkbenchProps) {
  const [open, setOpen] = useState<Panel>('qualification');
  const [classification, setClassification] = useState<ClientClassification>(defaultClassification);
  const [leadSource, setLeadSource] = useState<LeadSource>('Referral Partner');
  const [referralPartner, setReferralPartner] = useState(initialReferralSource);
  const [needCategory, setNeedCategory] = useState('Funding but disorganized');
  const [serviceLine, setServiceLine] = useState('SL-CAPITAL');
  const [offerCode, setOfferCode] = useState('OFF-CAP-DIAG');
  const [commercialClass, setCommercialClass] = useState<CommercialClass>('STRUCTURED_OFFER');
  const [fit, setFit] = useState<FreeFitRecord | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [proposal, setProposal] = useState<ProposalDraft | null>(null);
  const [proposedSetup, setProposedSetup] = useState<string>('');
  const [proposedRetainer, setProposedRetainer] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [bypassReason, setBypassReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [attemptedSubstantive, setAttemptedSubstantive] = useState('');

  const offers = useMemo(() => listOffers(false), []);
  const lines = useMemo(() => listServiceLines(false), []);
  const recommendation = useMemo(() => {
    try {
      return recommendPricing({
        offerCode,
        commercialClass,
        clientClassification: classification,
        contractedCurrent: contractedMonthly,
      });
    } catch {
      return null;
    }
  }, [offerCode, commercialClass, classification, contractedMonthly]);

  const legacy = classification === 'HVS_LEGACY_CLIENT';

  function runFreeFit() {
    const blocked = validateFreeFitSubstantive(
      attemptedSubstantive
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const rule = recommendOfferFromNeed(needCategory);
    const next: FreeFitRecord = {
      assessmentId: `FIT-${opportunityId}`,
      company: clientName,
      revenueRange: 'Not specified',
      needCategory,
      capitalGoal: needCategory,
      urgency: 'Normal',
      systemsCondition: 'Unknown',
      documentAvailability: 'Partial',
      referralSource: referralPartner,
      leadSource,
      qualificationResult: blocked.length ? 'Disqualified' : 'Qualified',
      serviceFit: rule?.offerCode ? serviceLine : null,
      recommendedDiagnostic: rule?.diagnostic ?? 'DIAG-FULL-CAPITAL',
      recommendedOffer: rule?.offerCode ?? null,
      notes: 'Free Fit is QUALIFICATION only — not substantive advisory.',
      substantiveBlocked: blocked,
    };
    setFit(next);
    if (rule?.offerCode) {
      setOfferCode(rule.offerCode);
      const offer = offers.find((o) => o.offerCode === rule.offerCode);
      if (offer) {
        setCommercialClass(offer.category);
        setServiceLine(offer.serviceLine);
      }
    }
    setToast(blocked.length ? 'Free Fit blocked substantive work' : 'Free Fit qualification recorded');
    setOpen('diagnostic');
  }

  function startDiagnostic(bypass = false) {
    if (bypass && !bypassReason.trim()) {
      setToast('Bypass requires a reason (no silent bypass)');
      return;
    }
    const diagType = fit?.recommendedDiagnostic ?? 'DIAG-FULL-CAPITAL';
    const feeMap: Record<string, number> = {
      'DIAG-STARTER': 2500,
      'DIAG-FULL-CAPITAL': 5000,
      'DIAG-EXECUTIVE': 10000,
      'DIAG-CFO': 7500,
      'DIAG-PROCUREMENT': 4500,
      'DIAG-RISK': 5000,
      'DIAG-GROWTH': 4500,
      'DIAG-AI': 5000,
    };
    setDiagnostic({
      diagnosticId: `DIAG-${opportunityId}`,
      diagnosticType: diagType,
      fee: feeMap[diagType] ?? 5000,
      status: bypass ? 'BYPASSED' : 'IN_PROGRESS',
      pricingVersion: CURRENT_RATE_CARD_ID,
      requiredDocuments: ['Financial statements', 'Debt schedule', 'Org chart'],
      documentsReceived: bypass ? [] : ['Financial statements'],
      findingsFact: bypass ? [] : ['Revenue documented from client pack'],
      findingsAiInference: bypass ? [] : ['Likely working-capital pressure (AI inference)'],
      findingsAdvisorConclusion: bypass ? [] : ['Recommend Capital Readiness Diagnostic completion'],
      riskFlags: [],
      recommendedOffer: offerCode,
      recommendedServiceLine: serviceLine,
      humanApproval: false,
      completionDate: bypass ? new Date().toISOString().slice(0, 10) : null,
      bypass,
      bypassReason: bypass ? bypassReason.trim() : null,
      bypassAuthorizedBy: bypass ? 'Manny Barela' : null,
      bypassDate: bypass ? new Date().toISOString().slice(0, 10) : null,
    });
    setToast(bypass ? 'Diagnostic bypass audited' : 'Diagnostic started');
    setOpen('pricing');
  }

  function completeDiagnostic() {
    if (!diagnostic || diagnostic.bypass) return;
    setDiagnostic({
      ...diagnostic,
      status: 'COMPLETED',
      humanApproval: true,
      completionDate: new Date().toISOString().slice(0, 10),
      documentsReceived: diagnostic.requiredDocuments,
    });
    setToast('Diagnostic completed — human approval recorded');
    setOpen('pricing');
  }

  function createProposalDraft() {
    if (!recommendation) {
      setToast('Select a valid offer first');
      return;
    }
    const setup = proposedSetup ? Number(proposedSetup) : recommendation.recommendedSetupFee;
    const retainer = proposedRetainer ? Number(proposedRetainer) : recommendation.recommendedRetainer;
    const override =
      (setup != null && recommendation.recommendedSetupFee != null && setup !== recommendation.recommendedSetupFee) ||
      (retainer != null &&
        recommendation.recommendedRetainer != null &&
        retainer !== recommendation.recommendedRetainer)
        ? {
            type: 'MANUAL_PRICING_OVERRIDE' as const,
            approver: 'Pending',
            reason: overrideReason || 'Pending owner reason',
            date: new Date().toISOString().slice(0, 10),
          }
        : undefined;
    if (override && !overrideReason.trim()) {
      setToast('Pricing override requires a reason');
      return;
    }
    const body = draftProposalBody({
      clientName,
      offerCode,
      commercialClass,
      recommendation,
      proposedSetup: setup,
      proposedRetainer: retainer,
    });
    setProposal({
      status: 'DRAFT',
      archetype: commercialClass,
      offerCode,
      pricingVersionId: recommendation.pricingVersion,
      recommended: recommendation,
      proposedSetup: setup,
      proposedRetainer: retainer,
      override,
      body,
      canAutoSend: false,
      blC1Active: true,
      approvalStatus: 'None',
    });
    setToast('Proposal draft generated from canonical catalogs');
    setOpen('proposal');
  }

  function submitInternal() {
    if (!proposal) return;
    setProposal({ ...proposal, status: 'INTERNAL_REVIEW', approvalStatus: 'Pending' });
    setToast('Submitted for internal approval (HVCG_Approvals path)');
  }

  function approveProposal(action: 'Approve' | 'Reject' | 'Request Changes' | 'Approve Pricing Override' | 'Escalate') {
    if (!proposal) return;
    if (action === 'Reject') {
      setProposal({ ...proposal, status: 'DRAFT', approvalStatus: 'Rejected' });
      setToast('Proposal rejected');
      return;
    }
    if (action === 'Request Changes') {
      setProposal({ ...proposal, status: 'DRAFT', approvalStatus: 'ChangesRequested' });
      setToast('Changes requested');
      return;
    }
    if (action === 'Escalate') {
      setProposal({ ...proposal, status: 'OWNER_APPROVAL_REQUIRED', approvalStatus: 'Pending' });
      setToast('Escalated to owner');
      return;
    }
    const nextStatus: ProposalStatus = 'APPROVED_TO_SEND';
    setProposal({
      ...proposal,
      status: nextStatus,
      approvalStatus: 'Approved',
      override:
        action === 'Approve Pricing Override' && proposal.override
          ? { ...proposal.override, approver: 'Manny Barela' }
          : proposal.override,
    });
    setToast('APPROVED_TO_SEND — BL-C1 still blocks external send');
  }

  function attemptSend() {
    if (!proposal) return;
    const gate = transitionProposal(proposal.status, 'SENT');
    setToast(gate.ok ? 'Sent' : gate.error ?? 'Blocked');
  }

  function PanelToggle({ id, label }: { id: Panel; label: string }) {
    return (
      <Button appearance={open === id ? 'primary' : 'secondary'} size="small" onClick={() => setOpen(id)}>
        {label}
      </Button>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SectionHeader
        title="BA V2 Commercial Path"
        subtitle="Progressive disclosure · config-driven · BL-C1 active · Free Fit = qualification only"
      />
      {toast ? (
        <AtlasCard variant="quiet">
          <Text size={300}>{toast}</Text>
        </AtlasCard>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <PanelToggle id="qualification" label="Qualification" />
        <PanelToggle id="diagnostic" label="Diagnostic" />
        <PanelToggle id="commercial" label="Commercial Structure" />
        <PanelToggle id="pricing" label="Pricing" />
        <PanelToggle id="proposal" label="Proposal" />
        <PanelToggle id="attribution" label="Attribution" />
      </div>

      {open === 'qualification' ? (
        <AtlasCard title="Free Fit & Readiness Assessment" subtitle="QUALIFICATION — not substantive advisory">
          <Caption1 style={{ display: 'block', marginBottom: 12 }}>
            Restricted diagnostic actions are not available in Free Fit.
          </Caption1>
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <Field label="Company">
              <Input value={clientName} readOnly />
            </Field>
            <Field label="Need category">
              <select
                value={needCategory}
                onChange={(e) => setNeedCategory(e.target.value)}
                style={{ padding: '6px 8px' }}
              >
                {[
                  'Funding but disorganized',
                  'Ready for financing',
                  'Monthly finance leadership',
                  'Government/private contract pursuit',
                  'Agency/payroll/tax problem',
                  'Loss/insurance/recovery matter',
                  'Scaling without systems',
                  'Knowledge/workflow disorder',
                ].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Attempted substantive actions (comma-separated — should block)">
              <Input
                value={attemptedSubstantive}
                onChange={(_, d) => setAttemptedSubstantive(d.value)}
                placeholder="e.g. Full lender-readiness scoring"
              />
            </Field>
            <Button appearance="primary" onClick={runFreeFit}>
              Run Free Fit qualification
            </Button>
          </div>
          {fit ? (
            <div style={{ marginTop: 16, display: 'grid', gap: 6 }}>
              <StatusChip label={fit.qualificationResult} tone={fit.qualificationResult === 'Qualified' ? 'success' : 'warning'} />
              <Text size={300}>Recommended diagnostic: {fit.recommendedDiagnostic ?? '—'}</Text>
              <Text size={300}>Recommended offer: {fit.recommendedOffer ?? '—'}</Text>
              <Text size={300}>Next step: {fit.notes}</Text>
              {fit.substantiveBlocked.map((b) => (
                <Caption1 key={b} style={{ color: '#8a1c1c' }}>
                  {b}
                </Caption1>
              ))}
            </div>
          ) : null}
        </AtlasCard>
      ) : null}

      {open === 'diagnostic' ? (
        <AtlasCard title="Paid Diagnostic" subtitle="FACT / AI INFERENCE / ADVISOR CONCLUSION kept distinct">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Button appearance="primary" onClick={() => startDiagnostic(false)}>
              Start diagnostic
            </Button>
            <Button onClick={completeDiagnostic} disabled={!diagnostic || diagnostic.bypass || diagnostic.status === 'COMPLETED'}>
              Complete diagnostic
            </Button>
          </div>
          <Field label="Diagnostic bypass reason (required if bypassing)">
            <Input value={bypassReason} onChange={(_, d) => setBypassReason(d.value)} />
          </Field>
          <Button style={{ marginTop: 8 }} onClick={() => startDiagnostic(true)}>
            Bypass diagnostic (audited)
          </Button>
          {diagnostic ? (
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Text size={300}>
                Type {diagnostic.diagnosticType} · Fee ${diagnostic.fee.toLocaleString()} · Status {diagnostic.status}
              </Text>
              <Text size={300}>Pricing version: {diagnostic.pricingVersion}</Text>
              <Text size={300}>
                Completion:{' '}
                {Math.round(
                  (diagnostic.documentsReceived.length / Math.max(diagnostic.requiredDocuments.length, 1)) * 100
                )}
                %
              </Text>
              {diagnostic.bypass ? (
                <Caption1>
                  Bypass by {diagnostic.bypassAuthorizedBy} on {diagnostic.bypassDate}: {diagnostic.bypassReason}
                </Caption1>
              ) : null}
              <AtlasCard variant="quiet" title="FACT">
                {diagnostic.findingsFact.map((f) => (
                  <Caption1 key={f} style={{ display: 'block' }}>
                    {f}
                  </Caption1>
                ))}
              </AtlasCard>
              <AtlasCard variant="quiet" title="AI INFERENCE">
                {diagnostic.findingsAiInference.map((f) => (
                  <Caption1 key={f} style={{ display: 'block' }}>
                    {f}
                  </Caption1>
                ))}
              </AtlasCard>
              <AtlasCard variant="quiet" title="ADVISOR CONCLUSION">
                {diagnostic.findingsAdvisorConclusion.map((f) => (
                  <Caption1 key={f} style={{ display: 'block' }}>
                    {f}
                  </Caption1>
                ))}
              </AtlasCard>
            </div>
          ) : (
            <Caption1>No diagnostic yet — start or bypass with reason.</Caption1>
          )}
        </AtlasCard>
      ) : null}

      {open === 'commercial' ? (
        <AtlasCard title="Commercial structure" subtitle="Canonical Service Line + Offer lookups">
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <Field label="Client classification">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as ClientClassification)}
                style={{ padding: '6px 8px' }}
              >
                <option value="HVCG_NEW_CLIENT">NEW_HVCG_CLIENT</option>
                <option value="HVS_LEGACY_CLIENT">HVS_LEGACY_CLIENT</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </Field>
            <Field label="Service Line">
              <select value={serviceLine} onChange={(e) => setServiceLine(e.target.value)} style={{ padding: '6px 8px' }}>
                {lines.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offer">
              <select
                value={offerCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setOfferCode(code);
                  const o = offers.find((x) => x.offerCode === code);
                  if (o) {
                    setCommercialClass(o.category);
                    setServiceLine(o.serviceLine);
                  }
                }}
                style={{ padding: '6px 8px' }}
              >
                {offers.map((o) => (
                  <option key={o.offerCode} value={o.offerCode}>
                    {o.offerCode} — {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Text size={300}>Commercial Class: {commercialClass}</Text>
            <Text size={300}>Offer Version / Pricing Version: from rate card {CURRENT_RATE_CARD_ID}</Text>
          </div>
        </AtlasCard>
      ) : null}

      {open === 'pricing' ? (
        <AtlasCard title="Pricing" subtitle="Recommendations are not contracted prices">
          {legacy ? (
            <div
              style={{
                border: '2px solid #8a1c1c',
                background: '#fff5f5',
                padding: 12,
                marginBottom: 12,
                borderRadius: 4,
              }}
            >
              <Text weight="bold" size={500} style={{ display: 'block', color: '#8a1c1c' }}>
                EXISTING CONTRACTED PRICING PROTECTED
              </Text>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                Current Contracted Price: ${(contractedMonthly ?? ACCG_LOCKED_MONTHLY).toLocaleString()}/mo
              </Caption1>
              <Caption1 style={{ display: 'block' }}>
                Recommended Future Price: {recommendation?.recommendedFuture != null ? `$${recommendation.recommendedFuture.toLocaleString()}/mo` : '—'} (NOT CURRENT)
              </Caption1>
              <Caption1 style={{ display: 'block' }}>
                Proposed Future Price: {proposedRetainer ? `$${Number(proposedRetainer).toLocaleString()}/mo` : '—'} (NOT CURRENT)
              </Caption1>
              <Caption1 style={{ display: 'block' }}>Approval State: Pending — cannot overwrite contracted economics</Caption1>
            </div>
          ) : null}
          {recommendation ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <Text size={300}>Rate card: {recommendation.pricingVersion}</Text>
              <Text size={300}>State: {recommendation.pricingStateForNewEconomics}</Text>
              <Text size={300}>
                Recommended setup: {recommendation.recommendedSetupFee != null ? `$${recommendation.recommendedSetupFee.toLocaleString()}` : '—'}
              </Text>
              <Text size={300}>
                Recommended retainer: {recommendation.recommendedRetainer != null ? `$${recommendation.recommendedRetainer.toLocaleString()}` : '—'}
              </Text>
              <Text size={300}>Approval required: yes · Approved price: no</Text>
              <Caption1>{recommendation.rationale.join(' · ')}</Caption1>
              <Field label="Proposed setup (authorized edit)">
                <Input value={proposedSetup} onChange={(_, d) => setProposedSetup(d.value)} />
              </Field>
              <Field label="Proposed retainer (authorized edit)">
                <Input value={proposedRetainer} onChange={(_, d) => setProposedRetainer(d.value)} />
              </Field>
              <Field label="Override reason (if proposed ≠ recommended)">
                <Input value={overrideReason} onChange={(_, d) => setOverrideReason(d.value)} />
              </Field>
              <Button appearance="primary" onClick={createProposalDraft}>
                Generate proposal draft
              </Button>
            </div>
          ) : (
            <Caption1>Select offer in Commercial Structure.</Caption1>
          )}
        </AtlasCard>
      ) : null}

      {open === 'proposal' ? (
        <AtlasCard title="Proposal & internal approval" subtitle={`BL-C1 ${BL_C1_ACTIVE ? 'ACTIVE' : 'inactive'} — APPROVED_TO_SEND ≠ send`}>
          {!proposal ? (
            <Caption1>Generate a draft from Pricing first.</Caption1>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <StatusChip label={proposal.status} tone="gold" />
              <Text size={300}>
                Archetype {proposal.archetype} · Offer {proposal.offerCode} · Pricing {proposal.pricingVersionId}
              </Text>
              {proposal.override ? (
                <Caption1 style={{ color: '#8a1c1c' }}>
                  OVERRIDE: {proposal.override.reason} ({proposal.override.approver})
                </Caption1>
              ) : null}
              <Field label="Proposal preview (canonical body)">
                <Textarea value={proposal.body} readOnly rows={14} style={{ fontFamily: 'ui-monospace, monospace' }} />
              </Field>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button onClick={submitInternal}>Submit internal approval</Button>
                <Button appearance="primary" onClick={() => approveProposal('Approve')}>
                  Approve
                </Button>
                <Button onClick={() => approveProposal('Reject')}>Reject</Button>
                <Button onClick={() => approveProposal('Request Changes')}>Request Changes</Button>
                <Button onClick={() => approveProposal('Approve Pricing Override')}>Approve Pricing Override</Button>
                <Button onClick={() => approveProposal('Escalate')}>Escalate</Button>
                <Button appearance="secondary" onClick={attemptSend}>
                  Attempt external send (must fail)
                </Button>
              </div>
              <Caption1>Approval status: {proposal.approvalStatus}</Caption1>
            </div>
          )}
        </AtlasCard>
      ) : null}

      {open === 'attribution' ? (
        <AtlasCard title="Attribution" subtitle="Lead Source ≠ Referral Partner">
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <Field label="Lead Source">
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                style={{ padding: '6px 8px' }}
              >
                {attributionSources().map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Referral Partner / Source">
              <Input value={referralPartner} onChange={(_, d) => setReferralPartner(d.value)} />
            </Field>
            <Caption1>
              High Value Founder / content campaigns remain DEFERRED_OWNER_GATE — taxonomy ready only.
            </Caption1>
          </div>
        </AtlasCard>
      ) : null}
    </div>
  );
}
