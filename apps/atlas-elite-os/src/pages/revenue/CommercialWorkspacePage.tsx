/**
 * Elite commercial workspace — offer / pricing / proposal / engagement read-models.
 * Operator accept required. autoSend=false. Does not rebuild Revenue OS engines.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AtlasCard,
  ErrorState,
  ResponsiveGrid,
  StatusChip,
} from '@hvcg/atlas-design-system';
import { Button, Caption1, MessageBar, MessageBarBody, MessageBarTitle, Text } from '@fluentui/react-components';
import { FieldGrid, ModuleScaffold, ModuleSection } from '../shared/ModuleScaffold';
import { useAtlasRole } from '../../security/RoleProvider';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { loadCommercialReadModel } from './commercialReadModel';
import {
  acceptOffer,
  acceptPricing,
  acceptProposalInternally,
  attemptSendProposal,
  createWorkspaceState,
  openEngagement,
} from './commercialWorkspace';

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function CommercialWorkspacePage() {
  const { role } = useAtlasRole();
  const { displayName } = useMicrosoftAuth();
  const [params] = useSearchParams();
  const opportunityId = params.get('opportunity');
  const clientCode = params.get('client') ?? params.get('clientCode');
  const loaded = useMemo(
    () => loadCommercialReadModel(opportunityId, clientCode),
    [opportunityId, clientCode],
  );
  const [state, setState] = useState(() => (loaded.ok ? createWorkspaceState(loaded.model) : null));

  useEffect(() => {
    setState(loaded.ok ? createWorkspaceState(loaded.model) : null);
  }, [loaded]);

  const operator = displayName || role || '';

  const gateChips = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusChip label="liveDispatch false" tone="neutral" />
      <StatusChip label="autoSend false" tone="neutral" />
      <Link to="/opportunities">
        <Button appearance="secondary" size="small">
          Pipeline
        </Button>
      </Link>
    </div>
  );

  if (!loaded.ok || !state) {
    return (
      <ModuleScaffold
        title="Commercial workspace"
        subtitle="No loaded commercial context — fail closed"
        showPendingBanner={false}
        actions={gateChips}
      >
        <div data-testid="commercial-fail-closed">
          <ErrorState
            title="Commercial context not loaded"
            description={loaded.error}
          />
        </div>
      </ModuleScaffold>
    );
  }

  const { model, gates } = state;

  return (
    <ModuleScaffold
      title="Commercial workspace"
      subtitle={`${model.clientName} · ${model.clientCode} · ${model.opportunityId} — Revenue OS read-models. Billing remains outside Atlas.`}
      showPendingBanner={false}
      actions={gateChips}
    >
      <MessageBar intent="info" data-testid="commercial-gates">
        <MessageBarBody>
          <MessageBarTitle>Governed commercial path</MessageBarTitle>
          Recommendations stay observation-only until an Atlas operator accepts them. Proposals cannot auto-send.
          GCC auto-provision stays off. ACCG contracted prices are not rewritten here.
        </MessageBarBody>
      </MessageBar>

      {state.sendError ? (
        <MessageBar intent="warning" data-testid="commercial-send-error">
          <MessageBarBody>{state.sendError}</MessageBarBody>
        </MessageBar>
      ) : null}

      <FieldGrid
        fields={[
          { label: 'Stage', value: model.stage.replaceAll('_', ' ') },
          { label: 'Commercial class', value: model.offer.commercialClass.replaceAll('_', ' ') },
          { label: 'Service line', value: model.offer.serviceLine },
          { label: 'Offer', value: `${model.offer.offerCode} · ${model.offer.packageName}` },
        ]}
      />

      <ResponsiveGrid>
        <AtlasCard title="1 · Offer recommendation">
          <div style={{ display: 'grid', gap: 10 }} data-testid="offer-read-model">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label="observationOnly" tone="info" />
              <StatusChip label={state.offerAcceptedBy ? `Accepted by ${state.offerAcceptedBy}` : 'Awaiting operator'} tone={state.offerAcceptedBy ? 'success' : 'gold'} />
            </div>
            <Text>
              {model.offer.packageName} ({model.offer.sku}) — {model.offer.rationale}
            </Text>
            <Caption1>
              Copilot may recommend. Revenue OS owns accept. createsCommitment=false.
            </Caption1>
            <Button
              appearance="primary"
              disabled={Boolean(state.offerAcceptedBy)}
              onClick={() => setState((current) => acceptOffer(current, operator))}
            >
              Operator accept offer
            </Button>
          </div>
        </AtlasCard>

        <AtlasCard title="2 · Pricing recommendation">
          <div style={{ display: 'grid', gap: 10 }} data-testid="pricing-read-model">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label="observationOnly" tone="info" />
              <StatusChip label={model.pricing.pricingVersion} tone="neutral" />
            </div>
            <Text>
              Recommended setup {money(model.pricing.recommendedPrice, model.pricing.currency)} · floor{' '}
              {money(model.pricing.floorPrice, model.pricing.currency)} · list {money(model.pricing.listPrice, model.pricing.currency)}
            </Text>
            <Caption1>Not a quote, invoice, or contracted price. Legacy / ACCG locks stay in the engine.</Caption1>
            <Button
              appearance="primary"
              disabled={!state.offerAcceptedBy || Boolean(state.pricingAcceptedBy)}
              onClick={() => setState((current) => acceptPricing(current, operator))}
            >
              Operator accept pricing
            </Button>
          </div>
        </AtlasCard>
      </ResponsiveGrid>

      <ModuleSection title="3 · Proposal" subtitle="Draft and ready states only. Send is blocked (BL-C1).">
        <AtlasCard data-testid="proposal-read-model">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label={`status ${model.proposal.status}`} tone="info" />
              <StatusChip label="autoSend false" tone="neutral" />
            </div>
            <Caption1>
              {model.proposal.proposalId} · offer {model.proposal.offerSku}. Internal acceptance does not email the
              client.
            </Caption1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                appearance="secondary"
                onClick={() => setState((current) => attemptSendProposal(current))}
              >
                Send proposal
              </Button>
              <Button
                appearance="primary"
                disabled={!state.pricingAcceptedBy || model.proposal.status === 'accepted'}
                onClick={() => setState((current) => acceptProposalInternally(current, operator))}
              >
                Record acceptance (no live send)
              </Button>
            </div>
          </div>
        </AtlasCard>
      </ModuleSection>

      <ModuleSection title="4 · Engagement" subtitle="Distinct from Won and from GCC tenant mapping.">
        <AtlasCard data-testid="engagement-read-model">
          {model.engagement ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusChip label={model.engagement.engagementId} tone="success" />
                <StatusChip label={`success fee ${model.engagement.successFeeState}`} tone="gold" />
                <StatusChip label="payout off" tone="neutral" />
              </div>
              <Text>
                {model.engagement.scopeSummary} · starts {model.engagement.startsOn}. Referral{' '}
                {model.engagement.referralState || 'none'}. autoProvisionAccess={String(gates.autoProvisionAccess)}.
              </Text>
              <Caption1>SUCCESS_FEE_EARNED is not collected. Referral PAYABLE is not paid.</Caption1>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <Caption1>No engagement until operator-accepted proposal and approved economics.</Caption1>
              <Button
                appearance="primary"
                disabled={model.proposal.status !== 'accepted'}
                onClick={() => setState((current) => openEngagement(current, operator))}
              >
                Open engagement
              </Button>
            </div>
          )}
        </AtlasCard>
      </ModuleSection>
    </ModuleScaffold>
  );
}
