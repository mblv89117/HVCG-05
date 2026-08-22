/**
 * Governed Client Activation — Won is not Active Client.
 * Authorize is Manny-only on the Hub. This page never provisions access.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AccessDeniedState,
  AtlasCard,
  ErrorState,
  LoadingState,
  ResponsiveGrid,
  StatusChip,
} from '@hvcg/atlas-design-system';
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
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { FieldGrid, ModuleScaffold } from './shared/ModuleScaffold';
import {
  applyClientActivation,
  fetchClientActivation,
  HubHttpError,
  type PmClient,
  type PmOpportunity,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { useAtlasRole } from '../security/RoleProvider';
import { isCanonicalClientCode } from '../security/clientCode';
import { ATLAS_STATUS, atlasStatusDisplay } from '../ui/statusLanguage';

function classify(err: unknown): { kind: 'auth' | 'forbidden' | 'error'; message: string } {
  const status = err instanceof HubHttpError ? err.status : (err as { status?: number }).status;
  if (status === 401) return { kind: 'auth', message: 'Microsoft sign-in required (Bearer token missing).' };
  if (status === 403) return { kind: 'forbidden', message: 'Authenticated but not authorized for client activation (403).' };
  if (status === 404) return { kind: 'error', message: 'Client activation record was not found in your authorized scope.' };
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
}

export function ClientActivationPage() {
  const { workspaceId = '' } = useParams();
  const auth = useHubAuth();
  const { role } = useAtlasRole();
  const clientCode = isCanonicalClientCode(workspaceId) ? workspaceId : '';
  const canAuthorize = role === 'HVCG Owner';

  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: 'auth' | 'forbidden' | 'error'; message: string } | null>(null);
  const [client, setClient] = useState<PmClient | null>(null);
  const [opportunity, setOpportunity] = useState<PmOpportunity | undefined>();
  const [status, setStatus] = useState<string>('');
  const [etag, setEtag] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!auth.tokenReady || !auth.hasBearer || !clientCode) return;
    setBusy(true);
    setFailure(null);
    try {
      const data = await fetchClientActivation(auth, clientCode);
      setClient(data.client);
      setOpportunity(data.opportunity);
      setStatus(data.status);
      setEtag(data.client.etag || '');
    } catch (err) {
      setFailure(classify(err));
      setClient(null);
    } finally {
      setBusy(false);
    }
  }, [auth, clientCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (action: 'request' | 'review' | 'authorize' | 'verify') => {
    if (!clientCode || !opportunity?.id) {
      setActionError('A Won opportunity is required before client activation can proceed.');
      return;
    }
    setActing(action);
    setActionError(null);
    try {
      await applyClientActivation(auth, clientCode, {
        action,
        opportunityId: opportunity.id,
        notes: notes.trim() || undefined,
        etag,
      });
      await refresh();
    } catch (err) {
      setActionError(classify(err).message);
    } finally {
      setActing(null);
    }
  };

  if (!clientCode) {
    return (
      <ModuleScaffold title="Client activation" subtitle="Invalid ClientCode" showPendingBanner={false}>
        <ErrorState title="ClientCode is not canonical" description="Activation is keyed by HVCG_Clients.ClientCode, not a marketing or GCC tenant id." />
      </ModuleScaffold>
    );
  }

  if (!auth.tokenReady || (busy && !client && !failure)) {
    return (
      <ModuleScaffold title="Client activation" subtitle="Loading authorized HVCG_Clients record…" showPendingBanner={false}>
        <LoadingState rows={4} label={!auth.tokenReady ? 'Connecting to Hub' : 'Loading activation'} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'auth') {
    return (
      <ModuleScaffold title="Client activation" subtitle="Sign-in required" showPendingBanner={false}>
        <AccessDeniedState title="Authenticated access required" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure?.kind === 'forbidden') {
    return (
      <ModuleScaffold title="Client activation" subtitle="403" showPendingBanner={false}>
        <AccessDeniedState title="Access denied" description={failure.message} />
      </ModuleScaffold>
    );
  }

  if (failure || !client) {
    return (
      <ModuleScaffold title="Client activation" subtitle="Record unavailable" showPendingBanner={false}>
        <ErrorState
          title="Activation could not load"
          description={failure?.message || 'Hub did not return this HVCG_Clients activation record.'}
          actions={
            <Button appearance="primary" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </ModuleScaffold>
    );
  }

  const stageChip = atlasStatusDisplay(client.clientStage);
  const alreadyActive = client.clientStage === 'Active Client';

  return (
    <ModuleScaffold
      title={`Activate ${client.displayName || clientCode}`}
      subtitle={[clientCode, client.clientStage || 'Prospect', status || ATLAS_STATUS.activationRequired]
        .filter(Boolean)
        .join(' · ')}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/clients/${encodeURIComponent(clientCode)}`}>
            <Button appearance="secondary">Company</Button>
          </Link>
          {opportunity?.id ? (
            <Link to={`/opportunities/${encodeURIComponent(opportunity.id)}`}>
              <Button appearance="secondary">Opportunity</Button>
            </Link>
          ) : null}
          <Button icon={<ArrowSyncRegular />} onClick={() => void refresh()} disabled={busy}>
            Refresh
          </Button>
        </div>
      }
    >
      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Activation action did not complete</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={stageChip?.label || client.clientStage || 'Prospect'} tone={stageChip?.tone || 'info'} />
          <StatusChip
            label={alreadyActive ? ATLAS_STATUS.verified : ATLAS_STATUS.activationRequired}
            tone={alreadyActive ? 'success' : 'gold'}
          />
        </div>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          Won is not Active Client. Authorize is the only path that sets ClientStage. Entitlements stay off.
        </Caption1>
      </AtlasCard>

      <FieldGrid
        fields={[
          { label: 'Company', value: client.displayName || clientCode },
          { label: 'ClientCode', value: clientCode },
          { label: 'ClientStage', value: client.clientStage || 'Prospect' },
          { label: 'Activation status', value: status || 'not_started' },
          { label: 'Opportunity', value: opportunity?.title || 'No Won opportunity linked' },
          { label: 'Entitlements', value: 'Not provisioned' },
        ]}
      />

      <ResponsiveGrid>
        <AtlasCard title="Governed actions">
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              <Caption1 style={{ display: 'block', marginBottom: 4 }}>Review notes</Caption1>
              <Textarea
                value={notes}
                onChange={(_, d) => setNotes(d.value)}
                aria-label="Client activation review notes"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button appearance="secondary" disabled={Boolean(acting) || alreadyActive} onClick={() => void act('request')}>
                {acting === 'request' ? <Spinner size="tiny" /> : 'Request review'}
              </Button>
              <Button appearance="secondary" disabled={Boolean(acting) || alreadyActive} onClick={() => void act('review')}>
                {acting === 'review' ? <Spinner size="tiny" /> : 'Mark reviewed'}
              </Button>
              {canAuthorize ? (
                <Button appearance="primary" disabled={Boolean(acting)} onClick={() => void act('authorize')}>
                  {acting === 'authorize' ? <Spinner size="tiny" /> : 'Authorize Active Client'}
                </Button>
              ) : (
                <Caption1>Authorize is Manny-only. Staff can request and review.</Caption1>
              )}
              <Button appearance="secondary" disabled={Boolean(acting) || !alreadyActive} onClick={() => void act('verify')}>
                {acting === 'verify' ? <Spinner size="tiny" /> : 'Verify activation'}
              </Button>
            </div>
          </div>
        </AtlasCard>
        <AtlasCard title="What this will not do">
          <Text weight="semibold" style={{ display: 'block' }}>
            Activation does not grant client access.
          </Text>
          <Caption1 style={{ display: 'block', marginTop: 8 }}>
            This workflow never creates Entra client groups, SharePoint client libraries, portal users,
            GCC tenants, or entitlements. GCC handoff, if used later, is persist-only mapping after
            authorized Active Client.
          </Caption1>
        </AtlasCard>
      </ResponsiveGrid>
    </ModuleScaffold>
  );
}
