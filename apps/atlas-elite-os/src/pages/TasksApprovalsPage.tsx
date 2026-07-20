import { useCallback, useEffect, useState } from 'react';
import { AtlasCard, DataTable, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import * as dataverse from '../microsoft/adapters/dataverse';
import type { AtlasApprovalRecord } from '../microsoft/types';

/**
 * DEF-ELITE-005 — Live tasks & approvals against Dataverse hvcg_atlasapprovals.
 */
export function TasksPage() {
  const { account, configured, signIn } = useMicrosoftAuth();
  const { role, can } = useAtlasRole();
  const [rows, setRows] = useState<AtlasApprovalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [comment, setComment] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const refresh = useCallback(async () => {
    if (!account) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await dataverse.listApprovals();
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(id: string, fn: () => Promise<void>, ok: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(ok);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onCreate() {
    if (!newTitle.trim()) {
      setError('Title is required.');
      return;
    }
    if (!can('mutateTasks') && !can('mutateApprovals')) {
      setError('Your role cannot create tasks or approvals.');
      return;
    }
    setBusyId('create');
    setError(null);
    setSuccess(null);
    try {
      await dataverse.createApproval({
        title: newTitle.trim(),
        notes: comment.trim() || undefined,
        track: 'Executive Dashboard',
      });
      setNewTitle('');
      setComment('');
      setSuccess('Created in Dataverse (Pending).');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (!configured) {
    return (
      <ModuleScaffold title="Tasks & Approvals" subtitle="Entra SPA not configured" showPendingBanner={false}>
        <Text>Set VITE_ENTRA_CLIENT_ID to enable Microsoft sign-in.</Text>
      </ModuleScaffold>
    );
  }

  if (!account) {
    return (
      <ModuleScaffold title="Tasks & Approvals" subtitle="Sign in required" showPendingBanner={false}>
        <Button appearance="primary" onClick={() => void signIn()}>
          Sign in with Microsoft
        </Button>
      </ModuleScaffold>
    );
  }

  if (role === 'Unresolved') {
    return (
      <ModuleScaffold title="Tasks & Approvals" subtitle="Role required" showPendingBanner={false}>
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>No Atlas role assigned</MessageBarTitle>
            Access denied until an Entra app role (or approved QA role simulation) is present.
          </MessageBarBody>
        </MessageBar>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title="Tasks & Approvals"
      subtitle={`Live Dataverse actions · role ${role}`}
      showPendingBanner={false}
    >
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Action failed</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {success ? (
        <MessageBar intent="success">
          <MessageBarBody>
            <MessageBarTitle>Success</MessageBarTitle>
            {success}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard title="Create task / approval request" subtitle="Persists to hvcg_atlasapprovals">
        <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <Input
            placeholder="Title"
            value={newTitle}
            onChange={(_, d) => setNewTitle(d.value)}
            disabled={!can('mutateTasks') && !can('mutateApprovals')}
          />
          <Textarea
            placeholder="Comment / notes (optional)"
            value={comment}
            onChange={(_, d) => setComment(d.value)}
            disabled={!can('mutateTasks') && !can('mutateApprovals')}
          />
          <Button
            appearance="primary"
            disabled={busyId === 'create' || (!can('mutateTasks') && !can('mutateApprovals'))}
            onClick={() => void onCreate()}
          >
            {busyId === 'create' ? <Spinner size="tiny" /> : 'Create'}
          </Button>
          {!can('mutateTasks') && !can('mutateApprovals') ? (
            <Caption1>Read-only role — create disabled.</Caption1>
          ) : null}
        </div>
      </AtlasCard>

      <AtlasCard
        title="Action queue"
        subtitle="Approve / reject / reopen / edit — audit via Owner notes + modifiedon"
        headerAction={
          <Button size="small" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? <Spinner label="Loading from Dataverse…" /> : null}
        {!loading && rows.length === 0 ? (
          <Text>No verified records available in Dataverse approvals.</Text>
        ) : null}
        {!loading && rows.length > 0 ? (
          <DataTable
            ariaLabel="Live approvals"
            getRowKey={(r) => r.id}
            rows={rows}
            columns={[
              { key: 'title', header: 'Title', render: (r) => r.title },
              {
                key: 'dec',
                header: 'Decision',
                render: (r) => <StatusChip label={r.decision} tone="gold" />,
              },
              { key: 'risk', header: 'Risk', render: (r) => r.risk },
              { key: 'track', header: 'Track', render: (r) => r.track },
              {
                key: 'hist',
                header: 'History',
                render: (r) => (
                  <Caption1>
                    {(r.notes || '—').slice(0, 80)}
                    {r.modifiedOn ? ` · ${new Date(r.modifiedOn).toLocaleString()}` : ''}
                  </Caption1>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <Button
                      size="small"
                      disabled={busyId === r.id || !can('mutateApprovals')}
                      onClick={() =>
                        void runAction(
                          r.id,
                          () =>
                            dataverse.updateApprovalDecision(
                              r.id,
                              'Approved',
                              `${r.notes || ''}\n[${new Date().toISOString()}] Approved by ${role}`.trim(),
                            ),
                          'Approved in Dataverse.',
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === r.id || !can('mutateApprovals')}
                      onClick={() =>
                        void runAction(
                          r.id,
                          () =>
                            dataverse.updateApprovalDecision(
                              r.id,
                              'Rejected',
                              `${r.notes || ''}\n[${new Date().toISOString()}] Rejected by ${role}`.trim(),
                            ),
                          'Rejected in Dataverse.',
                        )
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === r.id || !can('mutateTasks')}
                      onClick={() =>
                        void runAction(
                          r.id,
                          () =>
                            dataverse.updateApprovalDecision(
                              r.id,
                              'Pending',
                              `${r.notes || ''}\n[${new Date().toISOString()}] Reopened by ${role}`.trim(),
                            ),
                          'Reopened (Pending).',
                        )
                      }
                    >
                      Reopen
                    </Button>
                    <Button
                      size="small"
                      disabled={busyId === r.id || !can('mutateTasks')}
                      onClick={() => {
                        setEditId(r.id);
                        setEditTitle(r.title);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}

        {editId ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input value={editTitle} onChange={(_, d) => setEditTitle(d.value)} style={{ minWidth: 240 }} />
            <Button
              appearance="primary"
              disabled={!can('mutateTasks')}
              onClick={() =>
                void runAction(
                  editId,
                  () =>
                    dataverse.updateApprovalTitle(
                      editId,
                      editTitle.trim(),
                      `Edited by ${role} at ${new Date().toISOString()}`,
                    ),
                  'Title updated.',
                ).then(() => setEditId(null))
              }
            >
              Save
            </Button>
            <Button onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        ) : null}
      </AtlasCard>
    </ModuleScaffold>
  );
}
