import type { ReactNode } from 'react';
import { AtlasCard, AccessDeniedState, PageLayout } from '@hvcg/atlas-design-system';
import { MessageBar, MessageBarBody, MessageBarTitle, Text } from '@fluentui/react-components';
import { atlasRole, canAccessAdmin } from '../../security/rbac';
import { ControlCenterChrome } from './ControlCenterChrome';

export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const role = atlasRole();
  if (!canAccessAdmin(role)) {
    return (
      <PageLayout title="Atlas Control Center" subtitle="Access restricted">
        <AccessDeniedState
          title="Control Center is limited to HVCG Owners and Administrators"
          description={`Your current role (${role}) cannot open system administration. Ask an HVCG Owner if you need access.`}
        />
      </PageLayout>
    );
  }
  return <>{children}</>;
}

export function AdminShell({
  title,
  subtitle,
  impact,
  systemConfig,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  impact?: string;
  systemConfig?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  /** @deprecated Control Center chrome provides navigation */
  backTo?: string;
  showBack?: boolean;
}) {
  return (
    <ControlCenterChrome title={title} subtitle={subtitle} actions={actions}>
      {impact ? (
        <MessageBar intent={systemConfig ? 'warning' : 'info'}>
          <MessageBarBody>
            <MessageBarTitle>{systemConfig ? 'System configuration' : 'What this changes'}</MessageBarTitle>
            {impact}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>{children}</div>
    </ControlCenterChrome>
  );
}

export function AdminSectionCard({
  title,
  subtitle,
  children,
  danger,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <AtlasCard
      title={title}
      subtitle={subtitle}
      style={
        danger
          ? {
              borderColor: 'var(--colorPaletteRedBorder1, #c50f1f)',
              boxShadow: 'inset 0 0 0 1px rgba(197, 15, 31, 0.35)',
            }
          : undefined
      }
    >
      {danger ? (
        <Text
          size={200}
          style={{ display: 'block', marginBottom: 12, color: 'var(--colorPaletteRedForeground1, #b10e1c)' }}
        >
          High-impact area — changes are audited and may require confirmation.
        </Text>
      ) : null}
      {children}
    </AtlasCard>
  );
}
