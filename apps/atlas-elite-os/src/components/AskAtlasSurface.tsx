import { AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Caption1, Text } from '@fluentui/react-components';
import { atlasStatusTone } from '../ui/statusLanguage';
import type { AskAtlasView } from './askAtlasView';

function classificationTone(label: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (label === 'CONFIRMED') return 'success';
  if (label === 'LIKELY') return 'warning';
  if (label === 'PROPOSED') return 'info';
  return 'neutral';
}

export function AskAtlasSurface({ view }: { view: AskAtlasView }) {
  const context = view.clientContext;
  const search = view.authorizedSearch;

  return (
    <div data-testid="ask-atlas-surface" data-kind={view.kind}>
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text weight="semibold">{view.title}</Text>
          {view.question ? (
            <Caption1 style={{ display: 'block', marginTop: 4 }} data-testid="ask-atlas-question">
              {view.question}
            </Caption1>
          ) : null}
          <Caption1 style={{ display: 'block', marginTop: 6 }}>{view.subtitle}</Caption1>
        </div>
        <StatusChip label={view.kind === 'unsigned' || view.kind === 'denied' || view.kind === 'error' ? 'Fail-closed' : view.kind === 'loading' ? 'Loading' : 'Hub signed'} tone={view.kind === 'unsigned' || view.kind === 'denied' || view.kind === 'error' || view.kind === 'loading' ? 'neutral' : 'info'} />
      </div>

      {view.kind === 'loading' ? (
        <Caption1 style={{ display: 'block', marginTop: 12 }}>Loading entitled Ask Atlas runtime from Hub…</Caption1>
      ) : null}

      {view.emptyReason ? (
        <div style={{ marginTop: 12 }} data-testid="ask-atlas-empty">
          <EmptyState title="No entitled attention items" description={view.emptyReason} />
        </div>
      ) : null}

      {view.items.length ? (
        <ol style={{ margin: '12px 0 0', paddingLeft: 20 }} data-testid="ask-atlas-items">
          {view.items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }} data-state={item.state} data-classification={item.classification}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusChip label={item.state} tone={atlasStatusTone(item.state)} />
                <StatusChip label={item.classification} tone={classificationTone(item.classification)} />
                {item.provenance && item.provenance !== item.classification ? (
                  <StatusChip label={item.provenance} tone={classificationTone(item.provenance)} />
                ) : null}
              </div>
              <Text style={{ display: 'block', marginTop: 6 }}>{item.why}</Text>
              {item.client || item.clientCode ? (
                <Caption1 style={{ display: 'block', marginTop: 4 }}>
                  {[item.client, item.clientCode].filter(Boolean).join(' · ')}
                </Caption1>
              ) : null}
              <Caption1 style={{ display: 'block', marginTop: 4 }}>
                Based on: {item.basedOn} ({item.classification})
              </Caption1>
            </li>
          ))}
        </ol>
      ) : null}

      {context ? (
        <div style={{ marginTop: 16 }} data-testid="ask-atlas-client-context" data-client-code={context.clientCode || ''} data-classification={context.classification} data-evidence-class={context.evidenceClass}>
          <Text weight="semibold">Client context</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            {[context.client, context.clientCode].filter(Boolean).join(' · ') || 'Honest empty client bind'}
          </Caption1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <StatusChip label={context.classification} tone={classificationTone(context.classification)} />
            <StatusChip label={context.evidenceClass} tone="neutral" />
          </div>
          <Text style={{ display: 'block', marginTop: 6 }}>{context.why}</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Based on: {context.basedOn} ({context.classification})
          </Caption1>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            evidenceClass={context.evidenceClass} · hubMiOperationalized={String(context.hubMiOperationalized)} ·
            realClientsOperationalized={context.realClientsOperationalized.length ? context.realClientsOperationalized.join(', ') : '[]'}
          </Caption1>
        </div>
      ) : null}

      {search ? (
        <div style={{ marginTop: 16 }} data-testid="ask-atlas-authorized-search" data-hit-count={String(search.hitCount)}>
          <Text weight="semibold">Authorized search</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            hitCount={search.hitCount} · pictureComposed={String(search.pictureComposed)} · entitled={String(search.entitled)}
          </Caption1>
          <Text style={{ display: 'block', marginTop: 6 }}>{search.why}</Text>
          <Caption1 style={{ display: 'block', marginTop: 4 }}>
            Based on: {search.basedOn} ({search.classification})
          </Caption1>
          {search.hits.length ? (
            <ol style={{ margin: '12px 0 0', paddingLeft: 20 }} data-testid="ask-atlas-search-hits">
              {search.hits.map((hit) => (
                <li key={hit.id} style={{ marginBottom: 12 }} data-classification={hit.classification}>
                  <Text>{hit.title}</Text>
                  {hit.clientCode ? (
                    <Caption1 style={{ display: 'block', marginTop: 4 }}>{hit.clientCode}</Caption1>
                  ) : null}
                  <Caption1 style={{ display: 'block', marginTop: 4 }}>{hit.why}</Caption1>
                  <Caption1 style={{ display: 'block', marginTop: 4 }}>
                    Based on: {hit.basedOn} ({hit.classification})
                  </Caption1>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </AtlasCard>
    </div>
  );
}
