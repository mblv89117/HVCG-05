import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusChip } from '@hvcg/atlas-design-system';
import { Button, Checkbox, Text } from '@fluentui/react-components';
import {
  AdminShell,
  AdminSectionCard,
  useDangerConfirm,
  useAdminFeedback,
  Hint, NavButton } from '../components';
import {
  adminApi,
  useAdminStore,
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from '../model';

export function RoleDetailPage() {
  const { roleId = '' } = useParams();
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  const role = state.roles.find((r) => r.id === roleId);
  const [keys, setKeys] = useState<PermissionKey[]>(role?.permissionKeys || []);

  if (!role) {
    return (
      <AdminShell title="Role not found" subtitle="Unknown role." backTo="/admin/roles-permissions">
        <NavButton to="/admin/roles-permissions" appearance="primary">
          Back to roles
        </NavButton>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={role.name}
      subtitle={role.entraGroup}
      impact="Permission changes apply to everyone with this role. Unrestricted grants are not available."
      systemConfig
      backTo="/admin/roles-permissions"
    >
      {danger.dialog}
      <AdminSectionCard title="About">
        <Text>{role.description}</Text>
        {role.ownerOnlyAssign ? (
          <div style={{ marginTop: 8 }}>
            <StatusChip label="Owner-only assign" tone="warning" />
          </div>
        ) : null}
      </AdminSectionCard>
      <AdminSectionCard title="Permissions" danger>
        <Hint>Only catalog capabilities can be toggled. There is no “select all”.</Hint>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {ALL_PERMISSION_KEYS.map((key) => {
            const meta = PERMISSION_CATALOG[key];
            return (
              <Checkbox
                key={key}
                checked={keys.includes(key)}
                label={`${meta.label}${meta.elevating ? ' (elevating)' : ''}`}
                onChange={(_, d) => {
                  setKeys((prev) => (d.checked ? [...prev, key] : prev.filter((k) => k !== key)));
                }}
              />
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <Button
            appearance="primary"
            onClick={() => {
              danger.request({
                title: `Update permissions for ${role.name}?`,
                impact: 'This is a high-impact change and will be audited.',
                confirmLabel: 'Save permissions',
                onConfirm: () => {
                  try {
                    adminApi.setRolePermissions(role.id, keys);
                    feedback.success('Permissions updated');
                  } catch (e) {
                    feedback.error(e);
                  }
                },
              });
            }}
          >
            Save permissions
          </Button>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}
