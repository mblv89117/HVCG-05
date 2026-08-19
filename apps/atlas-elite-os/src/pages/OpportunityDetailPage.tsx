/**
 * HVCG_Opportunities record after governed Lead conversion. Hub is authoritative.
 * This is sales CRM, not the capital desk.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  ErrorState,
  LoadingState,
  StatusChip,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { fetchPmOpportunity, HubHttpError, type PmOpportunity } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { atlasStatusDisplay } from '../ui/statusLanguage';

function classify(err: unknown): { kind: 'auth' | 'forbidden' | 'error'; message: string } {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  if (status === 403) return { kind: 'forbidden', message: 'Authenticated but not authorized for this opportunity (403).' };
  if (status === 404) return { kind: 'error', message: 'Opportunity not found or not in your authorized scope.' };
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

export function OpportunityDetailPage() {
  const { opportunityId = '' } = useParams();
  const auth = useHubAuth();
  const [opportunity, setOpportunity] = useState<PmOpportunity | null>(null);
  const [busy, setBusy] = useState(true);
  const [failure, setFailure] = useState<{ kind: 'auth' | 'forbidden' | 'error'; message: string } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!auth.tokenReady) return;
    if (!auth.hasBearer) {
      setBusy(false);
      setOpportunity(null);
      setFailure({ kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' });
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const data = await fetchPmOpportunity(auth, opportunityId);
      setOpportunity(data.opportunity);
    } catch (err) {
      setOpportunity(null);
      setFailure(classify(err));
    } finally {
      setBusy(false);
    }
  }, [auth, opportunityId]);

  useEffect(() => {
    if (!auth.tokenReady) return;
    void refresh();
  }, [refresh, auth.tokenReady, auth.hasBearer]);

  if (!auth.tokenReady || (busy && !opportunity && !failure)) {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Loading authorized HVCG_Opportunities record…" showPendingBanner={false}>
        <LoadingState rows={4} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading opportunity'} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth') {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState title="Authenticated access required" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden') {
    return (
      <ModuleScaffold title="Opportunity" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure || !opportunity) {
    return (
      <ModuleScaffold title="Opportunity" subtitle="Record unavailable" showPendingBanner={false}>
        <ErrorState
          title="Opportunity could not load"
          description={failure?.message || 'Hub did not return this HVCG_Opportunities record.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  const chip = atlasStatusDisplay(opportunity.stage);

  return (
    <ModuleScaffold
      title={opportunity.title}
      subtitle={[opportunity.opportunityType, opportunity.winLossStatus, opportunity.clientCode]
        .filter(Boolean)
        .join(' · ') || 'HVCG_Opportunities'}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/leads">
            <Button appearance="secondary">Leads</Button>
          </Link>
          {opportunity.leadId ? (
            <Link to={`/leads/${encodeURIComponent(opportunity.leadId)}`}>
              <Button appearance="secondary">Source lead</Button>
            </Link>
          ) : null}
          {opportunity.clientCode ? (
            <Link to={`/clients/${encodeURIComponent(opportunity.clientCode)}`}>
              <Button appearance="secondary">Company</Button>
            </Link>
          ) : null}
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={chip?.label || opportunity.stage} tone={chip?.tone || 'info'} />
          {opportunity.opportunityType ? (
            <StatusChip label={opportunity.opportunityType} tone="neutral" />
          ) : null}
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          {[opportunity.ownerEmail ? `Owner ${opportunity.ownerEmail}` : null, opportunity.clientCode]
            .filter(Boolean)
            .join(' · ')}
        </Caption1>
      </AtlasCard>

      <AtlasCard title="Pipeline">
        <Text weight="semibold" style={{ display: 'block' }}>
          Stage {opportunity.stage}
          {opportunity.proposalAmount != null ? ` · ${opportunity.proposalAmount}` : ''}
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 6 }}>
          {opportunity.notes || 'Attribution and source notes from the converted lead, when present.'}
        </Caption1>
      </AtlasCard>
    </ModuleScaffold>
  );
}
