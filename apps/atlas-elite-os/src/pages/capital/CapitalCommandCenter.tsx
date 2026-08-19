/**
 * Manny-first Capital Command Center — work queues + opportunity drill-down.
 * Primary /capital surface. CapitalReadinessWorkbench remains a development fixture only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessDeniedState,
  AtlasCard,
  DataTable,
  ErrorState,
  FilterToolbar,
  LoadingState,
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
  Text,
} from '@fluentui/react-components';
import { AddRegular, ArrowSyncRegular } from '@fluentui/react-icons';
import { useSearchParams } from 'react-router-dom';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import { ATLAS_STATUS } from '../../ui/statusLanguage';
import { OpportunityWorkspace } from './OpportunityWorkspace';
import {
  AI_DISCLAIMER,
  FINANCING_DISCLAIMER,
  MANNY_GATE_COPY,
  QUEUE_LABELS,
  SYNTHETIC_BANNER,
  WORK_QUEUES,
  accessFailureKind,
  agingTone,
  createOpportunity,
  formatAging,
  formatStage,
  formatUsd,
  loadCommandCenter,
  operatorFacingMessage,
  queueTone,
  readOpportunityQuery,
  type CapitalCommandCenterPayload,
  type CreateOpportunityInput,
  type QueueItem,
  type WorkQueue,
} from './capitalApi';

type QueueFilter = WorkQueue | 'ALL';
type Surface = 'loading' | 'unauthorized' | 'forbidden' | 'error' | 'ready';

function formatDue(due?: string): string {
  if (!due) return 'No due date';
  const ms = Date.parse(due);
  if (!Number.isFinite(ms)) return due;
  return new Date(ms).toLocaleDateString();
}

function emptyCounts(): Record<WorkQueue, number> {
  return {
    AWAITING_MANNY: 0,
    AWAITING_CLIENT: 0,
    AWAITING_LENDER: 0,
    READY_FOR_SUBMISSION: 0,
    RFI_OVERDUE: 0,
    OFFERS_RECEIVED: 0,
    CLOSING: 0,
    FUNDED: 0,
    COMPLIANCE_REVIEW: 0,
    NEEDS_ATTENTION: 0,
  };
}

export function CapitalCommandCenter() {
  const auth = useHubAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payload, setPayload] = useState<CapitalCommandCenterPayload | null>(null);
  const [surface, setSurface] = useState<Surface>('loading');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueFilter>('AWAITING_MANNY');
  const selectedId = readOpportunityQuery(searchParams);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<CreateOpportunityInput>({
    title: '',
    clientCode: '',
    transactionType: 'working_capital_loc',
    requestedAmount: null,
    purpose: '',
  });

  const openOpportunity = useCallback(
    (id: string) => {
      const nextId = id.trim();
      if (!nextId) return;
      setSearchParams(
        (prev) => {
          if (readOpportunityQuery(prev) === nextId) return prev;
          const next = new URLSearchParams(prev);
          next.set('opportunity', nextId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const closeOpportunity = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (!readOpportunityQuery(prev)) return prev;
        const next = new URLSearchParams(prev);
        next.delete('opportunity');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setActionError(null);
    try {
      const next = await loadCommandCenter(auth);
      setPayload(next);
      setSurface('ready');
    } catch (err) {
      const kind = accessFailureKind(err);
      setPayload(null);
      setError(operatorFacingMessage(err, 'Capital Command Center could not be loaded.'));
      setSurface(kind || 'error');
    } finally {
      setRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth.tokenReady) {
      setSurface('loading');
      return;
    }
    void refresh();
  }, [auth.tokenReady, refresh]);

  const counts = useMemo(() => {
    const map = emptyCounts();
    for (const item of payload?.items || []) {
      map[item.queue] += 1;
    }
    return map;
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    if (queue !== 'AWAITING_MANNY') return;
    if (counts.AWAITING_MANNY > 0) return;
    if (counts.NEEDS_ATTENTION > 0) {
      setQueue('NEEDS_ATTENTION');
      return;
    }
    if ((payload.items || []).length > 0) setQueue('ALL');
  }, [payload, queue, counts.AWAITING_MANNY, counts.NEEDS_ATTENTION]);

  const rows = useMemo(() => {
    const items = payload?.items || [];
    if (queue === 'ALL') return items;
    return items.filter((item) => item.queue === queue);
  }, [payload, queue]);

  const synthetic = payload?.source === 'synthetic';
  const bookSize = payload?.items.length || 0;
  const attentionLine = [
    `${bookSize} ${bookSize === 1 ? 'file' : 'files'}`,
    counts.AWAITING_MANNY ? `${counts.AWAITING_MANNY} ${ATLAS_STATUS.needsManny}` : null,
    counts.RFI_OVERDUE ? `${counts.RFI_OVERDUE} ${ATLAS_STATUS.rfiOverdue}` : null,
    counts.COMPLIANCE_REVIEW ? `${counts.COMPLIANCE_REVIEW} ${ATLAS_STATUS.complianceReview}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const openCreate = () => {
    setForm({
      title: '',
      clientCode: '',
      transactionType: 'working_capital_loc',
      requestedAmount: null,
      purpose: '',
    });
    setActionError(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreating(true);
    setActionError(null);
    try {
      const res = await createOpportunity(auth, form, { source: payload?.source });
      setCreateOpen(false);
      await refresh();
      openOpportunity(res.opportunity.id);
    } catch (err) {
      const kind = accessFailureKind(err);
      const message = operatorFacingMessage(err, 'The opportunity could not be created.');
      if (kind) {
        setPayload(null);
        setError(message);
        setSurface(kind);
        setCreateOpen(false);
      } else {
        setActionError(message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (selectedId) {
    return (
      <ModuleScaffold
        title="Capital opportunity"
        subtitle="What this file is · state · next action · owner · blocker"
        showPendingBanner={false}
      >
        <OpportunityWorkspace
          opportunityId={selectedId}
          source={payload?.source || 'hub'}
          onBack={closeOpportunity}
          onChanged={() => void refresh()}
        />
      </ModuleScaffold>
    );
  }

  const actions = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button
        appearance="primary"
        icon={<AddRegular />}
        onClick={openCreate}
        disabled={surface !== 'ready'}
        aria-label="Create capital opportunity"
      >
        New opportunity
      </Button>
      <Button
        appearance="secondary"
        icon={<ArrowSyncRegular />}
        disabled={surface === 'loading' || refreshing}
        onClick={() => void refresh()}
        aria-label="Refresh capital command center"
      >
        Refresh
      </Button>
    </div>
  );

  return (
    <ModuleScaffold
      title="Capital Command Center"
      subtitle="Work queues for capital files. HVCG is not a lender."
      showPendingBanner={false}
      actions={actions}
    >
      {surface === 'loading' ? (
        <LoadingState rows={6} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading capital command center'} />
      ) : null}

      {surface === 'unauthorized' ? (
        <AccessDeniedState
          title="Authenticated access required"
          description={error || 'Hub returned 401. Synthetic demonstration data is not shown.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry Capital Command Center">
              Retry
            </Button>
          }
        />
      ) : null}

      {surface === 'forbidden' ? (
        <AccessDeniedState
          title="Access denied"
          description={error || 'You are signed in but not entitled to this capital data. Synthetic demonstration data is not shown.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry Capital Command Center">
              Retry
            </Button>
          }
        />
      ) : null}

      {surface === 'error' ? (
        <ErrorState
          title="Capital Command Center could not load"
          description={error || 'Capital data was not loaded. Try again.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()} aria-label="Retry Capital Command Center">
              Retry
            </Button>
          }
        />
      ) : null}

      {surface === 'ready' && payload ? (
        <>
          {synthetic ? (
            <MessageBar intent="warning">
              <MessageBarBody>
                <MessageBarTitle>Synthetic demonstration</MessageBarTitle>
                {SYNTHETIC_BANNER}
                {payload.fallbackReason ? ` (${payload.fallbackReason}.)` : ''} These figures are demonstration only — not live client financials.
              </MessageBarBody>
            </MessageBar>
          ) : (
            <Caption1>
              {FINANCING_DISCLAIMER} {AI_DISCLAIMER} {MANNY_GATE_COPY}
            </Caption1>
          )}

          {actionError ? (
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>Action did not complete</MessageBarTitle>
                {actionError}
              </MessageBarBody>
            </MessageBar>
          ) : null}

          <SectionRail
            title="Work queues"
            subtitle={attentionLine || 'No capital files in this book yet'}
            actions={
              <SourceBadge
                status={synthetic ? 'Sample data' : 'Not live'}
                label={synthetic ? 'Synthetic' : 'Hub'}
                detail={
                  synthetic
                    ? SYNTHETIC_BANNER
                    : 'Hub capital API. Not a proven live client financial source. HVCG is not a lender.'
                }
              />
            }
          >
            <FilterToolbar>
              <Button
                size="small"
                appearance={queue === 'ALL' ? 'primary' : 'secondary'}
                aria-pressed={queue === 'ALL'}
                aria-label={`Show all capital opportunities, ${bookSize} items`}
                onClick={() => setQueue('ALL')}
              >
                All ({bookSize})
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
            subtitle="Open a row to work the file. Strategy and shortlist approval stay on the opportunity."
            variant="quiet"
          >
            <div style={{ minWidth: 0, width: '100%' }}>
              <DataTable
                ariaLabel={queue === 'ALL' ? 'All capital opportunities' : `${QUEUE_LABELS[queue]} capital opportunities`}
                getRowKey={(r: QueueItem) => r.opportunityId}
                rows={rows}
                emptyTitle={bookSize === 0 ? 'No capital files yet' : 'Nothing in this queue'}
                emptyDescription={
                  bookSize === 0
                    ? 'Create an opportunity when a client capital need is identified. HVCG is not a lender.'
                    : `Clear for ${queue === 'ALL' ? 'all files' : QUEUE_LABELS[queue]}. Choose another queue or create an opportunity.`
                }
                columns={[
                  {
                    key: 'title',
                    header: 'Opportunity',
                    sticky: 'left',
                    width: 280,
                    render: (r) => (
                      <Button
                        appearance="subtle"
                        aria-label={`Open capital opportunity ${r.title}`}
                        title={r.title}
                        onClick={() => openOpportunity(r.opportunityId)}
                        style={{
                          fontWeight: 600,
                          justifyContent: 'flex-start',
                          padding: 0,
                          minWidth: 0,
                          maxWidth: 360,
                          whiteSpace: 'normal',
                          textAlign: 'left',
                          height: 'auto',
                        }}
                      >
                        {r.title}
                      </Button>
                    ),
                  },
                  {
                    key: 'client',
                    header: 'Client',
                    width: 140,
                    render: (r) => r.companyName || r.clientCode,
                  },
                  {
                    key: 'queue',
                    header: 'Queue',
                    width: 160,
                    render: (r) => <StatusChip label={QUEUE_LABELS[r.queue]} tone={queueTone(r.queue)} />,
                  },
                  { key: 'stage', header: 'Stage', width: 180, render: (r) => formatStage(r.stage) },
                  {
                    key: 'amount',
                    header: 'Requested',
                    width: 140,
                    render: (r) =>
                      synthetic ? `${formatUsd(r.requestedAmount)} (synthetic)` : formatUsd(r.requestedAmount),
                  },
                  {
                    key: 'nextAction',
                    header: 'Next action',
                    width: 240,
                    render: (r) => (
                      <span title={r.nextAction || 'Not recorded'} style={{ whiteSpace: 'normal' }}>
                        {r.nextAction || 'Not recorded'}
                      </span>
                    ),
                  },
                  {
                    key: 'owner',
                    header: 'Owner',
                    width: 120,
                    render: (r) => r.nextActionOwner || 'Not recorded',
                  },
                  { key: 'due', header: 'Due', width: 110, render: (r) => formatDue(r.due) },
                  {
                    key: 'aging',
                    header: 'Aging',
                    width: 140,
                    render: (r) => <StatusChip label={formatAging(r.agingDays, r.aging)} tone={agingTone(r.aging)} />,
                  },
                  {
                    key: 'blocker',
                    header: 'Blocker',
                    width: 200,
                    render: (r) => (
                      <span title={r.blocker || undefined} style={{ whiteSpace: 'normal' }}>
                        {r.blocker || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'open',
                    header: 'Open',
                    sticky: 'right',
                    render: (r) => (
                      <Button
                        size="small"
                        appearance="primary"
                        aria-label={`Open workspace for ${r.title}`}
                        onClick={() => openOpportunity(r.opportunityId)}
                      >
                        Open
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </AtlasCard>
        </>
      ) : null}

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
