/**
 * AI Operations Queue — Phase 2 local Ollama read-only draft mode.
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
  cancelLocalAiJob,
  fetchLocalAiFlags,
  fetchLocalAiJob,
  fetchLocalAiJobs,
  fetchLocalAiOllamaDiscovery,
  postLocalAiMannyDecision,
  processLocalAiJob,
  retryLocalAiJob,
  type LocalAiJob,
} from '../../integrations/hub/api';

type Discovery = Awaited<ReturnType<typeof fetchLocalAiOllamaDiscovery>>;

export function AiOperationsQueuePage() {
  const { account } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const signedIn = Boolean(account && hubAuth.userId);
  const [jobs, setJobs] = useState<LocalAiJob[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
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
      const [j, f, d] = await Promise.all([
        fetchLocalAiJobs(hubAuth),
        fetchLocalAiFlags(hubAuth),
        fetchLocalAiOllamaDiscovery(hubAuth).catch(() => null),
      ]);
      setJobs(j.jobs);
      setFlags(f.flags);
      setDiscovery(d);
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

  async function runAction(kind: 'process' | 'retry' | 'cancel') {
    if (!signedIn || !selected) return;
    setBusy(true);
    try {
      if (kind === 'process') await processLocalAiJob(hubAuth, selected.job.aiJobId, true);
      if (kind === 'retry') await retryLocalAiJob(hubAuth, selected.job.aiJobId, true);
      if (kind === 'cancel') await cancelLocalAiJob(hubAuth, selected.job.aiJobId);
      await refresh();
      await openJob(selected.job.aiJobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const disc = discovery?.discovery;
  const exec = discovery?.executor;

  return (
    <ModuleScaffold
      title="AI Operations Queue"
      subtitle="Phase 2 — local Ollama read-only drafts; no business writes; no external communications"
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>LOCAL DEVELOPMENT ONLY</MessageBarTitle>
          NO BUSINESS RECORD WRITES · NO EXTERNAL COMMUNICATIONS · EVA intake disabled · Outputs labeled
          TEST — SYNTHETIC AI OUTPUT — DO NOT SEND
        </MessageBarBody>
      </MessageBar>

      <AtlasCard title="Executor status" subtitle="Loopback Ollama" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <StatusChip
            tone={disc?.healthy ? 'success' : 'danger'}
            label={`Ollama ${disc?.healthy ? 'healthy' : 'unavailable'}`}
          />
          <StatusChip tone="info" label={`Model: ${disc?.selectedModel || 'unset'}`} />
          <StatusChip
            tone="neutral"
            label={`Local-only: ${String(exec?.loopbackOnly ?? true)}`}
          />
          <StatusChip tone="warning" label="Writes: Off" />
          <StatusChip tone="warning" label="External msgs: Off" />
        </div>
        <Caption1>
          Base URL: {disc?.baseUrl || '—'} · Version: {disc?.version || '—'} · Models available:{' '}
          {disc?.models?.length ?? 0}
          {disc?.models?.[0]?.contextLength
            ? ` · Context: ${disc.models[0].contextLength}`
            : ''}
        </Caption1>
        <Caption1 style={{ display: 'block', marginTop: 4 }}>
          {disc?.openWebUiNote ||
            'Open WebUI is optional and not used by the Atlas executor.'}
        </Caption1>
        {disc?.error ? <Caption1 style={{ display: 'block' }}>Discovery error: {disc.error}</Caption1> : null}
      </AtlasCard>

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
          <Text>
            No AI jobs yet. Create via Integration Hub `/api/local-ai/jobs` with synthetic fixtures
            (TEST — DO NOT CONTACT).
          </Text>
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
            Schema validation: {selected.job.validationStatus} · Confidence:{' '}
            {selected.job.confidence === null ? '—' : selected.job.confidence.toFixed(2)} · Manny
            approval required: {String(selected.job.requiresMannyApproval)} · Authoritative write:{' '}
            {String(selected.job.wroteAuthoritativeBusinessRecord)}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Executor: {selected.job.executorMode || '—'} · Duration:{' '}
            {selected.job.processingDurationMs != null
              ? `${selected.job.processingDurationMs} ms`
              : '—'}{' '}
            · Metrics: {JSON.stringify(selected.job.ollamaMetrics || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Redaction: {JSON.stringify(selected.job.redactionSummary || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Injection warnings:{' '}
            {(selected.job.injectionWarnings || []).length
              ? selected.job.injectionWarnings!.join('; ')
              : 'none'}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{selected.job.outputSummary}</Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Output preview: {JSON.stringify(selected.job.outputPayload)?.slice(0, 400) || '—'}
          </Caption1>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button disabled={busy} onClick={() => void runAction('process')}>
              Process / force
            </Button>
            <Button disabled={busy} onClick={() => void runAction('retry')}>
              Retry
            </Button>
            <Button disabled={busy} onClick={() => void runAction('cancel')}>
              Cancel
            </Button>
            {selected.job.processingStatus === 'Waiting on Manny' ? (
              <>
                <Button appearance="primary" disabled={busy} onClick={() => void decide('Approved')}>
                  Manny Approve
                </Button>
                <Button disabled={busy} onClick={() => void decide('Rejected')}>
                  Reject
                </Button>
                <Button disabled={busy} onClick={() => void decide('Returned for Revision')}>
                  Return for revision
                </Button>
              </>
            ) : null}
          </div>
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(selected.audit, null, 2)}
          </pre>
        </AtlasCard>
      ) : null}
    </ModuleScaffold>
  );
}
