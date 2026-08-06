/**
 * AI Operations Queue — Phase 3 controlled live-content + performance.
 */

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
import { ModuleScaffold } from '../shared/ModuleScaffold';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  cancelLocalAiJob,
  cancelLocalAiStagedDocument,
  compareLocalAiStagedDocuments,
  createLocalAiContentPack,
  createLocalAiMultiDocumentPack,
  decideLocalAiContentPackRedaction,
  decideLocalAiStagedDocument,
  fetchLocalAiApprovalQueue,
  fetchLocalAiContentPack,
  fetchLocalAiContentPacks,
  fetchLocalAiFlags,
  fetchLocalAiJob,
  fetchLocalAiJobs,
  fetchLocalAiModelRouting,
  fetchLocalAiOllamaDiscovery,
  fetchLocalAiPerformance,
  fetchLocalAiStagedDocument,
  fetchLocalAiStagedDocuments,
  fetchLocalAiDocumentRecovery,
  fetchLocalAiDocumentStorageHealth,
  fetchLocalAiMultiDocumentPacks,
  fetchLocalAiRetentionPreview,
  backupLocalAiDocumentStore,
  searchLocalAiDocuments,
  postLocalAiMannyDecision,
  postLocalAiModelCompare,
  processLocalAiContentPack,
  processLocalAiJob,
  processLocalAiStagedDocument,
  purgeLocalAiStagedDocument,
  retryLocalAiJob,
  stageLocalAiDocument,
  type LocalAiContentPack,
  type LocalAiJob,
  type LocalAiStagedDocument,
} from '../../integrations/hub/api';

type Discovery = Awaited<ReturnType<typeof fetchLocalAiOllamaDiscovery>>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const i = result.indexOf(',');
      resolve(i >= 0 ? result.slice(i + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

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
  const [docs, setDocs] = useState<LocalAiStagedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LocalAiStagedDocument | null>(null);
  const [docClient, setDocClient] = useState('Synthetic Client');
  const [compareDocId, setCompareDocId] = useState('');
  const [versionCompare, setVersionCompare] = useState<Record<string, unknown> | null>(null);
  const [multiPack, setMultiPack] = useState<Record<string, unknown> | null>(null);
  const [multiPacks, setMultiPacks] = useState<Array<Record<string, unknown>>>([]);
  const [docFilter, setDocFilter] = useState('');
  const [interrupted, setInterrupted] = useState<Array<Record<string, unknown>>>([]);
  const [storageHealth, setStorageHealth] = useState<Record<string, unknown> | null>(null);
  const [retentionCandidates, setRetentionCandidates] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [backupInfo, setBackupInfo] = useState<Record<string, unknown> | null>(null);
  const [paste, setPaste] = useState('');
  const [editedRedaction, setEditedRedaction] = useState('');
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setJobs([]);
      setDocs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [j, f, d, r, p, packsRes, docsRes, multiRes, recoveryRes, healthRes, retentionRes] =
        await Promise.all([
          fetchLocalAiJobs(hubAuth),
          fetchLocalAiFlags(hubAuth),
          fetchLocalAiOllamaDiscovery(hubAuth).catch(() => null),
          fetchLocalAiModelRouting(hubAuth).catch(() => null),
          fetchLocalAiPerformance(hubAuth).catch(() => null),
          fetchLocalAiContentPacks(hubAuth).catch(() => ({ packs: [] })),
          fetchLocalAiStagedDocuments(hubAuth).catch(() => ({ documents: [] })),
          fetchLocalAiMultiDocumentPacks(hubAuth).catch(() => ({ packs: [] })),
          fetchLocalAiDocumentRecovery(hubAuth).catch(() => ({ interrupted: [] })),
          fetchLocalAiDocumentStorageHealth(hubAuth).catch(() => null),
          fetchLocalAiRetentionPreview(hubAuth).catch(() => ({ candidates: [] })),
        ]);
      setJobs(j.jobs);
      setFlags(f.flags);
      setDiscovery(d);
      setRouting(r?.routing || null);
      setPerf(p?.dashboard || null);
      setPacks(packsRes.packs || []);
      setDocs(docsRes.documents || []);
      setMultiPacks(multiRes.packs || []);
      setInterrupted(recoveryRes.interrupted || []);
      setStorageHealth(healthRes?.health || null);
      setRetentionCandidates(retentionRes.candidates || []);
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

  async function openDoc(id: string) {
    if (!signedIn) return;
    setBusy(true);
    try {
      const { document } = await fetchLocalAiStagedDocument(hubAuth, id);
      setSelectedDoc(document);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSelectFile(file: File | null) {
    if (!signedIn || !file) return;
    setBusy(true);
    setError(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const { document } = await stageLocalAiDocument(hubAuth, {
        originalFilename: file.name,
        contentBase64,
        declaredMime: file.type || undefined,
      });
      setSelectedDoc(document);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function processDoc(forceOcr = false) {
    if (!signedIn || !selectedDoc) return;
    setBusy(true);
    try {
      const { document } = await processLocalAiStagedDocument(hubAuth, selectedDoc.stagedFileId, {
        clientLabel: docClient || 'Unknown Client',
        forceOcr,
      });
      setSelectedDoc(document);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function docDecision(decision: string, corrections?: Record<string, unknown>) {
    if (!signedIn || !selectedDoc) return;
    setBusy(true);
    try {
      if (decision === 'Purge Staged File') {
        const { document } = await purgeLocalAiStagedDocument(hubAuth, selectedDoc.stagedFileId);
        setSelectedDoc(document);
      } else {
        const { document } = await decideLocalAiStagedDocument(
          hubAuth,
          selectedDoc.stagedFileId,
          decision,
          corrections,
        );
        setSelectedDoc(document);
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
  const pack = selectedDoc?.reviewPackage as Record<string, unknown> | null | undefined;
  const classification = pack?.classification as
    | { proposedType?: string; confidence?: number; evidence?: string[] }
    | undefined;
  const naming = pack?.naming as
    | { originalFilename?: string; proposedFilename?: string; reason?: string; fileRenamed?: boolean }
    | undefined;
  const folder = pack?.folder as
    | { proposedFolderPath?: string; reason?: string; fileMoved?: boolean }
    | undefined;
  const duplicate = pack?.duplicate as { status?: string; reasons?: string[] } | undefined;
  const modelRouting = pack?.modelRouting as
    | { requestedProfile?: string; actualModel?: string }
    | undefined;

  return (
    <ModuleScaffold
      title="AI Operations Queue"
      subtitle="Phase 4B-2 — local document enrichment drafts + Phase 3 content packs; no business writes"
      showPendingBanner={false}
    >
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>LOCAL DEVELOPMENT ONLY</MessageBarTitle>
          NO BUSINESS RECORD WRITES · NO EXTERNAL COMMUNICATIONS · EVA intake disabled · Manual
          content only · Redaction approval required before model call
        </MessageBarBody>
      </MessageBar>

      <MessageBar intent="warning" style={{ marginTop: 12 }}>
        <MessageBarBody>
          <MessageBarTitle>LOCAL DOCUMENT REVIEW · DRAFT ONLY</MessageBarTitle>
          NO FILE MOVEMENT · NO RECORD WRITES · NO EXTERNAL COMMUNICATIONS · Explicit Manny file
          selection only · Durable local SQLite store survives Hub/machine restarts
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
        title="Document Review Library"
        subtitle="Persisted reviews · filters · decisions · expiration"
        style={{ marginTop: 12 }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Input
            value={docFilter}
            onChange={(_, d) => setDocFilter(d.value)}
            placeholder="Filter filename / status / client"
            style={{ minWidth: 240 }}
          />
          <Button
            disabled={busy || !signedIn}
            onClick={() =>
              void searchLocalAiDocuments(hubAuth, {
                originalFilename: docFilter || undefined,
                status: docFilter || undefined,
                clientLabel: docFilter || undefined,
              })
                .then((r) => setDocs(r.documents || []))
                .catch((e) => setError(e instanceof Error ? e.message : String(e)))
            }
          >
            Search library
          </Button>
        </div>
        <Caption1>
          {docs.length} review(s) · malware / duplicate / model / decision columns in Open detail
        </Caption1>
      </AtlasCard>

      <AtlasCard
        title="Multi-Document Packs"
        subtitle="Manually selected reviews only · no folder/system access"
        style={{ marginTop: 12 }}
      >
        {multiPacks.length ? (
          <DataTable
            columns={[
              {
                key: 'id',
                header: 'Pack',
                render: (r: Record<string, unknown>) => String(r.packId || '').slice(0, 8),
              },
              {
                key: 'client',
                header: 'Client',
                render: (r: Record<string, unknown>) => String(r.clientLabel || ''),
              },
              {
                key: 'n',
                header: 'Files',
                render: (r: Record<string, unknown>) =>
                  String((r.stagedFileIds as string[] | undefined)?.length || 0),
              },
            ]}
            rows={multiPacks}
            getRowKey={(r: Record<string, unknown>) => String(r.packId)}
          />
        ) : (
          <Caption1>No multi-document packs yet.</Caption1>
        )}
        {multiPack ? (
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(multiPack, null, 2)}
          </pre>
        ) : null}
      </AtlasCard>

      <AtlasCard
        title="Recovery"
        subtitle="Interrupted jobs after restart — manual resume/cancel only"
        style={{ marginTop: 12 }}
      >
        <Caption1 style={{ display: 'block', marginBottom: 8 }}>
          No automatic reprocess. {interrupted.length} interrupted job(s).
        </Caption1>
        {interrupted.length ? (
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(interrupted.slice(0, 10), null, 2)}
          </pre>
        ) : null}
      </AtlasCard>

      <AtlasCard
        title="Local Storage"
        subtitle="SQLite health · retention · backup (local only)"
        style={{ marginTop: 12 }}
      >
        <Caption1 style={{ display: 'block', marginBottom: 8 }}>
          Schema {String(storageHealth?.schemaVersion ?? '—')} · reviews{' '}
          {String(storageHealth?.reviewCount ?? '—')} · DB bytes{' '}
          {String(storageHealth?.dbBytes ?? '—')} · purge candidates {retentionCandidates.length}
        </Caption1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            disabled={busy || !signedIn}
            onClick={() =>
              void backupLocalAiDocumentStore(hubAuth, { dryRun: true }).then((r) =>
                setBackupInfo(r.backup),
              )
            }
          >
            Backup dry-run
          </Button>
          <Button
            disabled={busy || !signedIn}
            onClick={() =>
              void backupLocalAiDocumentStore(hubAuth, { dryRun: false }).then((r) =>
                setBackupInfo(r.backup),
              )
            }
          >
            Create local backup
          </Button>
          <Button disabled={loading || !signedIn} onClick={() => void refresh()}>
            Refresh storage
          </Button>
        </div>
        {backupInfo ? (
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(backupInfo, null, 2)}
          </pre>
        ) : null}
        {retentionCandidates.length ? (
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(retentionCandidates.slice(0, 5), null, 2)}
          </pre>
        ) : null}
      </AtlasCard>

      <AtlasCard
        title="Document Review"
        subtitle="Manual local intake → stage → extract/OCR → draft package"
        style={{ marginTop: 12 }}
      >
        <Caption1 style={{ display: 'block', marginBottom: 8 }}>
          Supported: PDF, DOCX, XLSX, CSV, TXT, PNG, JPG/JPEG · Staging is gitignored and expires ·
          Approval never renames, moves, uploads, or writes records
        </Caption1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,application/pdf,image/*"
            disabled={busy || !signedIn}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              e.target.value = '';
              void onSelectFile(f);
            }}
          />
          <Input
            value={docClient}
            onChange={(_, d) => setDocClient(d.value)}
            placeholder="Client label (draft naming)"
            style={{ minWidth: 200 }}
          />
          <Button
            appearance="primary"
            disabled={busy || !signedIn || !selectedDoc || selectedDoc.status === 'Purged'}
            onClick={() => void processDoc(false)}
          >
            Extract + review
          </Button>
          <Button
            disabled={busy || !signedIn || !selectedDoc}
            onClick={() => void processDoc(true)}
          >
            Force OCR
          </Button>
          <Button
            disabled={busy || !signedIn || !selectedDoc}
            onClick={() =>
              void cancelLocalAiStagedDocument(hubAuth, selectedDoc!.stagedFileId).then(() =>
                refresh(),
              )
            }
          >
            Cancel processing
          </Button>
          <Button disabled={loading || !signedIn} onClick={() => void refresh()}>
            Refresh docs
          </Button>
        </div>

        {docs.length ? (
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Original',
                render: (r: LocalAiStagedDocument) => r.originalFilename,
              },
              { key: 'st', header: 'Status', render: (r: LocalAiStagedDocument) => r.status },
              {
                key: 'sz',
                header: 'Bytes',
                render: (r: LocalAiStagedDocument) => String(r.sizeBytes),
              },
              {
                key: 'act',
                header: '',
                render: (r: LocalAiStagedDocument) => (
                  <Button size="small" disabled={busy} onClick={() => void openDoc(r.stagedFileId)}>
                    Open
                  </Button>
                ),
              },
            ]}
            rows={docs}
            getRowKey={(r: LocalAiStagedDocument) => r.stagedFileId}
          />
        ) : (
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            No staged documents. Select a file explicitly (no auto-ingest).
          </Caption1>
        )}

        {selectedDoc ? (
          <div style={{ marginTop: 12 }}>
            <StatusChip tone="info" label={selectedDoc.status} />
            <StatusChip tone="warning" label="DRAFT ONLY" />
            <StatusChip tone="warning" label="NO FILE MOVEMENT" />
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              {selectedDoc.originalFilename} → safe {selectedDoc.safeFilename} · checksum{' '}
              {selectedDoc.checksumSha256.slice(0, 16)}… · expires {selectedDoc.expiresAt} ·
              malware: {selectedDoc.malwareScanStatus}
              {selectedDoc.malwareScanNote ? ` (${selectedDoc.malwareScanNote.slice(0, 120)})` : ''}
            </Caption1>
            {(selectedDoc as { malwareScan?: { scannerVersion?: string } }).malwareScan
              ?.scannerVersion ? (
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                Scanner:{' '}
                {
                  (selectedDoc as { malwareScan?: { scannerVersion?: string } }).malwareScan
                    ?.scannerVersion
                }
              </Caption1>
            ) : null}
            {selectedDoc.extraction ? (
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                Extraction: {selectedDoc.extraction.method} · embedded chars{' '}
                {selectedDoc.extraction.embeddedTextChars} · OCR chars{' '}
                {selectedDoc.extraction.ocrTextChars} · pages{' '}
                {String(selectedDoc.extraction.pageCount ?? '—')}
                {selectedDoc.extraction.ocr
                  ? ` · OCR ${selectedDoc.extraction.ocr.engine} ${selectedDoc.extraction.ocr.version} · processed ${selectedDoc.extraction.ocr.pagesProcessed} · avg conf ${selectedDoc.extraction.ocr.averageConfidence ?? '—'} · ${selectedDoc.extraction.ocr.disclaimer}`
                  : ''}
              </Caption1>
            ) : null}
            {selectedDoc.extraction?.pages?.length ? (
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                Page confidence:{' '}
                {selectedDoc.extraction.pages
                  .map(
                    (p) =>
                      `p${p.page}:${p.sourceKind}${p.confidence != null ? `:${p.confidence.toFixed(2)}` : ''}`,
                  )
                  .join(' · ')}
              </Caption1>
            ) : null}
            {pack ? (
              <>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Classification: {classification?.proposedType} (
                  {classification?.confidence != null
                    ? classification.confidence.toFixed(2)
                    : '—'}
                  ) · evidence {JSON.stringify(classification?.evidence || [])}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Duplicate: {duplicate?.status} · {JSON.stringify(duplicate?.reasons || [])}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Proposed filename: {naming?.proposedFilename} (renamed={String(naming?.fileRenamed)}
                  ) · {naming?.reason}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Proposed folder: {folder?.proposedFolderPath} (moved={String(folder?.fileMoved)}) ·{' '}
                  {folder?.reason}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Model policy: {modelRouting?.requestedProfile} / {modelRouting?.actualModel}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Injection: {JSON.stringify(pack.injectionWarnings || [])}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Redaction: {JSON.stringify(pack.redactionSummary || {})}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Fields: {JSON.stringify(pack.structuredFields || []).slice(0, 600)}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Enrichment: {String(pack.enrichmentStatus || '—')} · conflicts{' '}
                  {JSON.stringify(pack.conflicts || []).slice(0, 300)}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  AI enrichment preview: {JSON.stringify(pack.enrichment || {}).slice(0, 800)}
                </Caption1>
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  Decision: {selectedDoc.mannyDecision || 'Pending'} · next:{' '}
                  {String(pack.recommendedNextAction || '')}
                </Caption1>
              </>
            ) : null}
            {selectedDoc.errorDetail ? (
              <Caption1 style={{ display: 'block', marginTop: 4, color: '#a00' }}>
                Error: {selectedDoc.errorDetail}
              </Caption1>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {(
                [
                  'Approve Redacted Content',
                  'Edit Redactions',
                  'Cancel Enrichment',
                  'Approve Draft',
                  'Reject Draft',
                  'Return for Revision',
                  'Mark Duplicate',
                  'Mark Unique',
                  'Archive Review Result',
                  'Purge Staged File',
                ] as const
              ).map((d) => (
                <Button
                  key={d}
                  appearance={
                    d === 'Approve Redacted Content' || d === 'Approve Draft'
                      ? 'primary'
                      : 'secondary'
                  }
                  disabled={
                    busy ||
                    (!pack && d !== 'Purge Staged File') ||
                    (d === 'Approve Redacted Content' &&
                      selectedDoc.status !== 'AwaitingRedactionApproval')
                  }
                  onClick={() => void docDecision(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Input
                value={compareDocId}
                onChange={(_, d) => setCompareDocId(d.value)}
                placeholder="Other stagedFileId for version compare"
                style={{ minWidth: 260 }}
              />
              <Button
                disabled={busy || !selectedDoc || !compareDocId.trim()}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      const res = await compareLocalAiStagedDocuments(
                        hubAuth,
                        selectedDoc!.stagedFileId,
                        compareDocId.trim(),
                      );
                      setVersionCompare(res.comparison);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Compare versions
              </Button>
              <Button
                disabled={busy || docs.length < 2}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      const ids = docs.slice(0, 5).map((d) => d.stagedFileId);
                      const res = await createLocalAiMultiDocumentPack(hubAuth, {
                        stagedFileIds: ids,
                        clientLabel: docClient || 'Synthetic Client',
                      });
                      setMultiPack(res.pack);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Multi-document pack (selected list)
              </Button>
            </div>
            {versionCompare ? (
              <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(versionCompare, null, 2)}
              </pre>
            ) : null}
            {multiPack ? (
              <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(multiPack, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </AtlasCard>

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
