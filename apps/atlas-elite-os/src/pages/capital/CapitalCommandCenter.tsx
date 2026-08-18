/**
 * Manny-first Capital Command Center — 60-second executive scan + work queues.
 * Primary /capital surface. CapitalReadinessWorkbench remains a development fixture only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtlasCard,
  DataTable,
  EmptyState,
  FilterToolbar,
  KpiTile,
  ResponsiveGrid,
  SectionRail,
  SourceBadge,
  StatusChip,
} from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { AddRegular, ArrowSyncRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import { OpportunityWorkspace } from './OpportunityWorkspace';
import {
  AI_DISCLAIMER,
  agingTone,
  createOpportunity,
  FINANCING_DISCLAIMER,
  formatStage,
  formatUsd,
  loadCommandCenter,
  MANNY_GATE_COPY,
  QUEUE_LABELS,
  queueTone,
  SYNTHETIC_BANNER,
  WORK_QUEUES,
  type CapitalCommandCenterPayload,
  type CreateOpportunityInput,
  type QueueItem,
  type WorkQueue,
} from './capitalApi';

type QueueFilter = WorkQueue | 'ALL';

const KPI_TO_QUEUE: Record<string, QueueFilter> = {
  activeOpportunities: 'ALL',
  totalRequested: 'ALL',
  documentsBlocked: 'AWAITING_CLIENT',
  clientActionsOverdue: 'AWAITING_CLIENT',
  lenderResponsesDue: 'AWAITING_LENDER',
  mannyApprovalsRequired: 'AWAITING_MANNY',
  offersReceived: 'OFFERS_RECEIVED',
  transactionsClosing: 'CLOSING',
  recentlyFunded: 'FUNDED',
  feeReceivableOpen: 'COMPLIANCE_REVIEW',
  readyForSubmission: 'READY_FOR_SUBMISSION',
  rfiOverdue: 'RFI_OVERDUE',
  complianceReviewRequired: 'COMPLIANCE_REVIEW',
};

function formatDue(due?: string): string {
  if (!due) return 'No due date';
  const ms = Date.parse(due);
  if (!Number.isFinite(ms)) return due;
  return new Date(ms).toLocaleDateString();
}

export function CapitalCommandCenter() {
  const auth = useHubAuth();
  const [payload, setPayload] = useState<CapitalCommandCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueFilter>('NEEDS_ATTENTION');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateOpportunityInput>({
    title: '',
    clientCode: '',
    transactionType: 'working_capital_loc',
    requestedAmount: null,
    purpose: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadCommandCenter(auth);
      setPayload(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Capital Command Center');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [auth.tokenReady, refresh]);

  const counts = useMemo(() => {
    const map: Record<WorkQueue, number> = {
      NEEDS_ATTENTION: 0,
      AWAITING_CLIENT: 0,
      AWAITING_LENDER: 0,
      AWAITING_MANNY: 0,
      READY_FOR_SUBMISSION: 0,
      RFI_OVERDUE: 0,
      OFFERS_RECEIVED: 0,
      CLOSING: 0,
      FUNDED: 0,
      COMPLIANCE_REVIEW: 0,
    };
    for (const item of payload?.items || []) {
      map[item.queue] += 1;
    }
    return map;
  }, [payload]);

  const rows = useMemo(() => {
    const items = payload?.items || [];
    if (queue === 'ALL') return items;
    return items.filter((item) => item.queue === queue);
  }, [payload, queue]);

  const synthetic = payload?.source === 'synthetic';
  const accessBlocked = Boolean(error && /Synthetic demonstration data is not shown/.test(error));
  const kpis = payload?.kpis;

  const kpiTiles: Array<{ key: keyof NonNullable<typeof kpis>; label: string; value: string }> = kpis
    ? [
        { key: 'activeOpportunities', label: 'Active Capital Opportunities', value: String(kpis.activeOpportunities) },
        { key: 'totalRequested', label: 'Total Capital Requested', value: formatUsd(kpis.totalRequested) },
        { key: 'documentsBlocked', label: 'Documents Blocked', value: String(kpis.documentsBlocked) },
        { key: 'clientActionsOverdue', label: 'Client Actions Overdue', value: String(kpis.clientActionsOverdue) },
        { key: 'lenderResponsesDue', label: 'Lender Responses Due', value: String(kpis.lenderResponsesDue) },
        { key: 'mannyApprovalsRequired', label: 'Needs Manny', value: String(kpis.mannyApprovalsRequired) },
        { key: 'readyForSubmission', label: 'Ready for Submission', value: String(kpis.readyForSubmission ?? 0) },
        { key: 'rfiOverdue', label: 'RFI Overdue', value: String(kpis.rfiOverdue ?? 0) },
        { key: 'offersReceived', label: 'Term Sheets Received', value: String(kpis.offersReceived) },
        { key: 'transactionsClosing', label: 'Closing', value: String(kpis.transactionsClosing) },
        { key: 'recentlyFunded', label: 'Funded', value: String(kpis.recentlyFunded) },
        { key: 'complianceReviewRequired', label: 'Compliance Review', value: String(kpis.complianceReviewRequired ?? 0) },
        { key: 'feeReceivableOpen', label: 'Fee / Receivable Status', value: String(kpis.feeReceivableOpen) },
      ]
    : [];

  const openCreate = () => {
    setForm({
      title: '',
      clientCode: '',
      transactionType: 'working_capital_loc',
      requestedAmount: null,
      purpose: '',
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createOpportunity(auth, form, { source: payload?.source });
      setCreateOpen(false);
      await refresh();
      setSelectedId(res.opportunity.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  if (selectedId && payload) {
    return (
      <ModuleScaffold
        title="Capital opportunity"
        subtitle="Manny workspace · HVCG is not a lender · no financing guarantees"
        showPendingBanner={false}
        actions={
          <Button appearance="secondary" onClick={() => setSelectedId(null)} aria-label="Return to Capital Command Center">
            Command Center
          </Button>
        }
      >
        <OpportunityWorkspace
          opportunityId={selectedId}
          source={payload.source}
          onBack={() => setSelectedId(null)}
          onChanged={() => void refresh()}
        />
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Capital Command Center"
      subtitle="Manny scan · work queues · opportunity workspace. HVCG is not a lender."
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={openCreate}
            disabled={accessBlocked}
            aria-label="Create capital opportunity"
          >
            New opportunity
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowSyncRegular />}
            disabled={loading}
            onClick={() => void refresh()}
            aria-label="Refresh capital command center"
          >
            Refresh
          </Button>
        </div>
      }
    >
      {synthetic ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>SYNTHETIC</MessageBarTitle>
            {SYNTHETIC_BANNER}
            {payload?.fallbackReason ? ` (${payload.fallbackReason}.)` : ''} These figures are demonstration only — not live client financials.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Capital operations</MessageBarTitle>
            {FINANCING_DISCLAIMER} {AI_DISCLAIMER} {MANNY_GATE_COPY}
          </MessageBarBody>
        </MessageBar>
      )}

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>{accessBlocked ? 'Authenticated access required' : 'Capital Command Center'}</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {accessBlocked ? (
        <EmptyState
          title="Capital data is not shown"
          description="Sign in with an entitled account. Synthetic demonstration data is never used to conceal a 401 or 403."
        />
      ) : !auth.tokenReady || (loading && !payload) ? (
        <Spinner label="Loading capital command center…" />
      ) : (
        <>
          <SectionRail
            title="Executive scan"
            subtitle={synthetic ? 'SYNTHETIC KPIs — not live client financials' : '60-second attention scan'}
            actions={
              <SourceBadge
                status={synthetic ? 'Sample data' : 'Not live'}
                label={synthetic ? 'SYNTHETIC' : 'Hub'}
                detail={
                  synthetic
                    ? SYNTHETIC_BANNER
                    : 'Hub capital API. Not a proven live client financial source. HVCG is not a lender.'
                }
              />
            }
          >
            {kpiTiles.length === 0 ? (
              <EmptyState title="No capital KPIs" description="Queues populate when Hub capital data is available." />
            ) : (
              <ResponsiveGrid className="atlas-stagger">
                {kpiTiles.map((tile) => (
                  <KpiTile
                    key={tile.key}
                    label={tile.label}
                    value={tile.value}
                    onClick={() => setQueue(KPI_TO_QUEUE[tile.key] || 'ALL')}
                    footer={
                      <Caption1>
                        {synthetic ? 'SYNTHETIC — not a live client' : 'Hub count — not a financing guarantee'}
                      </Caption1>
                    }
                  />
                ))}
              </ResponsiveGrid>
            )}
          </SectionRail>

          <SectionRail title="Work queues" subtitle="Filter the book Manny is running">
            <FilterToolbar>
              <Button
                size="small"
                appearance={queue === 'ALL' ? 'primary' : 'secondary'}
                aria-pressed={queue === 'ALL'}
                aria-label={`Show all capital opportunities, ${payload?.items.length || 0} items`}
                onClick={() => setQueue('ALL')}
              >
                All ({payload?.items.length || 0})
              </Button>
              {WORK_QUEUES.map((id) => (
                <Button
                  key={id}
                  size="small"
                  appearance={queue === id ? 'primary' : 'secondary'}
                  aria-pressed={queue === id}
                  aria-label={`Filter work queue ${QUEUE_LABELS[id]}, ${counts[id]} items`}
                  onClick={() => setQueue(id)}
                >
                  {QUEUE_LABELS[id]} ({counts[id]})
                </Button>
              ))}
            </FilterToolbar>
          </SectionRail>

          <AtlasCard
            title={queue === 'ALL' ? 'All capital opportunities' : QUEUE_LABELS[queue]}
            subtitle="Open a row to work the file. Approve strategy and shortlist only from the opportunity workspace."
            variant="quiet"
          >
            <DataTable
              ariaLabel={queue === 'ALL' ? 'All capital opportunities' : `${QUEUE_LABELS[queue]} capital opportunities`}
              getRowKey={(r: QueueItem) => r.opportunityId}
              rows={rows}
              emptyTitle="Nothing in this queue"
              emptyDescription="Clear for this filter. Choose another queue or create an opportunity."
              columns={[
                {
                  key: 'title',
                  header: 'Opportunity',
                  sticky: 'left',
                  render: (r) => (
                    <Button
                      appearance="subtle"
                      aria-label={`Open capital opportunity ${r.title}`}
                      onClick={() => setSelectedId(r.opportunityId)}
                      style={{ fontWeight: 600, justifyContent: 'flex-start', padding: 0, minWidth: 0 }}
                    >
                      {r.title}
                    </Button>
                  ),
                },
                { key: 'client', header: 'Client', render: (r) => r.clientCode },
                {
                  key: 'queue',
                  header: 'Queue',
                  render: (r) => <StatusChip label={QUEUE_LABELS[r.queue]} tone={queueTone(r.queue)} />,
                },
                { key: 'stage', header: 'Stage', render: (r) => formatStage(r.stage) },
                {
                  key: 'amount',
                  header: 'Requested',
                  render: (r) =>
                    synthetic ? `${formatUsd(r.requestedAmount)} (synthetic)` : formatUsd(r.requestedAmount),
                },
                { key: 'next', header: 'Next action', render: (r) => r.nextAction || 'Not recorded' },
                { key: 'due', header: 'Due', render: (r) => formatDue(r.due) },
                {
                  key: 'aging',
                  header: 'Aging',
                  render: (r) => <StatusChip label={`${r.agingDays}d · ${r.aging}`} tone={agingTone(r.aging)} />,
                },
                { key: 'block', header: 'Blocker', render: (r) => r.blocker || '—' },
                {
                  key: 'open',
                  header: 'Open',
                  sticky: 'right',
                  render: (r) => (
                    <Button
                      size="small"
                      appearance="primary"
                      aria-label={`Open workspace for ${r.title}`}
                      onClick={() => setSelectedId(r.opportunityId)}
                    >
                      Open
                    </Button>
                  ),
                },
              ]}
            />
          </AtlasCard>

          <Caption1>
            {FINANCING_DISCLAIMER} {AI_DISCLAIMER} {MANNY_GATE_COPY}
          </Caption1>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={(_, d) => setCreateOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>New capital opportunity</DialogTitle>
            <DialogContent>
              <Text size={300} style={{ display: 'block', marginBottom: 12 }}>
                HVCG is not a lender. This creates an advisory file, not a loan. Amounts are requests — not commitments.
              </Text>
              {synthetic ? (
                <Caption1 style={{ display: 'block', marginBottom: 12 }}>{SYNTHETIC_BANNER}</Caption1>
              ) : null}
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Title">
                  <Input
                    value={form.title}
                    onChange={(_, d) => setForm((f) => ({ ...f, title: d.value }))}
                    aria-label="Opportunity title"
                  />
                </Field>
                <Field label="Client code">
                  <Input
                    value={form.clientCode}
                    onChange={(_, d) => setForm((f) => ({ ...f, clientCode: d.value.toUpperCase() }))}
                    aria-label="Client code"
                  />
                </Field>
                <Field label="Transaction type">
                  <Input
                    value={form.transactionType}
                    onChange={(_, d) => setForm((f) => ({ ...f, transactionType: d.value }))}
                    aria-label="Transaction type"
                  />
                </Field>
                <Field label="Requested amount (optional)">
                  <Input
                    type="number"
                    value={form.requestedAmount == null ? '' : String(form.requestedAmount)}
                    onChange={(_, d) =>
                      setForm((f) => ({
                        ...f,
                        requestedAmount: d.value === '' ? null : Number(d.value),
                      }))
                    }
                    aria-label="Requested capital amount"
                  />
                </Field>
                <Field label="Purpose">
                  <Input
                    value={form.purpose || ''}
                    onChange={(_, d) => setForm((f) => ({ ...f, purpose: d.value }))}
                    aria-label="Capital purpose"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCreateOpen(false)} aria-label="Cancel new opportunity">
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={creating || !form.title.trim() || !form.clientCode.trim()}
                onClick={() => void submitCreate()}
                aria-label="Create capital opportunity"
              >
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </ModuleScaffold>
  );
}
