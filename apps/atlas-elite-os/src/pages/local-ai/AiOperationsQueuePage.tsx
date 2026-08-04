/**
 * AI Operations Queue — Phase 1 governed job view (mock worker only).
 */

import { useCallback, useEffect, useState } from 'react';
import { AtlasCard, DataTable, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  fetchLocalAiFlags,
  fetchLocalAiJob,
  fetchLocalAiJobs,
  postLocalAiMannyDecision,
  type LocalAiJob,
} from '../../integrations/hub/api';

export function AiOperationsQueuePage() {
  const { account } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const signedIn = Boolean(account && hubAuth.userId);
  const [jobs, setJobs] = useState<LocalAiJob[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [selected, setSelected] = useState<{ job: LocalAiJob; audit: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setJobs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [j, f] = await Promise.all([fetchLocalAiJobs(hubAuth), fetchLocalAiFlags(hubAuth)]);
      setJobs(j.jobs);
      setFlags(f.flags);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hubAuth, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openJob(id: string) {
    if (!signedIn) return;
    setBusy(true);
    try {
      const detail = await fetchLocalAiJob(hubAuth, id);
      setSelected(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: 'Approved' | 'Rejected' | 'Returned for Revision') {
    if (!signedIn || !selected) return;
    setBusy(true);
    try {
      await postLocalAiMannyDecision(hubAuth, selected.job.aiJobId, decision, 'Manny');
      await refresh();
      await openJob(selected.job.aiJobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleScaffold
      title="AI Operations Queue"
      subtitle="Governed Local AI jobs — mock worker only; no Ollama; no authoritative writes"
      showPendingBanner={false}
    >
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Phase 1 control plane</MessageBarTitle>
          All outputs are labeled TEST — SYNTHETIC AI OUTPUT — DO NOT SEND. Feature flags default Off.
          EVA intake and client emails remain disabled.
        </MessageBarBody>
      </MessageBar>

      {flags ? (
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          LocalAIEnabled={String(flags.LocalAIEnabled)} · LocalAIWritesEnabled=
          {String(flags.LocalAIWritesEnabled)} · LocalAIExternalMessagesEnabled=
          {String(flags.LocalAIExternalMessagesEnabled)} · EvaIntakeEnabled=
          {String(flags.EvaIntakeEnabled)} · ClientEmailsEnabled={String(flags.ClientEmailsEnabled)}
        </Caption1>
      ) : null}

      {error ? (
        <MessageBar intent="error" style={{ marginTop: 12 }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <Button appearance="primary" onClick={() => void refresh()} disabled={loading || !signedIn}>
          Refresh
        </Button>
        {loading ? <Spinner size="tiny" /> : null}
      </div>

      <AtlasCard title="Jobs" subtitle={`${jobs.length} governed AI jobs`}>
        {jobs.length === 0 ? (
          <Text>No AI jobs yet. Create via Integration Hub `/api/local-ai/jobs` (synthetic only).</Text>
        ) : (
          <DataTable
            columns={[
              { key: 'op', header: 'Operation', render: (r: LocalAiJob) => r.requestedOperation },
              {
                key: 'src',
                header: 'Source',
                render: (r: LocalAiJob) => `${r.sourceRecordType}/${r.sourceRecordId}`,
              },
              { key: 'tier', header: 'Tier', render: (r: LocalAiJob) => r.workValueTier },
              { key: 'status', header: 'Status', render: (r: LocalAiJob) => r.processingStatus },
              {
                key: 'conf',
                header: 'Confidence',
                render: (r: LocalAiJob) => (r.confidence === null ? '—' : r.confidence.toFixed(2)),
              },
              {
                key: 'manny',
                header: 'Manny',
                render: (r: LocalAiJob) => r.mannyDecision,
              },
              {
                key: 'retry',
                header: 'Retries',
                render: (r: LocalAiJob) => String(r.retryCount),
              },
              {
                key: 'act',
                header: '',
                render: (r: LocalAiJob) => (
                  <Button size="small" onClick={() => void openJob(r.aiJobId)} disabled={busy}>
                    Open
                  </Button>
                ),
              },
            ]}
            rows={jobs}
            getRowKey={(r: LocalAiJob) => r.aiJobId}
          />
        )}
      </AtlasCard>

      {selected ? (
        <AtlasCard title="Job detail + audit" subtitle={selected.job.aiJobId} style={{ marginTop: 16 }}>
          <StatusChip tone="info" label={selected.job.processingStatus} />
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Disposition: {selected.job.recommendedNextAction || '—'} · Audit{' '}
            {selected.job.auditCorrelationId} · Authoritative write:{' '}
            {String(selected.job.wroteAuthoritativeBusinessRecord)}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{selected.job.outputSummary}</Caption1>
          {selected.job.processingStatus === 'Waiting on Manny' ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button appearance="primary" disabled={busy} onClick={() => void decide('Approved')}>
                Manny Approve
              </Button>
              <Button disabled={busy} onClick={() => void decide('Rejected')}>
                Reject
              </Button>
              <Button disabled={busy} onClick={() => void decide('Returned for Revision')}>
                Return for revision
              </Button>
            </div>
          ) : null}
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(selected.audit, null, 2)}
          </pre>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
