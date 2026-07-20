import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusChip } from '@hvcg/atlas-design-system';
import { Button, Checkbox, Text } from '@fluentui/react-components';
import {
  AdminShell,
  AdminSectionCard,
  DangerButton,
  useDangerConfirm,
  useAdminFeedback,
  Hint, NavButton } from '../components';
import { adminApi, useAdminStore } from '../model';

export function UserDetailPage() {
  const { userId = '' } = useParams();
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  const user = state.users.find((u) => u.id === userId);

  const [roleIds, setRoleIds] = useState(user?.roleIds || []);
  const [orgIds, setOrgIds] = useState(user?.organizationIds || []);
  const [clientCodes, setClientCodes] = useState(user?.clientCodes || []);

  const assignableRoles = useMemo(
    () => state.roles.filter((r) => !r.ownerOnlyAssign || user?.roleIds.includes(r.id)),
    [state.roles, user],
  );

  const knownClients = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of state.clientAccess) map.set(g.clientCode, g.clientName);
    map.set('CCB', 'Colorado Craft Beef');
    map.set('HVCG', 'High Value Capital Group');
    return [...map.entries()];
  }, [state.clientAccess]);

  if (!user) {
    return (
      <AdminShell title="User not found" subtitle="This user is not in the directory." backTo="/admin/users">
        <NavButton to="/admin/users" appearance="primary">
          Back to users
        </NavButton>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={user.displayName}
      subtitle={user.email}
      impact="Role, organization, and client access changes are audited. Owner/Administrator roles cannot be newly assigned here."
      systemConfig
      backTo="/admin/users"
    >
      {danger.dialog}
      <AdminSectionCard title="Status">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip
            label={user.status}
            tone={user.status === 'Active' ? 'success' : user.status === 'Invited' ? 'warning' : 'danger'}
          />
          {user.status === 'Invited' ? (
            <Button
              appearance="primary"
              onClick={() => {
                try {
                  adminApi.activateUser(user.id);
                  feedback.success('User activated');
                } catch (e) {
                  feedback.error(e);
                }
              }}
            >
              Activate
            </Button>
          ) : null}
          {user.status !== 'Disabled' ? (
            <DangerButton
              onClick={() =>
                danger.request({
                  title: `Disable ${user.displayName}?`,
                  impact: 'They lose Atlas access until reactivated.',
                  confirmLabel: 'Disable user',
                  onConfirm: () => {
                    try {
                      adminApi.disableUser(user.id);
                      feedback.success('User disabled');
                    } catch (e) {
                      feedback.error(e);
                    }
                  },
                })
              }
            >
              Disable user
            </DangerButton>
          ) : (
            <Button
              appearance="primary"
              onClick={() => {
                try {
                  adminApi.activateUser(user.id);
                  feedback.success('User activated');
                } catch (e) {
                  feedback.error(e);
                }
              }}
            >
              Reactivate
            </Button>
          )}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Assign roles" danger>
        <div style={{ display: 'grid', gap: 8 }}>
          {assignableRoles.map((r) => (
            <Checkbox
              key={r.id}
              label={`${r.name} (${r.entraGroup})`}
              checked={roleIds.includes(r.id)}
              disabled={Boolean(r.ownerOnlyAssign)}
              onChange={(_, d) => {
                setRoleIds((prev) =>
                  d.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                );
              }}
            />
          ))}
          <Hint>Owner and Administrator checkboxes stay locked when already held; new elevation is blocked.</Hint>
          <Button
            appearance="primary"
            onClick={() => {
              const next = roleIds.filter((id) => {
                const role = state.roles.find((r) => r.id === id);
                return role && (!role.ownerOnlyAssign || user.roleIds.includes(id));
              });
              danger.request({
                title: 'Update roles?',
                impact: 'This changes what the user can do across Atlas.',
                confirmLabel: 'Assign roles',
                onConfirm: () => {
                  try {
                    adminApi.assignRoles(user.id, next);
                    feedback.success('Roles updated');
                  } catch (e) {
                    feedback.error(e);
                  }
                },
              });
            }}
          >
            Save roles
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Assign organizations">
        <div style={{ display: 'grid', gap: 8 }}>
          {state.organizations.map((o) => (
            <Checkbox
              key={o.id}
              label={o.name}
              checked={orgIds.includes(o.id)}
              onChange={(_, d) => {
                setOrgIds((prev) => (d.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)));
              }}
            />
          ))}
          <Button
            appearance="primary"
            onClick={() => {
              try {
                adminApi.assignOrganizations(user.id, orgIds);
                feedback.success('Organizations updated');
              } catch (e) {
                feedback.error(e);
              }
            }}
          >
            Save organizations
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Client access" danger>
        <div style={{ display: 'grid', gap: 8 }}>
          {knownClients.map(([code, name]) => (
            <Checkbox
              key={code}
              label={`${name} (${code})`}
              checked={clientCodes.includes(code)}
              onChange={(_, d) => {
                setClientCodes((prev) =>
                  d.checked ? [...prev, code] : prev.filter((c) => c !== code),
                );
              }}
            />
          ))}
          <Button
            appearance="primary"
            onClick={() => {
              danger.request({
                title: 'Update client access?',
                impact: 'Controls which client workspaces this person can open.',
                confirmLabel: 'Save client access',
                onConfirm: () => {
                  try {
                    adminApi.setClientAccess(user.id, clientCodes);
                    feedback.success('Client access updated');
                  } catch (e) {
                    feedback.error(e);
                  }
                },
              });
            }}
          >
            Save client access
          </Button>
        </div>
      </AdminSectionCard>

      <Text size={200}>User id: {user.id}</Text>
    </AdminShell>
  );
}
