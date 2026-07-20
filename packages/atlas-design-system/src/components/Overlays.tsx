import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  ProgressBar,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Caption1,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

const useDrawer = makeStyles({
  surface: {
    width: 'min(420px, 100vw)',
  },
});

export interface AtlasDrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  position?: 'start' | 'end';
  footer?: ReactNode;
}

export function AtlasDrawer({
  open,
  title,
  children,
  onOpenChange,
  position = 'end',
  footer,
}: AtlasDrawerProps) {
  const s = useDrawer();
  return (
    <Drawer
      open={open}
      position={position}
      size="medium"
      onOpenChange={(_, d) => onOpenChange(d.open)}
    >
      <DrawerHeader className={s.surface}>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<DismissRegular />}
              onClick={() => onOpenChange(false)}
            />
          }
        >
          {title}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div style={{ display: 'grid', gap: 16, paddingBottom: footer ? 24 : 0 }}>{children}</div>
        {footer}
      </DrawerBody>
    </Drawer>
  );
}

export function AtlasTooltip({
  content,
  children,
  relationship = 'label',
}: {
  content: string;
  children: ReactNode;
  relationship?: 'label' | 'description';
}) {
  return (
    <Tooltip content={content} relationship={relationship} withArrow>
      {children as React.ReactElement}
    </Tooltip>
  );
}

export function AtlasProgress({
  value,
  label,
  max = 100,
}: {
  value: number;
  label?: string;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'grid', gap: 6 }} role="group" aria-label={label || 'Progress'}>
      {label ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Caption1>{label}</Caption1>
          <Caption1>{Math.round(pct)}%</Caption1>
        </div>
      ) : null}
      <ProgressBar value={pct / 100} thickness="large" />
    </div>
  );
}

const useSection = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
});

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const s = useSection();
  return (
    <div className={s.root}>
      <div className={s.row}>
        <div>
          <Text as="h2" size={500} weight="semibold">
            {title}
          </Text>
          {subtitle ? <Caption1>{subtitle}</Caption1> : null}
        </div>
        {actions}
      </div>
    </div>
  );
}

const useFilter = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  const s = useFilter();
  return (
    <div className={mergeClasses(s.root, className)} role="toolbar" aria-label="Filters">
      {children}
    </div>
  );
}

const useSystem = makeStyles({
  wrap: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: 'min(480px, 100%)',
  },
});

export function AccessDeniedState({
  title = 'Access denied',
  description = 'Your Microsoft account does not have permission for this area. Contact an HVCG administrator.',
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const s = useSystem();
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <EmptyState title={title} description={description} actions={actions} />
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'The page could not be loaded. Try again, or return to Executive Home.',
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const s = useSystem();
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <EmptyState title={title} description={description} actions={actions} />
      </div>
    </div>
  );
}
