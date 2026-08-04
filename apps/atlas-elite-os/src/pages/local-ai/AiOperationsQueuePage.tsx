/**
 * AI Operations Queue — Phase 3 controlled live-content + performance.
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
  Textarea,
} from '@fluentui/react-components';
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  cancelLocalAiJob,
  createLocalAiContentPack,
  decideLocalAiContentPackRedaction,
  fetchLocalAiApprovalQueue,
  fetchLocalAiContentPack,
  fetchLocalAiContentPacks,
  fetchLocalAiFlags,
  fetchLocalAiJob,
  fetchLocalAiJobs,
  fetchLocalAiModelRouting,
  fetchLocalAiOllamaDiscovery,
  fetchLocalAiPerformance,
  postLocalAiMannyDecision,
  postLocalAiModelCompare,
  processLocalAiContentPack,
  processLocalAiJob,
  retryLocalAiJob,
  type LocalAiContentPack,
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
  const [routing, setRouting] = useState<Record<string, unknown> | null>(null);
  const [perf, setPerf] = useState<Record<string, unknown> | null>(null);
  const [packs, setPacks] = useState<LocalAiContentPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<LocalAiContentPack | null>(null);
  const [selected, setSelected] = useState<{ job: LocalAiJob; audit: unknown[] } | null>(null);
  const [paste, setPaste] = useState('');
  const [editedRedaction, setEditedRedaction] = useState('');
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null);
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
      const [j, f, d, r, p, packsRes] = await Promise.all([
        fetchLocalAiJobs(hubAuth),
        fetchLocalAiFlags(hubAuth),
        fetchLocalAiOllamaDiscovery(hubAuth).catch(() => null),
        fetchLocalAiModelRouting(hubAuth).catch(() => null),
        fetchLocalAiPerformance(hubAuth).catch(() => null),
        fetchLocalAiContentPacks(hubAuth).catch(() => ({ packs: [] })),
      ]);
      setJobs(j.jobs);
      setFlags(f.flags);
      setDiscovery(d);
      setRouting(r?.routing || null);
      setPerf(p?.dashboard || null);
      setPacks(packsRes.packs || []);
      await fetchLocalAiApprovalQueue(hubAuth).catch(() => null);
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
      setSelected(await fetchLocalAiJob(hubAuth, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(
    decision:
      | 'Approved'
      | 'Rejected'
      | 'Returned for Revision'
      | 'Archived'
      | 'No Action Required'
      | 'Automation Candidate'
      | 'Eliminate',
  ) {
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

  async function createPack() {
    if (!signedIn || !paste.trim()) return;
    setBusy(true);
    try {
      const { pack } = await createLocalAiContentPack(hubAuth, {
        sourceKind: 'pasted_text',
        sourceConfirmed: true,
        clientId: 'manual-ui',
        clientLabel: 'Manual Review Client',
        sensitivity: 'Confidential',
        requestedOperation: 'summarize_text',
        originalContent: paste.includes('TEST —')
          ? paste
          : `TEST — SYNTHETIC DATA\n${paste}\nTEST — DO NOT CONTACT`,
        ownerApprovedLiveContent: false,
      });
      const detail = await fetchLocalAiContentPack(hubAuth, pack.packId);
      setSelectedPack(detail.pack);
      setEditedRedaction(detail.pack.redactedContent || '');
      setPaste('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function packDecision(decision: string) {
    if (!signedIn || !selectedPack) return;
    setBusy(true);
    try {
      const { pack } = await decideLocalAiContentPackRedaction(
        hubAuth,
        selectedPack.packId,
        decision,
        decision === 'Edit Redactions'
          ? editedRedaction || selectedPack.redactedContent
          : undefined,
      );
      setSelectedPack(pack);
      if (decision === 'Edit Redactions') {
        setEditedRedaction(pack.redactedContent || '');
      }
      if (decision === 'Approve Redacted Content') {
        const result = await processLocalAiContentPack(hubAuth, pack.packId, true);
        setSelected({ job: result.job, audit: [] });
        await openJob(result.job.aiJobId);
      }
      await refresh();
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
      subtitle="Phase 3 — controlled live-content packs; read-only drafts; no business writes"
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>LOCAL DEVELOPMENT ONLY</MessageBarTitle>
          NO BUSINESS RECORD WRITES · NO EXTERNAL COMMUNICATIONS · EVA intake disabled · Manual
          content only · Redaction approval required before model call
        </MessageBarBody>
      </MessageBar>

      <AtlasCard title="Executor + model routing" subtitle="Loopback Ollama" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <StatusChip
            tone={disc?.healthy ? 'success' : 'danger'}
            label={`Ollama ${disc?.healthy ? 'healthy' : 'unavailable'}`}
          />
          <StatusChip tone="info" label={`Deep: ${String((routing as { profiles?: { 'Deep Analysis Model'?: { modelName?: string } } })?.profiles?.['Deep Analysis Model']?.modelName || disc?.selectedModel || 'unset')}`} />
          <StatusChip
            tone={routing?.fasterModelAvailable ? 'success' : 'warning'}
            label={
              routing?.fasterModelAvailable
                ? 'Faster model available'
                : 'No distinct fast model — fallback recorded'
            }
          />
          <StatusChip tone="neutral" label={`Local-only: ${String(exec?.loopbackOnly ?? true)}`} />
          <StatusChip tone="warning" label="Writes: Off" />
          <StatusChip tone="warning" label="External msgs: Off" />
        </div>
        {routing?.ownerActionRequired ? (
          <Caption1 style={{ display: 'block' }}>{String(routing.ownerActionRequired)}</Caption1>
        ) : null}
      </AtlasCard>

      {perf ? (
        <AtlasCard title="Performance" subtitle="Phase 4A Fast vs Deep metrics" style={{ marginTop: 12 }}>
          <Caption1>
            Fast avg ms: {String(perf.fastModelAverageLatencyMs ?? '—')} · Deep avg ms:{' '}
            {String(perf.deepModelAverageLatencyMs ?? '—')} · Fail rate:{' '}
            {Number(perf.failureRate || 0).toFixed(2)} · Validation fail:{' '}
            {Number(perf.validationFailureRate || 0).toFixed(2)} · Fallback rate:{' '}
            {Number(perf.fallbackRate || 0).toFixed(2)} · Retry rate:{' '}
            {Number(perf.retryRate || 0).toFixed(2)} · Est. Manny minutes saved:{' '}
            {String(perf.estimatedMannyTimeSavedMinutes)}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Validation by model: {JSON.stringify(perf.validationRateByModel || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Selection reasons: {JSON.stringify(perf.modelSelectionReasons || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Slowest routine: {JSON.stringify(perf.slowestRoutineOperations || [])}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Deep-only ops: {JSON.stringify(perf.operationsThatShouldRemainDeepOnly || [])}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Flags: {JSON.stringify(perf.flags || [])}
          </Caption1>
        </AtlasCard>
      ) : null}

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

      <AtlasCard
        title="Manual content pack"
        subtitle="Paste → redaction preview → Manny approve → model"
        style={{ marginTop: 12 }}
      >
        <Textarea
          value={paste}
          onChange={(_, d) => setPaste(d.value)}
          placeholder="Paste synthetic or owner-approved content (TEST — banners preferred)"
          style={{ width: '100%', minHeight: 100 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" disabled={busy || !signedIn} onClick={() => void createPack()}>
            Create pack (Manny initiate)
          </Button>
          <Button
            disabled={busy || !signedIn || !paste.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  const res = await postLocalAiModelCompare(hubAuth, {
                    operation: 'summarize_text',
                    sourceContent: paste.includes('TEST —')
                      ? paste
                      : `TEST — SYNTHETIC DATA\n${paste}\nTEST — DO NOT CONTACT`,
                  });
                  setCompare(res.comparison);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Side-by-side Fast vs Deep (local only)
          </Button>
          <Button disabled={loading || !signedIn} onClick={() => void refresh()}>
            Refresh
          </Button>
          {loading ? <Spinner size="tiny" /> : null}
        </div>
        {compare ? (
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(compare, null, 2)}
          </pre>
        ) : null}
        {selectedPack ? (
          <div style={{ marginTop: 12 }}>
            <Caption1>
              Pack {selectedPack.packId} · {selectedPack.status} · chars {selectedPack.estimatedChars}{' '}
              · ~tokens {selectedPack.estimatedTokensApprox}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Redaction: {JSON.stringify(selectedPack.redactionPreview || {})}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4 }}>
              Injection: {JSON.stringify(selectedPack.injectionPreview || {})}
            </Caption1>
            <Caption1 style={{ display: 'block', marginTop: 4, whiteSpace: 'pre-wrap' }}>
              Proposed redacted preview:{'\n'}
              {(selectedPack.redactedContent || '').slice(0, 800)}
            </Caption1>
            <Textarea
              value={editedRedaction || selectedPack.redactedContent || ''}
              onChange={(_, d) => setEditedRedaction(d.value)}
              placeholder="Edit redacted content before Approve"
              style={{ width: '100%', minHeight: 80, marginTop: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Button disabled={busy} onClick={() => void packDecision('Approve Redacted Content')}>
                Approve Redacted Content
              </Button>
              <Button disabled={busy} onClick={() => void packDecision('Edit Redactions')}>
                Edit Redactions
              </Button>
              <Button disabled={busy} onClick={() => void packDecision('Cancel Job')}>
                Cancel Job
              </Button>
            </div>
          </div>
        ) : null}
        {packs.length ? (
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            Packs: {packs.map((p) => `${p.packId.slice(0, 8)}:${p.status}`).join(' · ')}
          </Caption1>
        ) : null}
      </AtlasCard>

      <AtlasCard title="Jobs" subtitle={`${jobs.length} governed AI jobs`} style={{ marginTop: 12 }}>
        {jobs.length === 0 ? (
          <Text>No AI jobs yet. Create a content pack or Phase 2 job via Hub API.</Text>
        ) : (
          <DataTable
            columns={[
              { key: 'op', header: 'Operation', render: (r: LocalAiJob) => r.requestedOperation },
              {
                key: 'src',
                header: 'Source',
                render: (r: LocalAiJob) => `${r.sourceRecordType}/${r.sourceRecordId}`,
              },
              { key: 'status', header: 'Status', render: (r: LocalAiJob) => r.processingStatus },
              {
                key: 'conf',
                header: 'Confidence',
                render: (r: LocalAiJob) => (r.confidence === null ? '—' : r.confidence.toFixed(2)),
              },
              {
                key: 'tp',
                header: 'Time protect',
                render: (r: LocalAiJob) =>
                  (r.timeProtection as { classification?: string } | undefined)?.classification ||
                  '—',
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
            Model routing: {JSON.stringify(selected.job.modelRouting || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Time protection: {JSON.stringify(selected.job.timeProtection || {})}
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>{selected.job.outputSummary}</Caption1>
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
            {selected.job.processingStatus === 'Waiting on Manny' ||
            selected.job.processingStatus === 'Draft Ready' ? (
              <>
                <Button appearance="primary" disabled={busy} onClick={() => void decide('Approved')}>
                  Approve draft
                </Button>
                <Button disabled={busy} onClick={() => void decide('Rejected')}>
                  Reject
                </Button>
                <Button disabled={busy} onClick={() => void decide('Returned for Revision')}>
                  Return for revision
                </Button>
                <Button disabled={busy} onClick={() => void decide('Archived')}>
                  Archive
                </Button>
                <Button disabled={busy} onClick={() => void decide('No Action Required')}>
                  No action
                </Button>
                <Button disabled={busy} onClick={() => void decide('Automation Candidate')}>
                  Automation candidate
                </Button>
                <Button disabled={busy} onClick={() => void decide('Eliminate')}>
                  Eliminate
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
