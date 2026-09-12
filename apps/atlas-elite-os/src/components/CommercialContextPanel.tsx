import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';
import type {
  DeskCommercialContext,
  LiveClientPilotBrief,
  OperatorCommercialContext,
} from '../integrations/hub/pmApi';
import { commercialContextCopy } from './commercialContextView';

function honestyTone(value?: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const v = (value || '').toUpperCase();
  if (v === 'VERIFIED' || v === 'CONFIRMED' || v === 'INDEXED') return 'info';
  if (v === 'PARTIAL') return 'warning';
  if (v === 'MISSING' || v === 'NOT_CERTIFIED') return 'neutral';
  return 'neutral';
}

function QueueBlock({
  label,
  items,
}: {
  label: string;
  items?: Array<{ id: string; title: string; classification: string }>;
}) {
  const rows = items || [];
  return (
    <div>
      <Caption1 style={{ display: 'block', marginTop: 8 }}>
        {label} · {rows.length ? `${rows.length} entitled` : 'honest empty'}
      </Caption1>
      {rows.length ? (
        rows.slice(0, 5).map((row) => (
          <Caption1 key={row.id} style={{ display: 'block' }}>
            [{row.classification}] {row.title}
          </Caption1>
        ))
      ) : (
        <Caption1 style={{ display: 'block' }}>No entitled {label.toLowerCase()} items.</Caption1>
      )}
    </div>
  );
}

export function CommercialContextPanel(props: {
  context?: DeskCommercialContext | OperatorCommercialContext | null;
  loading?: boolean;
  error?: string | null;
  pilot?: LiveClientPilotBrief | null;
}) {
  const copy = commercialContextCopy(props.context);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const pilot =
    props.pilot ||
    (props.context && 'liveClientPilot' in props.context ? props.context.liveClientPilot : undefined);
  return (
    <AtlasCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text weight="semibold">{copy.title}</Text>
          <Caption1 style={{ display: 'block' }}>{copy.subtitle}</Caption1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusChip label="Outbound OFF" tone="neutral" />
          <StatusChip label="Paid ads OFF" tone="neutral" />
          {pilot?.operatingPosture ? (
            <StatusChip label={pilot.operatingPosture.replace(/_/g, ' ')} tone="info" />
          ) : null}
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
        {pilot ? (
        <div>
          <Text weight="semibold">Live Client operating brief</Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
            <StatusChip label={`Finance ${pilot.financialContext || 'unknown'}`} tone={honestyTone(pilot.financialContext)} size="sm" />
            <StatusChip label={`Growth ${pilot.growthContext || 'unknown'}`} tone={honestyTone(pilot.growthContext)} size="sm" />
            <StatusChip label={`Capital ${pilot.capitalContext || 'unknown'}`} tone={honestyTone(pilot.capitalContext)} size="sm" />
            <StatusChip label={`Contacts ${pilot.contactsCompleteness || 'unknown'}`} tone={honestyTone(pilot.contactsCompleteness)} size="sm" />
            {pilot.writePolicy === 'read_only' ? <StatusChip label="Read-only" tone="warning" size="sm" /> : null}
          </div>
          <Caption1 style={{ display: 'block' }}>What is happening</Caption1>
          {pilot.whatIsHappening.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Why it matters</Caption1>
          {pilot.whyItMatters.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>What changed</Caption1>
          {pilot.whatChanged.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>What Atlas knows / does not know</Caption1>
          {pilot.known.slice(0, 6).map((line) => (
            <Caption1 key={`k-${line}`} style={{ display: 'block' }}>
              Known: {line}
            </Caption1>
          ))}
          {pilot.unknown.slice(0, 6).map((line) => (
            <Caption1 key={`u-${line}`} style={{ display: 'block' }}>
              Unknown: {line}
            </Caption1>
          ))}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Next (OBSERVE / RECOMMEND / PREPARE)</Caption1>
          {pilot.nextActions.map((action) => (
            <Caption1 key={action.text} style={{ display: 'block' }}>
              [{action.authorityClass}{action.approvalRequired ? ' · approval' : ''}] {action.text}
            </Caption1>
          ))}
          <QueueBlock label="Needs action" items={pilot.queues?.needsAction} />
          <QueueBlock label="Waiting" items={pilot.queues?.waiting} />
          <QueueBlock label="Overdue" items={pilot.queues?.overdue} />
          <QueueBlock label="Blocked" items={pilot.queues?.blocked} />
          <QueueBlock label="Decision required" items={pilot.queues?.decisionRequired} />
          <QueueBlock label="At risk" items={pilot.queues?.atRisk} />
          <QueueBlock label="Ready" items={pilot.queues?.ready} />
          <QueueBlock label="Outcomes" items={pilot.queues?.outcomes} />
          {pilot.contactCandidates?.length ? (
            <div>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>
                Contact candidates (not created)
              </Caption1>
              {pilot.contactCandidates.slice(0, 6).map((c) => (
                <Caption1 key={c.sourceId} style={{ display: 'block' }}>
                  {c.displayName || c.email} · {c.email} · {c.source} · {c.writeStatus}
                </Caption1>
              ))}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            <Button appearance="secondary" size="small" onClick={() => setProvenanceOpen((open) => !open)}>
              {provenanceOpen ? 'Hide provenance' : 'Show provenance'}
            </Button>
          </div>
          {provenanceOpen ? (
            <>
              <Caption1 style={{ display: 'block', marginTop: 8 }}>Provenance</Caption1>
              {pilot.provenance.map((p) => (
                <Caption1 key={`${p.source}-${p.detail}`} style={{ display: 'block' }}>
                  {p.source}: {p.detail}
                </Caption1>
              ))}
            </>
          ) : (
            <Caption1 style={{ display: 'block', marginTop: 8 }}>
              Provenance is available — expand to inspect source detail. Atlas does not hide missing domains.
            </Caption1>
          )}
          <Caption1 style={{ display: 'block', marginTop: 8 }}>Approval required</Caption1>
          {pilot.approvalRequired.map((line) => (
            <Caption1 key={line} style={{ display: 'block' }}>
              {line}
            </Caption1>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No operating brief on this payload"
          description="Hub did not attach a Live Client operating brief. This is not fabricated completeness."
          density="compact"
          align="start"
        />
      )}
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
