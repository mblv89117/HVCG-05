/**
 * Opportunity workspace — Manny operates a single capital file here.
 * Strategy / shortlist Approve controls are Manny gates.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AtlasCard,
  DataTable,
  EmptyState,
  SectionRail,
  StatusChip,
  InsightCard,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  AI_DISCLAIMER,
  decideShortlist,
  decideStrategy,
  FINANCING_DISCLAIMER,
  formatStage,
  formatUsd,
  generateOpportunityChecklist,
  loadMissingRequest,
  loadOpportunity,
  MANNY_GATE_COPY,
  runLenderMatch,
  SYNTHETIC_BANNER,
  transitionOpportunity,
  type CapitalDataSource,
  type CapitalOpportunityDetail,
  type StrategyDecision,
} from './capitalApi';

type WorkspaceTab =
  | 'overview'
  | 'checklist'
  | 'documents'
  | 'underwriting'
  | 'strategy'
  | 'lenders'
  | 'application'
  | 'submissions'
  | 'offers'
  | 'closing'
  | 'fees';

const TABS: Array<[WorkspaceTab, string]> = [
  ['overview', 'Overview'],
  ['checklist', 'Checklist'],
  ['documents', 'Documents'],
  ['underwriting', 'Underwriting'],
  ['strategy', 'Strategy'],
  ['lenders', 'Lenders / Match'],
  ['application', 'Application'],
  ['submissions', 'Submission tracking'],
  ['offers', 'Offers'],
  ['closing', 'Closing'],
  ['fees', 'Fees'],
];

function verificationTone(v: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (v === 'VERIFIED') return 'success';
  if (v === 'UNVERIFIED' || v === 'DERIVED') return 'warning';
  if (v === 'CONFLICTING' || v === 'MISSING') return 'danger';
  return 'info';
}

function matchTone(band: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold' {
  if (band === 'BEST_FIT') return 'success';
  if (band === 'POSSIBLE') return 'gold';
  if (band === 'LOW_FIT') return 'warning';
  if (band === 'INELIGIBLE') return 'danger';
  return 'neutral';
}

function ProvenanceNote({ source }: { source: CapitalDataSource }) {
  if (source !== 'synthetic') {
    return (
      <Caption1 style={{ display: 'block' }}>
        Hub record. {FINANCING_DISCLAIMER} {AI_DISCLAIMER}
      </Caption1>
    );
  }
  return (
    <Caption1 style={{ display: 'block' }}>
      SYNTHETIC demonstration figures — not live client financials. {FINANCING_DISCLAIMER}
    </Caption1>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
      <Caption1 style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</Caption1>
      <Text weight="semibold">{value}</Text>
    </div>
  );
}

export function OpportunityWorkspace({
  opportunityId,
  source,
  onBack,
  onChanged,
}: {
  opportunityId: string;
  source: CapitalDataSource;
  onBack: () => void;
  onChanged?: () => void;
}) {
  const auth = useHubAuth();
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [detail, setDetail] = useState<CapitalOpportunityDetail | null>(null);
  const [activeSource, setActiveSource] = useState<CapitalDataSource>(source);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadOpportunity(auth, opportunityId, { source });
      setDetail(res.detail);
      setActiveSource(res.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capital opportunity');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [auth, opportunityId, source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (action: () => Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      setDetail(res.detail);
      setActiveSource(res.source);
      setNotice(ok);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const o = detail?.opportunity;
  const strategyPending = o?.mannyStrategyApproval === 'PENDING' || o?.stage === 'AwaitingMannyStrategyApproval';
  const shortlistPending = o?.mannyShortlistApproval === 'PENDING' || o?.stage === 'AwaitingMannyShortlistApproval';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button appearance="secondary" icon={<ArrowLeftRegular />} onClick={onBack} aria-label="Back to Capital Command Center">
          Back to queues
        </Button>
        {o ? <StatusChip label={formatStage(o.stage)} tone={strategyPending || shortlistPending ? 'danger' : 'info'} /> : null}
        {activeSource === 'synthetic' ? <StatusChip label="SYNTHETIC" tone="warning" /> : <StatusChip label="Hub" tone="info" />}
      </div>

      {activeSource === 'synthetic' ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>SYNTHETIC</MessageBarTitle>
            {SYNTHETIC_BANNER}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Opportunity</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {notice ? (
        <MessageBar intent="success">
          <MessageBarBody>{notice}</MessageBarBody>
        </MessageBar>
      ) : null}

      {loading && !detail ? (
        <Spinner label="Loading capital opportunity…" />
      ) : !o ? (
        <EmptyState title="Opportunity not found" description="Return to the command center and select another row." />
      ) : (
        <>
          <AtlasCard
            title={o.title}
            subtitle={`${o.companyName || o.clientCode} · ${o.clientCode} · ${o.transactionType.replace(/_/g, ' ')}`}
            variant="accent"
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <Fact
                label="Requested amount"
                value={
                  activeSource === 'synthetic'
                    ? `${formatUsd(o.need.requestedAmount)} (synthetic)`
                    : formatUsd(o.need.requestedAmount)
                }
              />
              <Fact label="Stage" value={formatStage(o.stage)} />
              <Fact label="Next action" value={o.nextAction || 'Not recorded'} />
              <Fact label="Owner" value={o.nextActionOwner || o.ownerEmail} />
              <Fact label="Strategy gate" value={o.mannyStrategyApproval} />
              <Fact label="Shortlist gate" value={o.mannyShortlistApproval} />
            </div>
            <ProvenanceNote source={activeSource} />
          </AtlasCard>

          <TabList
            selectedValue={tab}
            onTabSelect={(_, d) => setTab(String(d.value) as WorkspaceTab)}
            aria-label="Capital opportunity sections"
          >
            {TABS.map(([value, label]) => (
              <Tab key={value} value={value}>
                {label}
              </Tab>
            ))}
          </TabList>

          {tab === 'overview' ? (
            <SectionRail title="Overview" subtitle="Need, blockers, and Manny gates">
              <div style={{ display: 'grid', gap: 12 }}>
                <AtlasCard title="Need" subtitle="HVCG is not a lender">
                  <Text>{o.need.purpose || 'Purpose not recorded'}</Text>
                  <Caption1 style={{ display: 'block', marginTop: 8 }}>
                    Use of funds: {o.need.useOfFunds || 'Not recorded'} · Timing: {o.need.timing || 'Not recorded'}
                  </Caption1>
                  {o.blockers ? (
                    <Caption1 style={{ display: 'block', marginTop: 8, color: '#B91C1C' }}>Blocker: {o.blockers}</Caption1>
                  ) : null}
                </AtlasCard>
                <AtlasCard title="Business facts" subtitle="Missing stays missing — never guessed">
                  <Caption1>
                    Industry: {o.business?.industry || 'Not recorded'} · Revenue:{' '}
                    {o.business?.annualRevenue?.value == null
                      ? 'Not recorded'
                      : `${formatUsd(o.business.annualRevenue.value)} (${o.business.annualRevenue.verification}${
                          activeSource === 'synthetic' ? ', synthetic' : ''
                        })`}
                  </Caption1>
                </AtlasCard>
                <InsightCard title="Operating rules" body={`${MANNY_GATE_COPY} ${AI_DISCLAIMER} ${FINANCING_DISCLAIMER}`} />
              </div>
            </SectionRail>
          ) : null}

          {tab === 'checklist' ? (
            <SectionRail
              title="Document checklist"
              subtitle="Required items by transaction type"
              actions={
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => generateOpportunityChecklist(auth, o.id, { source: activeSource }),
                      'Checklist generated. Items remain unverified until a human accepts source documents.',
                    )
                  }
                  aria-label="Generate document checklist"
                >
                  Generate checklist
                </Button>
              }
            >
              {detail.checklist.length === 0 ? (
                <EmptyState title="No checklist yet" description="Generate a checklist for this transaction type." />
              ) : (
                <DataTable
                  ariaLabel="Capital document checklist"
                  getRowKey={(r) => r.id}
                  rows={detail.checklist}
                  columns={[
                    { key: 'name', header: 'Item', sticky: 'left', render: (r) => r.name },
                    { key: 'category', header: 'Category', render: (r) => r.category },
                    { key: 'req', header: 'Required', render: (r) => r.requiredness },
                    { key: 'who', header: 'Owner', render: (r) => r.responsibleParty },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => (
                        <StatusChip
                          label={r.status}
                          tone={r.status === 'ACCEPTED' ? 'success' : r.status === 'MISSING' || r.status === 'INCOMPLETE' ? 'danger' : 'warning'}
                        />
                      ),
                    },
                    {
                      key: 'ver',
                      header: 'Verification',
                      render: (r) => <StatusChip label={r.verification} tone={verificationTone(r.verification)} />,
                    },
                    { key: 'def', header: 'Deficiency', render: (r) => r.deficiency || '—' },
                  ]}
                />
              )}
              <div style={{ marginTop: 12 }}>
                <Button
                  size="small"
                  appearance="secondary"
                  disabled={busy}
                  aria-label="Load consolidated missing-document request"
                  onClick={() =>
                    void (async () => {
                      setBusy(true);
                      try {
                        const res = await loadMissingRequest(auth, o.id, { source: activeSource });
                        setNotice(res.request?.subject || 'No outstanding required documents.');
                        if (res.request) {
                          setDetail((cur) => (cur ? { ...cur, missingRequest: res.request } : cur));
                        }
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to load missing request');
                      } finally {
                        setBusy(false);
                      }
                    })()
                  }
                >
                  Missing-document request
                </Button>
              </div>
              {detail.missingRequest ? (
                <AtlasCard title={detail.missingRequest.subject} subtitle="Consolidated client request" variant="quiet">
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{detail.missingRequest.body}</Text>
                </AtlasCard>
              ) : null}
            </SectionRail>
          ) : null}

          {tab === 'documents' ? (
            <SectionRail title="Documents" subtitle="Original files preserved — AI classification is unverified">
              {detail.documents.length === 0 ? (
                <EmptyState
                  title="No documents associated"
                  description="Accepted checklist items appear here after a human associates a source file."
                />
              ) : (
                <DataTable
                  ariaLabel="Capital opportunity documents"
                  getRowKey={(r) => r.id}
                  rows={detail.documents}
                  columns={[
                    { key: 'file', header: 'File', render: (r) => r.fileName },
                    { key: 'type', header: 'Type', render: (r) => r.documentType },
                    { key: 'src', header: 'Source', render: (r) => r.source },
                    {
                      key: 'ver',
                      header: 'Verification',
                      render: (r) => <StatusChip label={r.verification || 'UNVERIFIED'} tone={verificationTone(r.verification || 'UNVERIFIED')} />,
                    },
                    { key: 'by', header: 'Associated by', render: (r) => r.associatedBy },
                  ]}
                />
              )}
            </SectionRail>
          ) : null}

          {tab === 'underwriting' ? (
            <SectionRail title="Underwriting" subtitle="Advisory draft — not a credit decision">
              {!detail.underwriting ? (
                <EmptyState title="No underwriting draft" description="Drafts appear after documents are in review. AI output is unverified." />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      <MessageBarTitle>Unverified AI draft</MessageBarTitle>
                      {detail.underwriting.disclaimer}
                    </MessageBarBody>
                  </MessageBar>
                  {Object.entries(detail.underwriting.sections).map(([k, v]) => (
                    <AtlasCard key={k} title={k}>
                      <Text>{v}</Text>
                    </AtlasCard>
                  ))}
                  <AtlasCard title="Missing information">
                    {detail.underwriting.missingInformation.length ? (
                      <ul>
                        {detail.underwriting.missingInformation.map((m) => (
                          <li key={m}>
                            <Text size={300}>{m}</Text>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Caption1>None recorded</Caption1>
                    )}
                  </AtlasCard>
                </div>
              )}
            </SectionRail>
          ) : null}

          {tab === 'strategy' ? (
            <SectionRail title="Financing strategy" subtitle="Manny gate — Approve / Revise / Reject">
              {!detail.strategy ? (
                <EmptyState
                  title="No strategy draft"
                  description="Strategy is drafted after underwriting. It is not an HVCG recommendation until Manny approves."
                />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      <MessageBarTitle>Manny gate</MessageBarTitle>
                      {MANNY_GATE_COPY} {detail.strategy.disclaimer}
                    </MessageBarBody>
                  </MessageBar>
                  <AtlasCard title="Need summary" subtitle={detail.strategy.needSummary}>
                    <Text>{detail.strategy.rationale}</Text>
                    <Caption1 style={{ display: 'block', marginTop: 8 }}>
                      Approval: {detail.strategy.mannyApproval}
                      {detail.strategy.approvedBy ? ` · ${detail.strategy.approvedBy}` : ''}
                    </Caption1>
                  </AtlasCard>
                  <AtlasCard title="Paths (ranked, not guaranteed)">
                    {detail.strategy.paths.map((p) => (
                      <div key={p.rank} style={{ marginBottom: 8 }}>
                        <Text weight="semibold">
                          {p.rank}. {p.name}
                        </Text>
                        <Caption1 style={{ display: 'block' }}>{p.rationale}</Caption1>
                      </div>
                    ))}
                  </AtlasCard>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      appearance="primary"
                      disabled={busy || detail.strategy.mannyApproval === 'APPROVED'}
                      aria-label="Approve financing strategy (Manny gate)"
                      onClick={() =>
                        void run(
                          () => decideStrategy(auth, o.id, 'APPROVED' satisfies StrategyDecision, { source: activeSource }),
                          'Strategy approved by Manny gate. Lender outreach still requires shortlist approval.',
                        )
                      }
                    >
                      Approve strategy
                    </Button>
                    <Button
                      appearance="secondary"
                      disabled={busy}
                      aria-label="Revise financing strategy (Manny gate)"
                      onClick={() =>
                        void run(
                          () => decideStrategy(auth, o.id, 'REVISE', { source: activeSource }),
                          'Strategy returned for revision. Not an HVCG recommendation.',
                        )
                      }
                    >
                      Revise
                    </Button>
                    <Button
                      appearance="secondary"
                      disabled={busy}
                      aria-label="Reject financing strategy (Manny gate)"
                      onClick={() =>
                        void run(
                          () => decideStrategy(auth, o.id, 'REJECTED', { source: activeSource }),
                          'Strategy rejected. Do not present this path to a lender or client as an HVCG recommendation.',
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </SectionRail>
          ) : null}

          {tab === 'lenders' ? (
            <SectionRail
              title="Lenders / match"
              subtitle="Decision support only — stale criteria cannot be BEST_FIT"
              actions={
                <Button
                  size="small"
                  disabled={busy}
                  aria-label="Run lender match"
                  onClick={() =>
                    void run(
                      () => runLenderMatch(auth, o.id, { source: activeSource }),
                      'Match refreshed. Scores are not a financing guarantee.',
                    )
                  }
                >
                  Run match
                </Button>
              }
            >
              {detail.matches.length === 0 ? (
                <EmptyState title="No lender matches" description="Run match after strategy is drafted. HVCG is not a lender." />
              ) : (
                <DataTable
                  ariaLabel="Lender match results"
                  getRowKey={(r) => `${r.lenderId}-${r.productId || r.productName}`}
                  rows={detail.matches}
                  columns={[
                    { key: 'lender', header: 'Lender', sticky: 'left', render: (r) => r.lenderName },
                    { key: 'product', header: 'Product', render: (r) => r.productName || '—' },
                    {
                      key: 'band',
                      header: 'Band',
                      render: (r) => <StatusChip label={r.band} tone={matchTone(r.band)} />,
                    },
                    {
                      key: 'stale',
                      header: 'Freshness',
                      render: (r) => <StatusChip label={r.stale ? 'STALE' : 'Current sheet'} tone={r.stale ? 'warning' : 'info'} />,
                    },
                    { key: 'why', header: 'Reasons', render: (r) => r.reasons.join('; ') || '—' },
                    { key: 'miss', header: 'Missing criteria', render: (r) => r.missingCriteria.join('; ') || '—' },
                  ]}
                />
              )}
              <Caption1 style={{ display: 'block', margin: '12px 0' }}>{MANNY_GATE_COPY}</Caption1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  appearance="primary"
                  disabled={busy || o.mannyShortlistApproval === 'APPROVED'}
                  aria-label="Approve lender shortlist (Manny gate)"
                  onClick={() =>
                    void run(
                      () => decideShortlist(auth, o.id, 'APPROVED', { source: activeSource }),
                      'Shortlist approved by Manny gate. Application prep may proceed — submission is still gated.',
                    )
                  }
                >
                  Approve shortlist
                </Button>
                <Button
                  appearance="secondary"
                  disabled={busy}
                  aria-label="Revise lender shortlist (Manny gate)"
                  onClick={() =>
                    void run(() => decideShortlist(auth, o.id, 'REVISE', { source: activeSource }), 'Shortlist returned for revision.')
                  }
                >
                  Revise shortlist
                </Button>
                <Button
                  appearance="secondary"
                  disabled={busy}
                  aria-label="Reject lender shortlist (Manny gate)"
                  onClick={() =>
                    void run(
                      () => decideShortlist(auth, o.id, 'REJECTED', { source: activeSource }),
                      'Shortlist rejected. Do not contact these lenders on this opportunity.',
                    )
                  }
                >
                  Reject shortlist
                </Button>
              </div>
            </SectionRail>
          ) : null}

          {tab === 'application' ? (
            <SectionRail title="Application" subtitle="Populated fields keep their verification state">
              {!detail.application ? (
                <EmptyState
                  title="No application package"
                  description="Packages are prepared after Manny approves the shortlist. Missing fields block submission."
                />
              ) : (
                <AtlasCard
                  title={detail.application.status === 'PREPARED' ? 'Prepared (not submitted)' : 'Blocked — missing fields'}
                  subtitle={`Lender ${detail.application.lenderId}`}
                >
                  <Caption1 style={{ display: 'block', marginBottom: 8 }}>
                    Status: {detail.application.status}. Populated values remain unverified until a human confirms source documents.
                  </Caption1>
                  {Object.entries(detail.application.populatedFields).map(([field, cell]) => (
                    <div key={field} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <Text weight="semibold">{field}</Text>
                      <Caption1>
                        {String(cell.value)} · {cell.verification}
                        {activeSource === 'synthetic' ? ' · synthetic' : ''}
                      </Caption1>
                    </div>
                  ))}
                  {detail.application.missingFields.length ? (
                    <ul>
                      {detail.application.missingFields.map((m) => (
                        <li key={m.field}>
                          <Text size={300}>
                            {m.field} — {m.requiredFrom}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </AtlasCard>
              )}
            </SectionRail>
          ) : null}

          {tab === 'submissions' ? (
            <SectionRail title="Submission tracking" subtitle="HVCG tracks packages — HVCG does not lend">
              {detail.submissions.length === 0 ? (
                <EmptyState title="No submissions" description="Tracking rows appear after a package is sent to a third-party lender." />
              ) : (
                <DataTable
                  ariaLabel="Lender submission tracking"
                  getRowKey={(r) => r.id}
                  rows={detail.submissions}
                  columns={[
                    { key: 'lender', header: 'Lender', render: (r) => r.lenderName || r.lenderId },
                    { key: 'method', header: 'Method', render: (r) => r.method },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => <StatusChip label={r.status} tone="info" />,
                    },
                    { key: 'at', header: 'Submitted', render: (r) => (r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—') },
                    { key: 'conf', header: 'Confirmation', render: (r) => r.confirmationNumber || '—' },
                    { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
                  ]}
                />
              )}
            </SectionRail>
          ) : null}

          {tab === 'offers' ? (
            <SectionRail title="Offers" subtitle="Comparison is informational — not a financing guarantee">
              {detail.offers.length === 0 ? (
                <EmptyState title="No offers recorded" description="Term sheets appear when a lender responds. HVCG does not guarantee terms." />
              ) : (
                <>
                  <MessageBar intent="info">
                    <MessageBarBody>{FINANCING_DISCLAIMER}</MessageBarBody>
                  </MessageBar>
                  <DataTable
                    ariaLabel="Term sheet offers"
                    getRowKey={(r) => r.id}
                    rows={detail.offers}
                    columns={[
                      { key: 'lender', header: 'Lender', sticky: 'left', render: (r) => r.lenderName },
                      { key: 'product', header: 'Product', render: (r) => r.product || '—' },
                      {
                        key: 'amt',
                        header: 'Amount',
                        render: (r) =>
                          activeSource === 'synthetic' ? `${formatUsd(r.amount)} (synthetic)` : formatUsd(r.amount),
                      },
                      {
                        key: 'rate',
                        header: 'Stated rate',
                        render: (r) => (r.interestRate != null ? `${r.interestRate}%` : 'Not recorded'),
                      },
                      { key: 'term', header: 'Term (mo)', render: (r) => (r.termMonths != null ? String(r.termMonths) : '—') },
                      { key: 'orig', header: 'Origination', render: (r) => (r.origination != null ? `${r.origination}%` : '—') },
                      { key: 'assume', header: 'Assumptions', render: (r) => r.assumptions.join('; ') || 'None recorded' },
                    ]}
                  />
                </>
              )}
            </SectionRail>
          ) : null}

          {tab === 'closing' ? (
            <SectionRail
              title="Closing"
              subtitle="Conditions to funding by a third-party lender"
              actions={
                o.stage === 'ClientDecision' ? (
                  <Button
                    size="small"
                    disabled={busy}
                    aria-label="Move opportunity to closing"
                    onClick={() =>
                      void run(
                        () => transitionOpportunity(auth, o.id, 'Closing', { source: activeSource }),
                        'Moved to closing. Funding is still determined by the lender.',
                      )
                    }
                  >
                    Enter closing
                  </Button>
                ) : null
              }
            >
              {detail.closing.length === 0 ? (
                <EmptyState title="No closing conditions" description="Conditions generate when the file enters closing." />
              ) : (
                <DataTable
                  ariaLabel="Closing conditions"
                  getRowKey={(r) => r.id}
                  rows={detail.closing}
                  columns={[
                    { key: 'name', header: 'Condition', render: (r) => r.name },
                    { key: 'owner', header: 'Owner', render: (r) => r.owner },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => (
                        <StatusChip
                          label={r.status}
                          tone={r.status === 'satisfied' || r.status === 'waived' ? 'success' : r.status === 'blocked' ? 'danger' : 'warning'}
                        />
                      ),
                    },
                    { key: 'due', header: 'Due', render: (r) => r.due || '—' },
                    { key: 'block', header: 'Blocker', render: (r) => r.blocker || '—' },
                  ]}
                />
              )}
            </SectionRail>
          ) : null}

          {tab === 'fees' ? (
            <SectionRail title="Fees / receivables" subtitle="HVCG economics — not funded capital">
              {detail.fees.length === 0 ? (
                <EmptyState
                  title="No fee records"
                  description="Fees follow the executed HVCG agreement. Success fee ≠ lender funding."
                />
              ) : (
                <DataTable
                  ariaLabel="Capital fee and receivable status"
                  getRowKey={(r) => r.id}
                  rows={detail.fees}
                  columns={[
                    { key: 'type', header: 'Fee type', render: (r) => r.feeType },
                    { key: 'formula', header: 'Formula', render: (r) => r.feeFormula || '—' },
                    { key: 'event', header: 'Earned event', render: (r) => r.earnedEvent || '—' },
                    {
                      key: 'appr',
                      header: 'Approval',
                      render: (r) => <StatusChip label={r.approvalStatus} tone={r.approvalStatus === 'APPROVED' ? 'success' : 'warning'} />,
                    },
                    { key: 'inv', header: 'Invoice', render: (r) => r.invoiceStatus },
                    { key: 'pay', header: 'Payment', render: (r) => r.paymentStatus },
                    {
                      key: 'legal',
                      header: 'Legal / compliance',
                      render: (r) =>
                        r.legalComplianceReviewRequired ? (
                          <StatusChip label="REVIEW REQUIRED" tone="danger" />
                        ) : (
                          '—'
                        ),
                    },
                    { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
                  ]}
                />
              )}
            </SectionRail>
          ) : null}
        </>
      )}
    </div>
  );
}
