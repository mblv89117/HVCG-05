import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, DataTable, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Dropdown,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Title3,
} from '@fluentui/react-components';
import {
  fetchApprovalCenter,
  fetchApprovalDetail,
  postApprovalAction,
  type ApprovalDetail,
  type ApprovalListItem,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { ModuleScaffold } from './shared/ModuleScaffold';

type FilterKey = 'ALL' | 'PENDING' | 'DEFERRED' | 'CAPITAL' | 'MARKETING' | 'ONBOARDING' | 'WORKFLOW_AUTHORITY';

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'REJECTED' || status === 'FAILED_AFTER_APPROVAL') return 'danger';
  if (status === 'PENDING' || status === 'REQUIRES_APPROVAL') return 'warning';
  if (status === 'DEFERRED') return 'info';
  if (status === 'APPROVED' || status === 'EXECUTED') return 'success';
  return 'neutral';
}

function formatWhen(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ApprovalsPage() {
  const auth = useHubAuth();
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, deferred: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.tokenReady || !auth.hasBearer) {
      setLoading(false);
      setError('Microsoft sign-in required (Bearer token missing)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApprovalCenter(auth);
      setItems(res.approvalCenter.items);
      setCounts(res.approvalCenter.counts);
    } catch (err) {
      setError(String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadDetail = useCallback(
    async (approvalId: string) => {
      if (!auth.hasBearer) return;
      setDetailLoading(true);
      setError(null);
      try {
        const res = await fetchApprovalDetail(auth, approvalId);
        setDetail(res.approvalCenter.detail);
        setSelectedId(approvalId);
        setConfirmAction(null);
      } catch (err) {
        setError(String(err));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [auth],
  );

  const runAction = useCallback(
    async (action: 'approve' | 'reject' | 'defer' | 'cancel', approvalId: string) => {
      if (!auth.hasBearer) return;
      setActionBusy(true);
      setError(null);
      try {
        const res = await postApprovalAction(auth, { approvalId, action });
        setDetail(res.approvalCenter.detail);
        await refresh();
      } catch (err) {
        setError(String(err));
      } finally {
        setActionBusy(false);
        setConfirmAction(null);
      }
    },
    [auth, refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'ALL') return true;
      if (filter === 'PENDING') return item.status === 'PENDING';
      if (filter === 'DEFERRED') return item.status === 'DEFERRED';
      if (filter === 'CAPITAL') return item.category === 'CAPITAL';
      if (filter === 'MARKETING') return item.category === 'MARKETING';
      if (filter === 'ONBOARDING') return item.category === 'ONBOARDING';
      if (filter === 'WORKFLOW_AUTHORITY') return item.category === 'WORKFLOW_AUTHORITY';
      return true;
    });
  }, [items, filter]);

  const columns = [
    {
      key: 'title',
      header: 'Approval',
      render: (row: ApprovalListItem) => (
        <Button appearance="transparent" onClick={() => void loadDetail(row.approvalId)}>
          <Text weight="semibold">{row.title}</Text>
        </Button>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (row: ApprovalListItem) => row.clientName || row.clientCode || '—',
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: ApprovalListItem) => row.category.replace(/_/g, ' '),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ApprovalListItem) => <StatusChip label={row.status} tone={statusTone(row.status)} />,
    },
    {
      key: 'requestedAt',
      header: 'Requested',
      render: (row: ApprovalListItem) => formatWhen(row.requestedAt),
    },
  ];

  return (
    <ModuleScaffold title="Approvals" subtitle="Owner decisions requiring your authorization">
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChip label={`${counts.pending} pending`} tone="warning" />
        <StatusChip label={`${counts.deferred} deferred`} tone="info" />
        <StatusChip label={`${counts.total} total`} tone="neutral" />
        <Dropdown
          value={filter}
          selectedOptions={[filter]}
          onOptionSelect={(_, data) => setFilter((data.optionValue as FilterKey) || 'PENDING')}
        >
          <Option value="PENDING">Pending</Option>
          <Option value="ALL">All</Option>
          <Option value="DEFERRED">Deferred</Option>
          <Option value="CAPITAL">Capital</Option>
          <Option value="MARKETING">Marketing / Hart</Option>
          <Option value="ONBOARDING">Onboarding</Option>
          <Option value="WORKFLOW_AUTHORITY">Workflow authority</Option>
        </Dropdown>
        <Button appearance="secondary" onClick={() => refresh()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AtlasCard>
          <Title3>Approval queue</Title3>
          {loading ? (
            <Spinner label="Loading approvals…" />
          ) : filtered.length === 0 ? (
            <EmptyState title="No approvals in this view" description="Nothing requires your decision in the selected filter." />
          ) : (
            <DataTable
              ariaLabel="Approval queue"
              rows={filtered}
              getRowKey={(row) => row.approvalId}
              columns={columns}
            />
          )}
        </AtlasCard>

        <AtlasCard>
          <Title3>Approval detail</Title3>
          {detailLoading ? (
            <Spinner label="Loading detail…" />
          ) : !detail ? (
            <EmptyState title="Select an approval" description="Choose an item from the queue to review evidence and act." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Text weight="semibold">{detail.title}</Text>
                <Caption1>{detail.approvalType} · {detail.category}</Caption1>
              </div>
              <StatusChip label={detail.status} tone={statusTone(detail.status)} />
              {detail.executionState && detail.executionState !== 'NOT_STARTED' ? (
                <Caption1>Execution: {detail.executionState}</Caption1>
              ) : null}
              {detail.stale ? (
                <MessageBar intent="warning">
                  <MessageBarBody>Underlying parameters changed since approval was recorded. Re-review before executing.</MessageBarBody>
                </MessageBar>
              ) : null}
              <div>
                <Caption1>What is being requested</Caption1>
                <Text>{detail.whatIsRequested}</Text>
              </div>
              <div>
                <Caption1>Why approval is required</Caption1>
                <Text>{detail.whyRequiresApproval}</Text>
              </div>
              <div>
                <Caption1>If approved</Caption1>
                <Text>{detail.expectedEffectIfApproved}</Text>
              </div>
              <div>
                <Caption1>If rejected</Caption1>
                <Text>{detail.expectedEffectIfRejected}</Text>
              </div>
              {detail.confirmationSummary ? (
                <MessageBar intent="info">
                  <MessageBarBody>{detail.confirmationSummary}</MessageBarBody>
                </MessageBar>
              ) : null}
              {detail.workflowId ? (
                <Link to={`/workflows?workflowId=${encodeURIComponent(detail.workflowId)}`}>Open workflow</Link>
              ) : null}
              {detail.href ? <Link to={detail.href}>Open context</Link> : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.actions.includes('approve') && detail.status === 'PENDING' ? (
                  confirmAction === 'approve' ? (
                    <>
                      <Button
                        appearance="primary"
                        disabled={actionBusy}
                        onClick={() => runAction('approve', detail.approvalId)}
                      >
                        Confirm approve
                      </Button>
                      <Button appearance="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button appearance="primary" disabled={actionBusy} onClick={() => setConfirmAction('approve')}>
                      Approve
                    </Button>
                  )
                ) : null}
                {detail.actions.includes('reject') && (detail.status === 'PENDING' || detail.status === 'DEFERRED') ? (
                  confirmAction === 'reject' ? (
                    <>
                      <Button
                        appearance="secondary"
                        disabled={actionBusy}
                        onClick={() => runAction('reject', detail.approvalId)}
                      >
                        Confirm reject
                      </Button>
                      <Button appearance="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button appearance="secondary" disabled={actionBusy} onClick={() => setConfirmAction('reject')}>
                      Reject
                    </Button>
                  )
                ) : null}
                {detail.actions.includes('defer') && detail.status === 'PENDING' ? (
                  <Button appearance="secondary" disabled={actionBusy} onClick={() => runAction('defer', detail.approvalId)}>
                    Defer
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </AtlasCard>
      </div>
    </ModuleScaffold>
  );
}
