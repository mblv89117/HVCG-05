/**
 * Opportunity workspace — record-detail for one capital file.
 * Strategy / shortlist Approve controls are Manny gates.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessDeniedState,
  AtlasCard,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
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
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import { useAtlasRole } from '../../security/RoleProvider';
import { ATLAS_STATUS } from '../../ui/statusLanguage';
import {
  AI_DISCLAIMER,
  decideShortlist,
  decideStrategy,
  FINANCING_DISCLAIMER,
  formatStage,
  formatUsd,
  formatVerification,
  generateOpportunityChecklist,
  hubStatus,
  loadMissingRequest,
  loadOpportunity,
  MANNY_GATE_COPY,
  accessFailureKind,
  operatorFacingMessage,
  runLenderMatch,
  SYNTHETIC_BANNER,
  titleFromToken,
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
      <Caption1 style={{ display: 'block', marginTop: 12 }}>
        Hub record. {FINANCING_DISCLAIMER}
      </Caption1>
    );
  }
  return (
    <Caption1 style={{ display: 'block', marginTop: 12 }}>
      Synthetic demonstration figures — not live client financials. {FINANCING_DISCLAIMER}
    </Caption1>
  );
}

function RecordField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160, maxWidth: 320 }}>
      <Caption1 style={{ fontWeight: 600 }}>{label}</Caption1>
      <Text weight="semibold" style={{ whiteSpace: 'normal' }}>
        {value}
      </Text>
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
  const { can } = useAtlasRole();
  const canMutateApprovals = can('mutateApprovals');
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [detail, setDetail] = useState<CapitalOpportunityDetail | null>(null);
  const sourceHintRef = useRef(source);
  sourceHintRef.current = source;
  const loadSourceRef = useRef<CapitalDataSource>(source);
  const [activeSource, setActiveSource] = useState<CapitalDataSource>(source);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [access, setAccess] = useState<'unauthorized' | 'forbidden' | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);
    setAccess(null);
    setNotFound(false);
    try {
      const res = await loadOpportunity(auth, opportunityId, { source: loadSourceRef.current });
      setDetail(res.detail);
      setActiveSource(res.source);
      loadSourceRef.current = res.source;
    } catch (err) {
      const kind = accessFailureKind(err);
      const status = hubStatus(err);
      const message = operatorFacingMessage(err, 'This capital opportunity could not be loaded.');
      setDetail(null);
      setError(message);
      if (kind) setAccess(kind);
      else if (status === 404 || /not found/i.test(message)) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [auth, opportunityId]);

  useEffect(() => {
    loadSourceRef.current = sourceHintRef.current;
    setActiveSource(sourceHintRef.current);
    setTab('overview');
    setNotice(null);
    setDetail(null);
    setError(null);
    setAccess(null);
    setNotFound(false);
    setLoading(true);
  }, [opportunityId]);

  useEffect(() => {
    if (!auth.tokenReady) {
      setLoading(true);
      return;
    }
    void refresh();
  }, [refresh, auth.tokenReady]);

  const run = async (action: () => Promise<{ detail: CapitalOpportunityDetail; source: CapitalDataSource }>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      setDetail(res.detail);
      setActiveSource(res.source);
      loadSourceRef.current = res.source;
      setNotice(ok);
      onChanged?.();
    } catch (err) {
      const kind = accessFailureKind(err);
      setError(operatorFacingMessage(err, 'That action could not be completed.'));
      if (kind) {
        setAccess(kind);
        setDetail(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const o = detail?.opportunity;
  const strategyPending = o?.mannyStrategyApproval === 'PENDING' || o?.stage === 'AwaitingMannyStrategyApproval';
  const shortlistPending = o?.mannyShortlistApproval === 'PENDING' || o?.stage === 'AwaitingMannyShortlistApproval';
  const decisionRequired = Boolean(strategyPending || shortlistPending);

  const openChecklist = detail
    ? detail.checklist.filter((i) => i.requiredness !== 'OPTIONAL' && i.status !== 'ACCEPTED' && i.status !== 'NOT_APPLICABLE')
        .length
    : 0;

  const relatedWork: Array<{ tab: WorkspaceTab; label: string; value: string }> = detail && o
    ? [
        { tab: 'checklist', label: 'Checklist', value: openChecklist ? `${openChecklist} open` : 'Clear' },
        { tab: 'documents', label: 'Documents', value: String(detail.documents.length) },
        { tab: 'underwriting', label: 'Underwriting', value: detail.underwriting ? 'Draft on file' : 'None' },
        { tab: 'strategy', label: 'Strategy', value: titleFromToken(o.mannyStrategyApproval) },
        { tab: 'lenders', label: 'Shortlist', value: titleFromToken(o.mannyShortlistApproval) },
        { tab: 'submissions', label: 'Submissions', value: String(detail.submissions.length) },
        { tab: 'offers', label: 'Term sheets', value: String(detail.offers.length) },
        { tab: 'closing', label: 'Closing conditions', value: String(detail.closing.length) },
        { tab: 'fees', label: 'Fees', value: String(detail.fees.length) },
      ]
    : [];

  const back = (
    <Button appearance="secondary" icon={<ArrowLeftRegular />} onClick={onBack} aria-label="Back to Capital Command Center">
      Back to queues
    </Button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{back}</div>

      {access === 'unauthorized' ? (
        <AccessDeniedState
          title="Authenticated access required"
          description={error || 'Hub returned 401. Synthetic demonstration data is not shown.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry capital opportunity">
              Retry
            </Button>
          }
        />
      ) : null}

      {access === 'forbidden' ? (
        <AccessDeniedState
          title="Access denied"
          description={error || 'You are signed in but not entitled to this capital file. Synthetic demonstration data is not shown.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry capital opportunity">
              Retry
            </Button>
          }
        />
      ) : null}

      {loading && !detail && !access ? (
        <LoadingState rows={6} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading capital opportunity'} />
      ) : null}

      {!loading && !o && !access && error && !notFound ? (
        <ErrorState
          title="Capital opportunity could not load"
          description={error}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry capital opportunity">
              Retry
            </Button>
          }
        />
      ) : null}

      {!loading && !o && !access && (notFound || !error) ? (
        <EmptyState title="Opportunity not found" description="Return to the command center and select another row." />
      ) : null}

      {o && error && !access ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Action did not complete</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {notice && o ? (
        <MessageBar intent="success">
          <MessageBarBody>{notice}</MessageBarBody>
        </MessageBar>
      ) : null}

      {o ? (
        <>
          {activeSource === 'synthetic' ? (
            <MessageBar intent="warning">
              <MessageBarBody>
                <MessageBarTitle>Synthetic demonstration</MessageBarTitle>
                {SYNTHETIC_BANNER}
              </MessageBarBody>
            </MessageBar>
          ) : null}

          {decisionRequired ? (
            <MessageBar intent="warning">
              <MessageBarBody>
                <MessageBarTitle>{ATLAS_STATUS.decisionRequired}</MessageBarTitle>
                {strategyPending
                  ? 'Manny must approve, revise, or reject the financing strategy before this is an HVCG recommendation.'
                  : 'Manny must approve, revise, or reject the lender shortlist before outreach.'}{' '}
                Nothing is sent to a lender as an HVCG recommendation until that gate is complete.
              </MessageBarBody>
            </MessageBar>
          ) : null}

          <AtlasCard
            title={o.title}
            subtitle={`${o.companyName || o.clientCode} · ${o.clientCode} · ${titleFromToken(o.transactionType)}`}
            variant="accent"
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <StatusChip label={formatStage(o.stage)} tone={decisionRequired ? 'warning' : 'info'} />
              {o.blockers ? <StatusChip label={ATLAS_STATUS.blocked} tone="danger" /> : null}
              {activeSource === 'synthetic' ? (
                <StatusChip label="Synthetic" tone="warning" />
              ) : (
                <StatusChip label="Hub" tone="info" />
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <RecordField
                label="What this is"
                value={`${titleFromToken(o.transactionType)} · ${
                  activeSource === 'synthetic'
                    ? `${formatUsd(o.need.requestedAmount)} (synthetic)`
                    : formatUsd(o.need.requestedAmount)
                }`}
              />
              <RecordField label="State" value={formatStage(o.stage)} />
              <RecordField label="Next action" value={o.nextAction || 'Not recorded'} />
              <RecordField label="Owner" value={o.nextActionOwner || o.ownerEmail || 'Not recorded'} />
              <RecordField label="Blocker" value={o.blockers || 'None recorded'} />
              <RecordField
                label={ATLAS_STATUS.decisionRequired}
                value={
                  strategyPending
                    ? 'Strategy gate — Manny'
                    : shortlistPending
                      ? 'Shortlist gate — Manny'
                      : 'None'
                }
              />
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
            <SectionRail title="Overview" subtitle="Need, related work, and operating rules">
              <div style={{ display: 'grid', gap: 12 }}>
                <AtlasCard title="Need" subtitle="HVCG is not a lender">
                  <Text>{o.need.purpose || 'Purpose not recorded'}</Text>
                  <Caption1 style={{ display: 'block', marginTop: 8 }}>
                    Use of funds: {o.need.useOfFunds || 'Not recorded'} · Timing: {o.need.timing || 'Not recorded'}
                  </Caption1>
                </AtlasCard>
                <AtlasCard title="Related work" subtitle="Open the matching section from here">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {relatedWork.map((item) => (
                      <Button
                        key={item.tab}
                        size="small"
                        appearance={tab === item.tab ? 'primary' : 'secondary'}
                        aria-label={`Open ${item.label}, ${item.value}`}
                        onClick={() => setTab(item.tab)}
                      >
                        {item.label}: {item.value}
                      </Button>
                    ))}
                  </div>
                </AtlasCard>
                <AtlasCard title="Business facts" subtitle="Missing stays missing — never guessed">
                  <Caption1>
                    Industry: {o.business?.industry || 'Not recorded'} · Revenue:{' '}
                    {o.business?.annualRevenue?.value == null
                      ? 'Not recorded'
                      : `${formatUsd(o.business.annualRevenue.value)} (${formatVerification(
                          o.business.annualRevenue.verification,
                        )}${activeSource === 'synthetic' ? ', synthetic' : ''})`}
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
                          label={titleFromToken(r.status)}
                          tone={r.status === 'ACCEPTED' ? 'success' : r.status === 'MISSING' || r.status === 'INCOMPLETE' ? 'danger' : 'warning'}
                        />
                      ),
                    },
                    {
                      key: 'ver',
                      header: 'Verification',
                      render: (r) => <StatusChip label={formatVerification(r.verification)} tone={verificationTone(r.verification)} />,
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
                        const kind = accessFailureKind(err);
                        const message = operatorFacingMessage(err, 'The missing-document request could not be loaded.');
                        setError(message);
                        if (kind) {
                          setAccess(kind);
                          setDetail(null);
                        }
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
                      render: (r) => <StatusChip label={formatVerification(r.verification || 'UNVERIFIED')} tone={verificationTone(r.verification || 'UNVERIFIED')} />,
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
                      Approval: {titleFromToken(detail.strategy.mannyApproval)}
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
                  {can('mutateApprovals') ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      appearance="primary"
                      aria-label="Approve financing strategy (Manny gate)"
                      onClick={() =>
                        void run(
                          () => decideStrategy(auth, o.id, 'APPROVED' satisfies StrategyDecision, { source: activeSource }),
                          'Strategy approved by Manny gate. Lender outreach still requires shortlist approval.',
                        )
                      }
                      disabled={busy || detail.strategy.mannyApproval === 'APPROVED' || !canMutateApprovals}
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
                  ) : (
                    <Caption1>Strategy approve requires mutateApprovals. Hub rejects unauthorized callers.</Caption1>
                  )}
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
                      render: (r) => <StatusChip label={titleFromToken(r.band)} tone={matchTone(r.band)} />,
                    },
                    {
                      key: 'stale',
                      header: 'Freshness',
                      render: (r) => <StatusChip label={r.stale ? 'Stale' : 'Current sheet'} tone={r.stale ? 'warning' : 'info'} />,
                    },
                    { key: 'why', header: 'Reasons', render: (r) => r.reasons.join('; ') || '—' },
                    { key: 'miss', header: 'Missing criteria', render: (r) => r.missingCriteria.join('; ') || '—' },
                  ]}
                />
              )}
              <Caption1 style={{ display: 'block', margin: '12px 0' }}>{MANNY_GATE_COPY}</Caption1>
              {can('mutateApprovals') ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  appearance="primary"
                  disabled={busy || o.mannyShortlistApproval === 'APPROVED' || !canMutateApprovals}
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
              ) : (
                <Caption1>Shortlist approve requires mutateApprovals. Hub rejects unauthorized callers.</Caption1>
              )}
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
                    Status: {titleFromToken(detail.application.status)}. Populated values remain unverified until a human confirms source documents.
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
                      render: (r) => <StatusChip label={titleFromToken(r.status)} tone="info" />,
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
                          label={titleFromToken(r.status)}
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
                      render: (r) => <StatusChip label={titleFromToken(r.approvalStatus)} tone={r.approvalStatus === 'APPROVED' ? 'success' : 'warning'} />,
                    },
                    { key: 'inv', header: 'Invoice', render: (r) => r.invoiceStatus },
                    { key: 'pay', header: 'Payment', render: (r) => r.paymentStatus },
                    {
                      key: 'legal',
                      header: 'Legal / compliance',
                      render: (r) =>
                        r.legalComplianceReviewRequired ? (
                          <StatusChip label={ATLAS_STATUS.complianceReview} tone="gold" />
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
      ) : null}
    </div>
  );
}
