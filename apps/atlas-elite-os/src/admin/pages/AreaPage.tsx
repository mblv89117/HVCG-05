import { useMemo, useState } from 'react';
import { DataTable, StatusChip } from '@hvcg/atlas-design-system';
import {
  Button,
  Input,
  Text,
  Textarea,
  Switch,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  AdminShell,
  AdminSectionCard,
  AdminSearch,
  SettingsForm,
  FormField,
  FormRow,
  DangerButton,
  useDangerConfirm,
  useAdminFeedback,
  Hint, NavButton } from '../components';
import {
  adminApi,
  getArea,
  useAdminStore,
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
  type AdminAreaId,
  type ReferenceItem,
} from '../model';

function filterRows<T>(rows: T[], query: string, pick: (row: T) => string) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => pick(r).toLowerCase().includes(q));
}

function ReferenceArea({
  areaId,
  title,
  collection,
  impact,
  systemConfig,
}: {
  areaId: AdminAreaId;
  title: string;
  collection:
    | 'statuses'
    | 'categories'
    | 'referralSources'
    | 'serviceTypes'
    | 'engagementTypes'
    | 'documentCategories';
  impact: string;
  systemConfig?: boolean;
}) {
  const state = useAdminStore();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ReferenceItem>({
    id: '',
    label: '',
    code: '',
    sortOrder: state[collection].length + 1,
    active: true,
  });
  const rows = filterRows(state[collection], query, (r) => `${r.label} ${r.code} ${r.group || ''}`);

  return (
    <AdminShell title={title} subtitle={`Maintain ${title.toLowerCase()} used across Atlas.`} impact={impact} systemConfig={systemConfig}>
      <AdminSearch value={query} onChange={setQuery} placeholder="Search items…" label="Search items" />
      <AdminSectionCard title="Current values">
        <DataTable
          rows={rows}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'label', header: 'Label', render: (r) => r.label },
            { key: 'code', header: 'Code', render: (r) => r.code },
            {
              key: 'active',
              header: 'Active',
              render: (r) => <StatusChip label={r.active ? 'Active' : 'Inactive'} tone={r.active ? 'success' : 'neutral'} />,
            },
            {
              key: 'edit',
              header: '',
              render: (r) => (
                <Button
                  size="small"
                  appearance="subtle"
                  onClick={() =>
                    setDraft({ ...r })
                  }
                >
                  Edit
                </Button>
              ),
            },
          ]}
          emptyTitle="No items"
          emptyDescription="Add a value below."
        />
      </AdminSectionCard>
      <AdminSectionCard title={draft.id ? 'Edit item' : 'Add item'}>
        <SettingsForm
          onSave={() => {
            const id = draft.id || `ref-${Math.random().toString(36).slice(2, 8)}`;
            adminApi.upsertReference(collection, { ...draft, id, label: draft.label.trim(), code: draft.code.trim() });
            setDraft({ id: '', label: '', code: '', sortOrder: state[collection].length + 2, active: true });
          }}
          saveLabel={draft.id ? 'Update item' : 'Add item'}
        >
          <FormRow>
            <FormField label="Label" hint="What people see in forms.">
              <Input value={draft.label} onChange={(_, d) => setDraft((s) => ({ ...s, label: d.value }))} />
            </FormField>
            <FormField label="Code" hint="Stable short code (not shown as JSON).">
              <Input value={draft.code} onChange={(_, d) => setDraft((s) => ({ ...s, code: d.value }))} />
            </FormField>
          </FormRow>
          <FormField label="Active">
            <Switch
              checked={draft.active}
              onChange={(_, d) => setDraft((s) => ({ ...s, active: d.checked }))}
              label={draft.active ? 'Shown in new forms' : 'Hidden from new forms'}
            />
          </FormField>
        </SettingsForm>
      </AdminSectionCard>
      <Hint>Area id: {areaId}</Hint>
    </AdminShell>
  );
}

function UsersArea() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  const [query, setQuery] = useState('');
  const [invite, setInvite] = useState({
    displayName: '',
    email: '',
    roleId: 'role-pm',
    organizationId: 'org-hvcg',
  });
  const rows = filterRows(state.users, query, (u) => `${u.displayName} ${u.email} ${u.status}`);
  const assignableRoles = state.roles.filter((r) => !r.ownerOnlyAssign);

  return (
    <AdminShell
      title="Users"
      subtitle="Invite, activate, and disable people who use Atlas."
      impact="Disabled users lose product access. Invites create pending accounts until activated."
      systemConfig
    >
      {danger.dialog}
      <AdminSearch value={query} onChange={setQuery} placeholder="Search users…" label="Search users" />
      <AdminSectionCard title="Directory" danger>
        <DataTable
          rows={rows}
          getRowKey={(u) => u.id}
          columns={[
            { key: 'name', header: 'Name', render: (u) => u.displayName },
            { key: 'email', header: 'Email', render: (u) => u.email },
            {
              key: 'status',
              header: 'Status',
              render: (u) => (
                <StatusChip
                  label={u.status}
                  tone={u.status === 'Active' ? 'success' : u.status === 'Invited' ? 'warning' : 'danger'}
                />
              ),
            },
            {
              key: 'roles',
              header: 'Roles',
              render: (u) =>
                u.roleIds
                  .map((id) => state.roles.find((r) => r.id === id)?.name || id)
                  .join(', '),
            },
            {
              key: 'actions',
              header: '',
              render: (u) => (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <NavButton to={`/admin/users/${u.id}`} appearance="subtle" size="small">
                    Open
                  </NavButton>
                  {u.status === 'Invited' ? (
                    <Button
                      size="small"
                      appearance="primary"
                      onClick={() => {
                        try {
                          adminApi.activateUser(u.id);
                          feedback.success('User activated');
                        } catch (e) {
                          feedback.error(e);
                        }
                      }}
                    >
                      Activate
                    </Button>
                  ) : null}
                  {u.status !== 'Disabled' ? (
                    <DangerButton
                      onClick={() =>
                        danger.request({
                          title: `Disable ${u.displayName}?`,
                          impact: 'They will no longer be able to sign in to Atlas administration or assigned workspaces.',
                          confirmLabel: 'Disable user',
                          onConfirm: () => {
                            try {
                              adminApi.disableUser(u.id);
                              feedback.success('User disabled');
                            } catch (e) {
                              feedback.error(e);
                            }
                          },
                        })
                      }
                    >
                      Disable
                    </DangerButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Invite user" danger>
        <SettingsForm
          onSave={() => {
            adminApi.inviteUser({
              displayName: invite.displayName,
              email: invite.email,
              roleIds: [invite.roleId],
              organizationIds: [invite.organizationId],
            });
            setInvite({ displayName: '', email: '', roleId: 'role-pm', organizationId: 'org-hvcg' });
          }}
          saveLabel="Send invite"
        >
          <FormRow>
            <FormField label="Display name">
              <Input
                value={invite.displayName}
                onChange={(_, d) => setInvite((s) => ({ ...s, displayName: d.value }))}
              />
            </FormField>
            <FormField label="Email">
              <Input
                value={invite.email}
                onChange={(_, d) => setInvite((s) => ({ ...s, email: d.value }))}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Role" hint="Owner and Administrator cannot be assigned from invite.">
              <Dropdown
                value={assignableRoles.find((r) => r.id === invite.roleId)?.name}
                selectedOptions={[invite.roleId]}
                onOptionSelect={(_, d) =>
                  setInvite((s) => ({ ...s, roleId: String(d.optionValue || s.roleId) }))
                }
              >
                {assignableRoles.map((r) => (
                  <Option key={r.id} value={r.id}>
                    {r.name}
                  </Option>
                ))}
              </Dropdown>
            </FormField>
            <FormField label="Organization">
              <Dropdown
                value={state.organizations.find((o) => o.id === invite.organizationId)?.name}
                selectedOptions={[invite.organizationId]}
                onOptionSelect={(_, d) =>
                  setInvite((s) => ({ ...s, organizationId: String(d.optionValue || s.organizationId) }))
                }
              >
                {state.organizations.map((o) => (
                  <Option key={o.id} value={o.id}>
                    {o.name}
                  </Option>
                ))}
              </Dropdown>
            </FormField>
          </FormRow>
        </SettingsForm>
      </AdminSectionCard>
    </AdminShell>
  );
}

function RolesArea() {
  const state = useAdminStore();
  return (
    <AdminShell
      title="Roles"
      subtitle="Named roles mapped to Entra groups and permission sets."
      impact="Changing a role’s permissions affects everyone who holds that role."
      systemConfig
    >
      <AdminSectionCard title="Role catalog" danger>
        <DataTable
          rows={state.roles}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Role', render: (r) => r.name },
            { key: 'entra', header: 'Entra group', render: (r) => r.entraGroup },
            {
              key: 'perms',
              header: 'Permissions',
              render: (r) => `${r.permissionKeys.length} capabilities`,
            },
            {
              key: 'open',
              header: '',
              render: (r) => (
                <NavButton to={`/admin/roles/${r.id}`} appearance="primary" size="small">
                  Manage
                </NavButton>
              ),
            },
          ]}
        />
      </AdminSectionCard>
      <Hint>Entra remains the identity source of truth. Atlas roles map to HVCG-Role-* groups.</Hint>
    </AdminShell>
  );
}

function PermissionsArea() {
  const state = useAdminStore();
  return (
    <AdminShell
      title="Permissions"
      subtitle="Approved capability catalog. Unrestricted grants are not allowed."
      impact="You can only assign permissions from this catalog to roles."
      systemConfig
    >
      <AdminSectionCard title="Capability catalog">
        <DataTable
          rows={ALL_PERMISSION_KEYS.map((k) => ({ key: k, ...PERMISSION_CATALOG[k] }))}
          getRowKey={(r) => r.key}
          columns={[
            { key: 'label', header: 'Permission', render: (r) => r.label },
            { key: 'desc', header: 'Description', render: (r) => r.description },
            {
              key: 'elev',
              header: 'Elevating',
              render: (r) =>
                r.elevating ? <StatusChip label="Elevating" tone="warning" /> : <StatusChip label="Standard" tone="neutral" />,
            },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Edit via roles">
        <Text>Open a role to toggle capabilities. There is no “grant all” control.</Text>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {state.roles.map((r) => (
            <NavButton to={`/admin/roles/${r.id}`} appearance="secondary">
              {r.name}
            </NavButton>
          ))}
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

function OrganizationsArea() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  return (
    <AdminShell
      title="Organizations"
      subtitle="Legal entities that own business units and users."
      impact="Deactivating an organization blocks new assignments to it."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Organizations" danger>
        <DataTable
          rows={state.organizations}
          getRowKey={(o) => o.id}
          columns={[
            { key: 'name', header: 'Name', render: (o) => o.name },
            { key: 'code', header: 'Code', render: (o) => o.code },
            {
              key: 'active',
              header: 'Status',
              render: (o) => <StatusChip label={o.active ? 'Active' : 'Inactive'} tone={o.active ? 'success' : 'neutral'} />,
            },
            {
              key: 'act',
              header: '',
              render: (o) =>
                o.active ? (
                  <DangerButton
                    onClick={() =>
                      danger.request({
                        title: `Deactivate ${o.name}?`,
                        impact: 'New users should not be assigned to an inactive organization.',
                        confirmLabel: 'Deactivate',
                        onConfirm: () => {
                          try {
                            adminApi.setOrganizationActive(o.id, false);
                            feedback.success('Organization deactivated');
                          } catch (e) {
                            feedback.error(e);
                          }
                        },
                      })
                    }
                  >
                    Deactivate
                  </DangerButton>
                ) : (
                  <Button
                    appearance="primary"
                    onClick={() => {
                      try {
                        adminApi.setOrganizationActive(o.id, true);
                        feedback.success('Organization activated');
                      } catch (e) {
                        feedback.error(e);
                      }
                    }}
                  >
                    Activate
                  </Button>
                ),
            },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function ClientsArea() {
  const state = useAdminStore();
  const [query, setQuery] = useState('');
  const rows = filterRows(
    state.clientAccess,
    query,
    (c) =>
      `${c.clientName} ${c.clientCode} ${state.users.find((u) => u.id === c.userId)?.displayName || ''}`,
  );
  return (
    <AdminShell
      title="Client access"
      subtitle="Which staff can open each client workspace."
      impact="Grants control visibility of client documents and delivery data."
      systemConfig
    >
      <AdminSearch value={query} onChange={setQuery} placeholder="Search grants…" label="Search grants" />
      <AdminSectionCard title="Access grants" danger>
        <DataTable
          rows={rows}
          getRowKey={(c) => c.id}
          columns={[
            { key: 'client', header: 'Client', render: (c) => `${c.clientName} (${c.clientCode})` },
            {
              key: 'user',
              header: 'User',
              render: (c) => state.users.find((u) => u.id === c.userId)?.displayName || c.userId,
            },
            { key: 'level', header: 'Access', render: (c) => c.accessLevel },
            {
              key: 'open',
              header: '',
              render: (c) => (
                <NavButton to={`/admin/users/${c.userId}`} appearance="subtle" size="small">
                  Manage on user
                </NavButton>
              ),
            },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function TeamsArea() {
  const state = useAdminStore();
  return (
    <AdminShell title="Teams" subtitle="Working groups inside a business unit." impact="Team membership can drive default assignments.">
      <AdminSectionCard title="Teams">
        <DataTable
          rows={state.teams}
          getRowKey={(t) => t.id}
          columns={[
            { key: 'name', header: 'Team', render: (t) => t.name },
            {
              key: 'bu',
              header: 'Business unit',
              render: (t) => state.businessUnits.find((b) => b.id === t.businessUnitId)?.name || t.businessUnitId,
            },
            {
              key: 'members',
              header: 'Members',
              render: (t) =>
                t.memberUserIds
                  .map((id) => state.users.find((u) => u.id === id)?.displayName || id)
                  .join(', ') || '—',
            },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function BusinessUnitsArea() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  return (
    <AdminShell
      title="Business units"
      subtitle="Divisions under an organization."
      impact="Used for reporting rollups and team placement."
      systemConfig
    >
      <AdminSectionCard title="Business units">
        <DataTable
          rows={state.businessUnits}
          getRowKey={(b) => b.id}
          columns={[
            { key: 'name', header: 'Name', render: (b) => b.name },
            {
              key: 'org',
              header: 'Organization',
              render: (b) => state.organizations.find((o) => o.id === b.organizationId)?.name || b.organizationId,
            },
            {
              key: 'active',
              header: 'Status',
              render: (b) => <StatusChip label={b.active ? 'Active' : 'Inactive'} tone={b.active ? 'success' : 'neutral'} />,
            },
            {
              key: 'toggle',
              header: '',
              render: (b) => (
                <Button
                  size="small"
                  onClick={() => {
                    try {
                      adminApi.setBusinessUnitActive(b.id, !b.active);
                      feedback.success(b.active ? 'Deactivated' : 'Activated');
                    } catch (e) {
                      feedback.error(e);
                    }
                  }}
                >
                  {b.active ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function FeatureFlagsArea() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  return (
    <AdminShell
      title="Feature flags"
      subtitle="Approved product features that can be turned on or off."
      impact="Outbound and premium features require confirmation before enabling."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Flags" danger>
        <div style={{ display: 'grid', gap: 16 }}>
          {state.featureFlags.map((flag) => (
            <div
              key={flag.key}
              style={{
                display: 'grid',
                gap: 8,
                padding: 12,
                borderRadius: 8,
                border: flag.highImpact
                  ? '1px solid rgba(197, 15, 31, 0.45)'
                  : '1px solid var(--colorNeutralStroke2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Text weight="semibold">{flag.label}</Text>
                  <Text size={200} style={{ display: 'block' }}>
                    {flag.description}
                  </Text>
                  <Hint>{flag.impactSummary}</Hint>
                </div>
                <Switch
                  checked={flag.value}
                  label={flag.value ? 'On' : 'Off'}
                  onChange={(_, d) => {
                    const next = d.checked;
                    const apply = () => {
                      try {
                        adminApi.setFeatureFlag(flag.key, next);
                        feedback.success(`${flag.label} ${next ? 'enabled' : 'disabled'}`);
                      } catch (e) {
                        feedback.error(e);
                      }
                    };
                    if (flag.highImpact && next) {
                      danger.request({
                        title: `Enable ${flag.label}?`,
                        impact: flag.impactSummary,
                        confirmLabel: 'Enable feature',
                        onConfirm: apply,
                      });
                    } else {
                      apply();
                    }
                  }}
                />
              </div>
              <CaptionSafeDefault value={flag.safeDefault} />
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

function CaptionSafeDefault({ value }: { value: boolean }) {
  return <Hint>Safe default: {value ? 'On' : 'Off'}</Hint>;
}

function IntegrationsArea() {
  const state = useAdminStore();
  const failed = state.integrations.filter((i) => i.status === 'Failed' || i.status === 'Degraded');
  return (
    <AdminShell
      title="Integrations"
      subtitle="Health of connected Microsoft services. Credentials are never shown."
      impact="Review failures here. Rotate secrets in Entra or Key Vault — not in this screen."
      systemConfig
    >
      <AdminSectionCard title="Failed or degraded" danger>
        <DataTable
          rows={failed}
          getRowKey={(i) => i.id}
          emptyTitle="No failures"
          emptyDescription="All watched integrations are healthy."
          columns={[
            { key: 'name', header: 'Integration', render: (i) => i.name },
            {
              key: 'status',
              header: 'Status',
              render: (i) => (
                <StatusChip
                  label={i.status}
                  tone={i.status === 'Failed' ? 'danger' : i.status === 'Degraded' ? 'warning' : 'success'}
                />
              ),
            },
            { key: 'msg', header: 'Last failure', render: (i) => i.lastFailureMessage || '—' },
            { key: 'count', header: 'Failed runs', render: (i) => String(i.failedRunCount) },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="All integrations">
        <DataTable
          rows={state.integrations}
          getRowKey={(i) => i.id}
          columns={[
            { key: 'name', header: 'Integration', render: (i) => i.name },
            {
              key: 'status',
              header: 'Status',
              render: (i) => <StatusChip label={i.status} tone={i.status === 'Healthy' ? 'success' : 'warning'} />,
            },
            {
              key: 'secrets',
              header: 'Secrets',
              render: (i) => (i.secretsConfigured ? 'Configured (hidden)' : 'Not configured'),
            },
            { key: 'checked', header: 'Last checked', render: (i) => new Date(i.lastCheckedAt).toLocaleString() },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function AuditArea() {
  const state = useAdminStore();
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const rows = useMemo(() => {
    return state.audit.filter((e) => {
      const q = query.trim().toLowerCase();
      const a = actor.trim().toLowerCase();
      const matchQ =
        !q ||
        e.summary.toLowerCase().includes(q) ||
        e.areaId.includes(q) ||
        e.action.includes(q);
      const matchA = !a || e.actor.toLowerCase().includes(a);
      return matchQ && matchA;
    });
  }, [state.audit, query, actor]);

  return (
    <AdminShell
      title="Audit Center"
      subtitle="Read-only log of administrative changes."
      impact="View only. Complete trail of Control Center mutations in this session."
      systemConfig
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <AdminSearch value={query} onChange={setQuery} placeholder="Search summary or area…" label="Search" />
        <FormField label="Actor">
          <Input value={actor} onChange={(_, d) => setActor(d.value)} placeholder="Filter by actor" />
        </FormField>
      </div>
      <AdminSectionCard title="Events">
        <DataTable
          rows={rows}
          getRowKey={(e) => e.id}
          columns={[
            { key: 'at', header: 'When', render: (e) => new Date(e.at).toLocaleString() },
            { key: 'actor', header: 'Actor', render: (e) => e.actor },
            { key: 'area', header: 'Area', render: (e) => e.areaId },
            { key: 'action', header: 'Action', render: (e) => e.action },
            { key: 'summary', header: 'Summary', render: (e) => e.summary },
            {
              key: 'impact',
              header: 'Impact',
              render: (e) =>
                e.highImpact ? <StatusChip label="High" tone="danger" /> : <StatusChip label="Normal" tone="neutral" />,
            },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

function NotificationsArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.notifications);
  return (
    <AdminShell
      title="Notification preferences"
      subtitle="Reminders and alert defaults for the firm."
      impact="Changes when people are notified about renewals and documents."
    >
      <AdminSectionCard title="Preferences">
        <SettingsForm
          onSave={() => {
            adminApi.updateNotifications({
              ...draft,
              renewalReminderDays: String(draft.renewalReminderDays)
                .split(',')
                .map(Number)
                .filter((n) => !Number.isNaN(n)),
              documentReminderBusinessDays: draft.documentReminderBusinessDays,
            });
          }}
        >
          <FormField
            label="Renewal reminder days"
            hint="Comma-separated days before renewal (safe default: 60, 30, 14)."
          >
            <Input
              value={draft.renewalReminderDays.join(', ')}
              onChange={(_, d) =>
                setDraft((s) => ({
                  ...s,
                  renewalReminderDays: d.value.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)),
                }))
              }
            />
          </FormField>
          <FormField label="Email digest">
            <Switch
              checked={draft.emailDigestEnabled}
              onChange={(_, d) => setDraft((s) => ({ ...s, emailDigestEnabled: d.checked }))}
              label={draft.emailDigestEnabled ? 'Enabled' : 'Disabled'}
            />
          </FormField>
          <FormField label="Executive escalation alerts">
            <Switch
              checked={draft.executiveEscalationAlerts}
              onChange={(_, d) => setDraft((s) => ({ ...s, executiveEscalationAlerts: d.checked }))}
              label={draft.executiveEscalationAlerts ? 'Enabled' : 'Disabled'}
            />
          </FormField>
          <FormField label="Teams notifications" hint="Keep off until owner approves live notify paths.">
            <Switch
              checked={draft.teamsNotifyEnabled}
              onChange={(_, d) => setDraft((s) => ({ ...s, teamsNotifyEnabled: d.checked }))}
              label={draft.teamsNotifyEnabled ? 'Enabled' : 'Disabled'}
            />
          </FormField>
        </SettingsForm>
      </AdminSectionCard>
    </AdminShell>
  );
}

function WorkflowArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.workflow);
  const danger = useDangerConfirm();
  const feedback = useAdminFeedback();

  function saveWorkflow() {
    try {
      adminApi.updateWorkflow(draft);
      feedback.success('Workflow settings saved');
    } catch (e) {
      feedback.error(e);
    }
  }

  return (
    <AdminShell
      title="Workflow settings"
      subtitle="Automation and escalation preferences."
      impact="Can create tasks automatically and block live client communications."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Workflow" danger>
        <div style={{ display: 'grid', gap: 16 }}>
          <FormField label="Auto-create renewal tasks">
            <Switch
              checked={draft.autoCreateRenewalTasks}
              onChange={(_, d) => setDraft((s) => ({ ...s, autoCreateRenewalTasks: d.checked }))}
            />
          </FormField>
          <FormField label="Require executive clear for attention flags">
            <Switch
              checked={draft.requireExecutiveClearForAttention}
              onChange={(_, d) => setDraft((s) => ({ ...s, requireExecutiveClearForAttention: d.checked }))}
            />
          </FormField>
          <FormField label="Block live client communications" hint="Safe default: on.">
            <Switch
              checked={draft.blockLiveClientComms}
              onChange={(_, d) => setDraft((s) => ({ ...s, blockLiveClientComms: d.checked }))}
              label={draft.blockLiveClientComms ? 'Blocked (safe)' : 'Allowed (high impact)'}
            />
          </FormField>
          <Button
            appearance="primary"
            onClick={() => {
              if (!draft.blockLiveClientComms) {
                danger.request({
                  title: 'Allow live client communications?',
                  impact: 'Turning this off removes the safety block on live client outbound messages.',
                  confirmLabel: 'Remove block',
                  onConfirm: saveWorkflow,
                });
                return;
              }
              saveWorkflow();
            }}
          >
            Save changes
          </Button>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

function FinancialArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.financial);
  const danger = useDangerConfirm();
  const feedback = useAdminFeedback();

  function saveFinancial() {
    try {
      adminApi.updateFinancial(draft);
      feedback.success('Financial settings saved');
    } catch (e) {
      feedback.error(e);
    }
  }

  return (
    <AdminShell
      title="Financial settings"
      subtitle="Currency and fee visibility defaults."
      impact="May change who can see fee and invoice amounts."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Financial defaults" danger>
        <div style={{ display: 'grid', gap: 16 }}>
          <FormRow>
            <FormField label="Currency">
              <Input value={draft.currency} onChange={(_, d) => setDraft((s) => ({ ...s, currency: d.value.toUpperCase() }))} />
            </FormField>
            <FormField label="Invoice due days">
              <Input
                type="number"
                value={String(draft.invoiceDueDaysDefault)}
                onChange={(_, d) => setDraft((s) => ({ ...s, invoiceDueDaysDefault: Number(d.value) || 0 }))}
              />
            </FormField>
          </FormRow>
          <FormField label="Show success fees to non-finance">
            <Switch
              checked={draft.showSuccessFeesToNonFinance}
              onChange={(_, d) => setDraft((s) => ({ ...s, showSuccessFeesToNonFinance: d.checked }))}
            />
          </FormField>
          <FormField label="Retainers visible to ops">
            <Switch
              checked={draft.retainersVisibleToOps}
              onChange={(_, d) => setDraft((s) => ({ ...s, retainersVisibleToOps: d.checked }))}
            />
          </FormField>
          <Button
            appearance="primary"
            onClick={() => {
              if (draft.showSuccessFeesToNonFinance) {
                danger.request({
                  title: 'Show success fees to non-finance roles?',
                  impact: 'Sensitive fee amounts become visible outside finance viewers.',
                  confirmLabel: 'Allow visibility',
                  onConfirm: saveFinancial,
                });
                return;
              }
              saveFinancial();
            }}
          >
            Save changes
          </Button>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

function CapitalArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.capital);
  return (
    <AdminShell
      title="Capital-advisory settings"
      subtitle="Capital desk defaults and outreach guards."
      impact="Affects capital package defaults and lender outreach controls."
      systemConfig
    >
      <AdminSectionCard title="Capital desk" danger>
        <SettingsForm onSave={() => adminApi.updateCapital(draft)}>
          <FormField label="Desk enabled">
            <Switch checked={draft.deskEnabled} onChange={(_, d) => setDraft((s) => ({ ...s, deskEnabled: d.checked }))} />
          </FormField>
          <FormField label="Default package type">
            <Input
              value={draft.defaultPackageType}
              onChange={(_, d) => setDraft((s) => ({ ...s, defaultPackageType: d.value }))}
            />
          </FormField>
          <FormField label="Require Owner for lender outreach" hint="Safe default: on.">
            <Switch
              checked={draft.requireOwnerForLenderOutreach}
              onChange={(_, d) => setDraft((s) => ({ ...s, requireOwnerForLenderOutreach: d.checked }))}
            />
          </FormField>
        </SettingsForm>
      </AdminSectionCard>
    </AdminShell>
  );
}

function EvaArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.eva);
  const danger = useDangerConfirm();
  const feedback = useAdminFeedback();
  return (
    <AdminShell
      title="Enterprise-value assumptions"
      subtitle="Default multiples and rates for EVA worksheets."
      impact="Changes defaults for new analyses; does not rewrite past valuations."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Assumptions" danger>
        <div style={{ display: 'grid', gap: 16 }}>
          <FormRow>
            <FormField label="Default revenue multiple">
              <Input
                type="number"
                value={String(draft.defaultRevenueMultiple)}
                onChange={(_, d) => setDraft((s) => ({ ...s, defaultRevenueMultiple: Number(d.value) }))}
              />
            </FormField>
            <FormField label="Default EBITDA multiple">
              <Input
                type="number"
                value={String(draft.defaultEbitdaMultiple)}
                onChange={(_, d) => setDraft((s) => ({ ...s, defaultEbitdaMultiple: Number(d.value) }))}
              />
            </FormField>
          </FormRow>
          <FormField label="Discount rate %">
            <Input
              type="number"
              value={String(draft.discountRatePercent)}
              onChange={(_, d) => setDraft((s) => ({ ...s, discountRatePercent: Number(d.value) }))}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={draft.assumptionNotes}
              onChange={(_, d) => setDraft((s) => ({ ...s, assumptionNotes: d.value }))}
            />
          </FormField>
          <Button
            appearance="primary"
            onClick={() =>
              danger.request({
                title: 'Update enterprise-value assumptions?',
                impact: 'New worksheets will use these defaults. Past valuations are unchanged.',
                confirmLabel: 'Update assumptions',
                onConfirm: () => {
                  try {
                    adminApi.updateEva(draft);
                    feedback.success('EVA assumptions saved');
                  } catch (e) {
                    feedback.error(e);
                  }
                },
              })
            }
          >
            Save changes
          </Button>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

function AiArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.ai);
  return (
    <AdminShell
      title="AI settings"
      subtitle="AI queue and insight preferences. API keys are never managed here."
      impact="Controls visibility of AI features for staff — not model credentials."
      systemConfig
    >
      <AdminSectionCard title="AI preferences">
        <SettingsForm onSave={() => adminApi.updateAi(draft)}>
          <FormField label="Queues enabled">
            <Switch checked={draft.queuesEnabled} onChange={(_, d) => setDraft((s) => ({ ...s, queuesEnabled: d.checked }))} />
          </FormField>
          <FormField label="Allow prompt library edit">
            <Switch
              checked={draft.allowPromptLibraryEdit}
              onChange={(_, d) => setDraft((s) => ({ ...s, allowPromptLibraryEdit: d.checked }))}
            />
          </FormField>
          <FormField label="Show cost tracking to ops">
            <Switch
              checked={draft.showCostTrackingToOps}
              onChange={(_, d) => setDraft((s) => ({ ...s, showCostTrackingToOps: d.checked }))}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea value={draft.notes} onChange={(_, d) => setDraft((s) => ({ ...s, notes: d.value }))} />
          </FormField>
        </SettingsForm>
        <Hint>Secrets and API keys are excluded from this product by design.</Hint>
      </AdminSectionCard>
    </AdminShell>
  );
}

function ApplicationArea() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.application);
  return (
    <AdminShell
      title="Application settings"
      subtitle="Nontechnical product labels, locale, and naming defaults."
      impact="Affects display names and defaults across Atlas."
      systemConfig
    >
      <AdminSectionCard title="Application">
        <SettingsForm onSave={() => adminApi.updateApplication(draft)}>
          <FormRow>
            <FormField label="Product name">
              <Input value={draft.productName} onChange={(_, d) => setDraft((s) => ({ ...s, productName: d.value }))} />
            </FormField>
            <FormField label="Company short name">
              <Input
                value={draft.companyShortName}
                onChange={(_, d) => setDraft((s) => ({ ...s, companyShortName: d.value }))}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Time zone">
              <Input value={draft.timeZone} onChange={(_, d) => setDraft((s) => ({ ...s, timeZone: d.value }))} />
            </FormField>
            <FormField label="Locale">
              <Input value={draft.locale} onChange={(_, d) => setDraft((s) => ({ ...s, locale: d.value }))} />
            </FormField>
          </FormRow>
          <FormField label="Naming prefix" hint="Must end with underscore.">
            <Input value={draft.namingPrefix} onChange={(_, d) => setDraft((s) => ({ ...s, namingPrefix: d.value }))} />
          </FormField>
        </SettingsForm>
      </AdminSectionCard>
    </AdminShell>
  );
}

import {
  ProjectsControlPage,
  AiAgentsControlPage,
  AutomationRegistryPage,
  KnowledgePlatformPage,
  AzureResourcesPage,
  DataverseControlPage,
  SharePointControlPage,
  NotificationsControlPage,
  BrandingControlPage,
  LicensingControlPage,
  SecurityCenterPage,
  AiGovernancePage,
  ReleaseCenterPage,
  SystemHealthPage,
  RolesPermissionsPage,
  OrganizationsExpandedPage,
  ClientsExpandedPage,
} from './ConsolidationPages';

export function AreaPage({ areaId }: { areaId: string }) {
  const meta = getArea(areaId);
  if (!meta) {
    return (
      <AdminShell title="Unknown area" subtitle="This Control Center area does not exist.">
        <Text>Choose an area from the Control Center home or navigation.</Text>
      </AdminShell>
    );
  }

  switch (meta.id) {
    case 'organizations':
      return <OrganizationsExpandedPage />;
    case 'clients':
      return <ClientsExpandedPage />;
    case 'users':
      return <UsersArea />;
    case 'roles-permissions':
      return <RolesPermissionsPage />;
    case 'teams':
      return <TeamsArea />;
    case 'projects':
      return <ProjectsControlPage />;
    case 'ai-agents':
      return <AiAgentsControlPage />;
    case 'automation-registry':
      return <AutomationRegistryPage />;
    case 'knowledge-platform':
      return <KnowledgePlatformPage />;
    case 'integrations':
      return <IntegrationsArea />;
    case 'azure-resources':
      return <AzureResourcesPage />;
    case 'dataverse':
      return <DataverseControlPage />;
    case 'sharepoint':
      return <SharePointControlPage />;
    case 'notifications':
      return <NotificationsControlPage />;
    case 'branding':
      return <BrandingControlPage />;
    case 'licensing':
      return <LicensingControlPage />;
    case 'security-center':
      return <SecurityCenterPage />;
    case 'ai-governance':
      return <AiGovernancePage />;
    case 'audit-center':
      return <AuditArea />;
    case 'release-center':
      return <ReleaseCenterPage />;
    case 'system-health':
      return <SystemHealthPage />;
    default:
      return null;
  }
}
