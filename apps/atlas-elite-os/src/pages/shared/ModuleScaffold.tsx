import type { ReactNode } from 'react';
import { PageLayout, AtlasCard, EmptyState, SectionRail } from '@hvcg/atlas-design-system';
import {
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Caption1,
} from '@fluentui/react-components';
import type { DataAvailability } from '../../data/workspaces';

/**
 * Responsive contract (conceptual — desktop primary; no brand restyle).
 *
 * Viewport / content (NavShell 272px rail from 960px):
 * - ~640 phone: PageLayout already stacks title then actions.
 * - ~960 tablet: rail on; main ~688px. Header must wrap — never hide controls.
 * - ~1280 desktop: main ~1008px. Title + required actions stay on one row when they fit.
 * - ~1440 desktop+: main ~1168px. Same row; FieldGrid can hold four 220px tiles.
 *
 * NavShell overlap (not edited — Accessibility owns NavShell.tsx this pass):
 * Mobile nav overlay uses `inset: '56px 0 0 0'` (CommandBar minHeight 56px). CommandBar
 * `flexWrap`s; below ~640 the search row wraps and the bar grows past 56px, so the overlay
 * covers the wrapped command-bar controls. Fix later: bind overlay top to the actual bar
 * height (grid row / sticky header), not a hardcoded 56px.
 */

const useScaffold = makeStyles({
  chrome: {
    minWidth: 0,
    width: '100%',
    // PageLayout header is a <header> without flex-wrap; wrap so actions never clip.
    '& header': {
      flexWrap: 'wrap',
      minWidth: 0,
      width: '100%',
    },
    '& header > div:first-child': {
      minWidth: 0,
      flex: '1 1 220px',
    },
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    minWidth: 0,
    maxWidth: '100%',
    flex: '1 1 240px',
    overflow: 'visible',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minWidth: 0,
    width: '100%',
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
    gap: '14px',
    minWidth: 0,
    width: '100%',
  },
  section: {
    minWidth: 0,
    width: '100%',
    '& > section > div:first-child': {
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      minWidth: 0,
    },
  },
  sectionActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    minWidth: 0,
    maxWidth: '100%',
    flex: '1 1 160px',
    overflow: 'visible',
  },
});

export function PendingBanner({
  title = 'Verified financial data not yet connected',
  body = 'Fields show pending labels only. No fabricated figures are displayed.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <MessageBar intent="warning">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {body}
      </MessageBarBody>
    </MessageBar>
  );
}

export function AvailabilityLine({ availability }: { availability: DataAvailability }) {
  return <Caption1>Source: {availability}</Caption1>;
}

export function ModuleScaffold({
  title,
  subtitle,
  actions,
  children,
  emptyTitle,
  emptyDescription,
  showPendingBanner = false,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  showPendingBanner?: boolean;
}) {
  const s = useScaffold();
  return (
    <div className={s.chrome}>
      <PageLayout
        title={title}
        subtitle={subtitle}
        actions={actions ? <div className={s.actions}>{actions}</div> : undefined}
      >
        {showPendingBanner ? <PendingBanner /> : null}
        <div className={mergeClasses('atlas-stagger', s.body)}>{children}</div>
        {emptyTitle ? (
          <AtlasCard variant="quiet">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </AtlasCard>
        ) : null}
      </PageLayout>
    </div>
  );
}

export function FieldGrid({
  fields,
}: {
  fields: Array<{ label: string; value: string; availability?: DataAvailability }>;
}) {
  const s = useScaffold();
  return (
    <div className={s.fields}>
      {fields.map((f) => (
        <AtlasCard key={f.label} variant="quiet">
          <Caption1
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {f.label}
          </Caption1>
          <Text weight="semibold" size={400} style={{ display: 'block', marginTop: 8 }}>
            {f.value}
          </Text>
          {f.availability ? <AvailabilityLine availability={f.availability} /> : null}
        </AtlasCard>
      ))}
    </div>
  );
}

export function ModuleSection({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const s = useScaffold();
  return (
    <div className={s.section}>
      <SectionRail
        title={title}
        subtitle={subtitle}
        actions={actions ? <div className={s.sectionActions}>{actions}</div> : undefined}
      >
        {children}
      </SectionRail>
    </div>
  );
}
