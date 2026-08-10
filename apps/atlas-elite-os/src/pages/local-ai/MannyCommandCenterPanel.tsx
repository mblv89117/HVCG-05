/**
 * Manny Command Center panel — decision-relevant Local AI Operations signals.
 * Extends existing Elite surfaces; not a competing dashboard.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { useHubAuth } from '../../integrations/hub/useHubAuth';
import {
  fetchLocalAiCommandCenter,
  postLocalAiMannyDecision,
  type LocalAiCommandCenter,
  type LocalAiJob,
} from '../../integrations/hub/api';

function JobLine({
  job,
  onDecide,
  busy,
}: {
  job: LocalAiJob;
  onDecide?: (id: string, d: 'Approved' | 'Rejected' | 'Returned for Revision') => void;
  busy?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        padding: '10px 0',
        borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
      }}
    >
      <Text weight="semibold">
        {job.requestedOperation} · {job.sourceRecordType}/{job.sourceRecordId}
      </Text>
      <Caption1>
        {job.workValueTier} · {job.processingStatus} · confidence{' '}
        {job.confidence === null ? '—' : job.confidence.toFixed(2)}
      </Caption1>
      {job.outputSummary ? <Caption1>{job.outputSummary}</Caption1> : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatusChip tone="warning" label={job.mannyDecision} />
        {onDecide && job.processingStatus === 'Waiting on Manny' ? (
          <>
            <Button size="small" appearance="primary" disabled={busy} onClick={() => onDecide(job.aiJobId, 'Approved')}>
              Approve
            </Button>
            <Button size="small" disabled={busy} onClick={() => onDecide(job.aiJobId, 'Rejected')}>
              Reject
            </Button>
            <Button size="small" disabled={busy} onClick={() => onDecide(job.aiJobId, 'Returned for Revision')}>
              Return
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function MannyCommandCenterPanel() {
  const { account } = useMicrosoftAuth();
  const hubAuth = useHubAuth();
  const signedIn = Boolean(account && hubAuth.userId);
  const [data, setData] = useState<LocalAiCommandCenter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLocalAiCommandCenter(hubAuth);
      setData(res.commandCenter);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hubAuth, signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onDecide(id: string, decision: 'Approved' | 'Rejected' | 'Returned for Revision') {
    if (!signedIn) return;
    setBusyId(id);
    setError(null);
    try {
      await postLocalAiMannyDecision(hubAuth, id, decision, 'Manny');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AtlasCard
      title="Manny decision queue"
      subtitle="Local AI Operations — drafts only; EVA intake and external email remain Off"
    >
      {!signedIn ? (
        <Caption1>Sign in to load Local AI Operations signals from the Integration Hub.</Caption1>
      ) : null}
      {loading ? <Spinner size="tiny" label="Loading decision queue…" /> : null}
      {error ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Hub unavailable or Local AI not reachable</MessageBarTitle>
            {error}. Feature flags default Off; Phase 1 mock worker does not call Ollama.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {data ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Caption1>
            Flags: LocalAI={String(data.featureFlags.LocalAIEnabled)} · Writes=
            {String(data.featureFlags.LocalAIWritesEnabled)} · Eva=
            {String(data.evaIntakeEnabled)} · Est. Manny time saved{' '}
            {data.estimatedMannyTimeSavedMinutes}m · {data.syntheticNotice}
          </Caption1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip
              tone="info"
              label={`AI awaiting Manny: ${data.aiDraftsAwaitingApproval.length}`}
            />
            <StatusChip tone="warning" label={`Failed: ${data.failedAiJobs.length}`} />
            <StatusChip
              tone="danger"
              label={`Low confidence: ${data.lowConfidenceAiOutputs.length}`}
            />
            <StatusChip tone="neutral" label={`Ops open: ${data.operationsOpen}`} />
            <StatusChip tone="success" label={`Draft ready: ${data.draftReadyCount}`} />
          </div>
          <Text weight="semibold">AI drafts awaiting approval</Text>
          {data.aiDraftsAwaitingApproval.length === 0 ? (
            <Caption1>No AI drafts waiting on Manny.</Caption1>
          ) : (
            data.aiDraftsAwaitingApproval.map((j) => (
              <JobLine key={j.aiJobId} job={j} onDecide={onDecide} busy={busyId === j.aiJobId} />
            ))
          )}
          <Text weight="semibold">Pricing / scope / capital</Text>
          {[...data.pricingAndScopeApprovals, ...data.capitalDecisions].length === 0 ? (
            <Caption1>No gated pricing, scope, or capital packages.</Caption1>
          ) : (
            [...data.pricingAndScopeApprovals, ...data.capitalDecisions]
              .slice(0, 8)
              .map((j) => <JobLine key={`g-${j.aiJobId}`} job={j} />)
          )}
          <Text weight="semibold">Failed / low-confidence</Text>
          {[...data.failedAiJobs, ...data.lowConfidenceAiOutputs].length === 0 ? (
            <Caption1>No failed or low-confidence jobs.</Caption1>
          ) : (
            [...data.failedAiJobs, ...data.lowConfidenceAiOutputs]
              .slice(0, 8)
              .map((j) => <JobLine key={`f-${j.aiJobId}`} job={j} />)
          )}
          <Caption1>
            EVA submissions awaiting review: {data.evaSubmissionsAwaitingReview.length} (intake disabled by
            design). External communications gated:{' '}
            {data.externalCommunicationsAwaitingApproval.length}.
          </Caption1>
          <Link to="/ai-operations">
            <Button size="small" appearance="secondary">
              Open AI Operations Queue
            </Button>
          </Link>
        </div>
      ) : null}
    </AtlasCard>
  );
}
