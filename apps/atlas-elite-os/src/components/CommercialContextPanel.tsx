import { Link } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import { Caption1, Text } from '@fluentui/react-components';
import type { DeskCommercialContext, OperatorCommercialContext } from '../integrations/hub/pmApi';
import { commercialContextCopy } from './commercialContextView';

export function CommercialContextPanel(props: {
  context?: DeskCommercialContext | OperatorCommercialContext | null;
  loading?: boolean;
  error?: string | null;
}) {
  const copy = commercialContextCopy(props.context);
  return (
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text weight="semibold">{copy.title}</Text>
          <Caption1 style={{ display: 'block' }}>{copy.subtitle}</Caption1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusChip label="Outbound OFF" tone="neutral" />
          <StatusChip label="Paid ads OFF" tone="neutral" />
        </div>
      </div>
      {props.loading ? <Caption1 style={{ display: 'block', marginTop: 8 }}>Loading recorded commercial context…</Caption1> : null}
      {props.error ? <Caption1 style={{ display: 'block', marginTop: 8 }}>{props.error}</Caption1> : null}
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {copy.lanes.map((lane) => (
          <div key={lane.title}>
            <Text weight="semibold">
              {lane.title}
              {lane.available ? ` · ${lane.count}` : ''}
            </Text>
            {lane.available && lane.lines.length ? (
              lane.lines.slice(0, 6).map((line) => (
                <Caption1 key={line} style={{ display: 'block' }}>
                  {line}
                </Caption1>
              ))
            ) : (
              <Caption1 style={{ display: 'block' }}>{lane.emptyReason}</Caption1>
            )}
          </div>
        ))}
        {props.context && 'liveClientPilot' in props.context && props.context.liveClientPilot ? (
        <div>
          <Text weight="semibold">Live Client operating brief</Text>
          <Caption1 style={{ display: 'block' }}>What is happening</Caption1>
          {props.context.liveClientPilot.whatIsHappening.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Why it matters</Caption1>
          {props.context.liveClientPilot.whyItMatters.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Known / unknown</Caption1>
          {props.context.liveClientPilot.known.map((line) => (
            <Caption1 key={`k-${line}`} style={{ display: 'block' }}>
              Known: {line}
            </Caption1>
          ))}
          {props.context.liveClientPilot.unknown.map((line) => (
            <Caption1 key={`u-${line}`} style={{ display: 'block' }}>
              Unknown: {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Next (OBSERVE / RECOMMEND / PREPARE)</Caption1>
          {props.context.liveClientPilot.nextActions.map((action) => (
            <Caption1 key={action.text} style={{ display: 'block' }}>
              [{action.authorityClass}{action.approvalRequired ? ' · approval' : ''}] {action.text}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Provenance</Caption1>
          {props.context.liveClientPilot.provenance.map((p) => (
            <Caption1 key={`${p.source}-${p.detail}`} style={{ display: 'block' }}>
              {p.source}: {p.detail}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Approval required</Caption1>
          {props.context.liveClientPilot.approvalRequired.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
        </div>
      ) : null}
      {copy.rows.length ? (
          <div>
            <Text weight="semibold">Recorded clients</Text>
            {copy.rows.slice(0, 8).map((row) => (
              <div key={row.clientCode} style={{ padding: '6px 0' }}>
                {row.href ? (
                  <Link to={row.href}>
                    <Text>{row.clientCode}</Text>
                  </Link>
                ) : (
                  <Text>{row.clientCode}</Text>
                )}
                {row.detail ? <Caption1 style={{ display: 'block' }}>{row.detail}</Caption1> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AtlasCard>
  );
}
