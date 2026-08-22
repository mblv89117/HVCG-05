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
        <StatusChip label={view.kind === 'items' ? 'Hub signed' : 'Fail-closed'} tone={view.kind === 'items' ? 'info' : 'neutral'} />
      </div>

      {view.kind === 'loading' ? (
        <Caption1 style={{ display: 'block', marginTop: 12 }}>Loading entitled Ask Atlas attention from Hub…</Caption1>
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
    </AtlasCard>
    </div>
  );
}
