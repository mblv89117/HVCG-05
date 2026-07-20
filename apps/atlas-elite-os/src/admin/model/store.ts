import { useSyncExternalStore } from 'react';
import { createSeedState } from './seed';
import type {
  AdminState,
  AdminUser,
  AiSettings,
  ApplicationSettings,
  AuditEvent,
  CapitalAdvisorySettings,
  ClientAccessGrant,
  EvaAssumptions,
  FeatureFlagDef,
  FinancialSettings,
  NotificationPreferences,
  PermissionKey,
  ReferenceItem,
  Role,
  WorkflowSettings,
} from './types';
import {
  assertKnownPermissions,
  validateApplicationSettings,
  validateEvaAssumptions,
  validateFinancialSettings,
  validateInviteUser,
  validatePermissionKeys,
  validateReferenceItem,
  ValidationError,
} from './validate';

type Listener = () => void;

let state: AdminState = createSeedState();
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function snapshot(): AdminState {
  return state;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

const ACTOR = 'admin-session';

function commit(nextWithoutAudit: AdminState, audit: Omit<AuditEvent, 'id' | 'at' | 'actor'>) {
  const event: AuditEvent = {
    id: uid('aud'),
    at: nowIso(),
    actor: ACTOR,
    ...audit,
  };
  state = { ...nextWithoutAudit, audit: [event, ...nextWithoutAudit.audit] };
  emit();
}

export function getAdminState(): AdminState {
  return state;
}

export function useAdminStore(): AdminState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function resetAdminStore() {
  state = createSeedState();
  emit();
}

export const adminApi = {
  inviteUser(input: {
    displayName: string;
    email: string;
    roleIds: string[];
    organizationIds: string[];
  }) {
    validateInviteUser(input);
    const email = input.email.trim().toLowerCase();
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new ValidationError('A user with this email already exists.');
    }
    for (const roleId of input.roleIds) {
      const role = state.roles.find((r) => r.id === roleId);
      if (!role) throw new ValidationError('Unknown role.');
      if (role.ownerOnlyAssign) {
        throw new ValidationError(
          `Role "${role.name}" can only be assigned by an Owner through a controlled process.`,
        );
      }
    }
    const user: AdminUser = {
      id: uid('user'),
      displayName: input.displayName.trim(),
      email,
      status: 'Invited',
      roleIds: [...input.roleIds],
      organizationIds: [...input.organizationIds],
      clientCodes: [],
      teamIds: [],
    };
    commit(
      { ...state, users: [...state.users, user] },
      {
        areaId: 'users',
        action: 'invite',
        summary: `Invited ${user.displayName} (${user.email}).`,
        after: user.email,
        highImpact: true,
      },
    );
    return user;
  },

  activateUser(userId: string) {
    const users = state.users.map((u) => {
      if (u.id !== userId) return u;
      if (u.status === 'Active') throw new ValidationError('User is already active.');
      return { ...u, status: 'Active' as const };
    });
    const user = users.find((u) => u.id === userId);
    if (!user) throw new ValidationError('User not found.');
    commit(
      { ...state, users },
      {
        areaId: 'users',
        action: 'activate',
        summary: `Activated ${user.displayName}.`,
        highImpact: false,
      },
    );
  },

  disableUser(userId: string) {
    const users = state.users.map((u) => {
      if (u.id !== userId) return u;
      if (u.status === 'Disabled') throw new ValidationError('User is already disabled.');
      return { ...u, status: 'Disabled' as const };
    });
    const user = users.find((u) => u.id === userId);
    if (!user) throw new ValidationError('User not found.');
    commit(
      { ...state, users },
      {
        areaId: 'users',
        action: 'disable',
        summary: `Disabled ${user.displayName}.`,
        before: 'Active/Invited',
        after: 'Disabled',
        highImpact: true,
      },
    );
  },

  assignRoles(userId: string, roleIds: string[]) {
    if (!roleIds.length) throw new ValidationError('Assign at least one role.');
    const before = state.users.find((u) => u.id === userId);
    if (!before) throw new ValidationError('User not found.');
    for (const roleId of roleIds) {
      const role = state.roles.find((r) => r.id === roleId);
      if (!role) throw new ValidationError('Unknown role.');
      if (role.ownerOnlyAssign && !before.roleIds.includes(roleId)) {
        throw new ValidationError(
          `Cannot newly assign "${role.name}" from this screen without Owner confirmation workflow.`,
        );
      }
    }
    const users = state.users.map((u) => (u.id === userId ? { ...u, roleIds: [...roleIds] } : u));
    commit(
      { ...state, users },
      {
        areaId: 'users',
        action: 'assign_roles',
        summary: `Updated roles for ${before.displayName}.`,
        before: before.roleIds.join(','),
        after: roleIds.join(','),
        highImpact: true,
      },
    );
  },

  assignOrganizations(userId: string, organizationIds: string[]) {
    if (!organizationIds.length) throw new ValidationError('Assign at least one organization.');
    for (const id of organizationIds) {
      if (!state.organizations.some((o) => o.id === id)) {
        throw new ValidationError('Unknown organization.');
      }
    }
    const before = state.users.find((u) => u.id === userId);
    if (!before) throw new ValidationError('User not found.');
    const users = state.users.map((u) =>
      u.id === userId ? { ...u, organizationIds: [...organizationIds] } : u,
    );
    commit(
      { ...state, users },
      {
        areaId: 'users',
        action: 'assign_orgs',
        summary: `Updated organizations for ${before.displayName}.`,
        highImpact: false,
      },
    );
  },

  setClientAccess(userId: string, clientCodes: string[]) {
    const before = state.users.find((u) => u.id === userId);
    if (!before) throw new ValidationError('User not found.');
    const users = state.users.map((u) =>
      u.id === userId ? { ...u, clientCodes: [...clientCodes] } : u,
    );
    const known = new Map(
      state.clientAccess.map((c) => [`${c.clientCode}:${c.userId}`, c] as const),
    );
    let clientAccess = state.clientAccess.filter((c) => c.userId !== userId);
    for (const code of clientCodes) {
      const existing = [...known.values()].find((c) => c.clientCode === code);
      const name = existing?.clientName || code;
      clientAccess = [
        ...clientAccess,
        {
          id: uid('ca'),
          clientCode: code,
          clientName: name,
          userId,
          accessLevel: 'Contribute',
        } satisfies ClientAccessGrant,
      ];
    }
    commit(
      { ...state, users, clientAccess },
      {
        areaId: 'clients',
        action: 'set_client_access',
        summary: `Updated client access for ${before.displayName}.`,
        before: before.clientCodes.join(','),
        after: clientCodes.join(','),
        highImpact: true,
      },
    );
  },

  upsertClientGrant(grant: Omit<ClientAccessGrant, 'id'> & { id?: string }) {
    const id = grant.id || uid('ca');
    const next: ClientAccessGrant = { ...grant, id };
    const exists = state.clientAccess.some((c) => c.id === id);
    const clientAccess = exists
      ? state.clientAccess.map((c) => (c.id === id ? next : c))
      : [...state.clientAccess, next];
    commit(
      { ...state, clientAccess },
      {
        areaId: 'clients',
        action: exists ? 'update_grant' : 'create_grant',
        summary: `${exists ? 'Updated' : 'Created'} access for ${next.clientName} → user ${next.userId}.`,
        highImpact: true,
      },
    );
  },

  setRolePermissions(roleId: string, permissionKeys: PermissionKey[]) {
    assertKnownPermissions(permissionKeys);
    validatePermissionKeys(permissionKeys);
    const role = state.roles.find((r) => r.id === roleId);
    if (!role) throw new ValidationError('Role not found.');
    if (role.ownerOnlyAssign && permissionKeys.includes('admin.access') === false) {
      // Owner/Admin roles must keep admin.access
      throw new ValidationError(`${role.name} must retain Open Administration permission.`);
    }
    const roles: Role[] = state.roles.map((r) =>
      r.id === roleId ? { ...r, permissionKeys: [...permissionKeys] } : r,
    );
    commit(
      { ...state, roles },
      {
        areaId: 'roles-permissions',
        action: 'set_role_permissions',
        summary: `Updated permissions for role ${role.name}.`,
        before: role.permissionKeys.join(','),
        after: permissionKeys.join(','),
        highImpact: true,
      },
    );
  },

  upsertReference(
    collection:
      | 'statuses'
      | 'categories'
      | 'referralSources'
      | 'serviceTypes'
      | 'engagementTypes'
      | 'documentCategories',
    item: ReferenceItem,
  ) {
    validateReferenceItem(item);
    const list = state[collection];
    const exists = list.some((r) => r.id === item.id);
    const nextList = exists
      ? list.map((r) => (r.id === item.id ? item : r))
      : [...list, { ...item, id: item.id || uid('ref') }];
    commit(
      { ...state, [collection]: nextList },
      {
        areaId:
          collection === 'statuses'
            ? 'clients'
            : collection === 'referralSources'
              ? 'clients'
              : collection === 'serviceTypes'
                ? 'projects'
                : collection === 'engagementTypes'
                  ? 'projects'
                  : collection === 'documentCategories'
                    ? 'knowledge-platform'
                    : 'projects',
        action: exists ? 'update_reference' : 'create_reference',
        summary: `${exists ? 'Updated' : 'Added'} ${item.label}.`,
        highImpact: false,
      },
    );
  },

  setFeatureFlag(key: string, value: boolean) {
    const flag = state.featureFlags.find((f) => f.key === key);
    if (!flag) throw new ValidationError('Unknown feature flag.');
    const featureFlags: FeatureFlagDef[] = state.featureFlags.map((f) =>
      f.key === key ? { ...f, value } : f,
    );
    commit(
      { ...state, featureFlags },
      {
        areaId: 'licensing',
        action: 'set_flag',
        summary: `Set ${flag.label} to ${value ? 'on' : 'off'}.`,
        before: String(flag.value),
        after: String(value),
        highImpact: flag.highImpact && value === true,
      },
    );
  },

  updateNotifications(notifications: NotificationPreferences) {
    if (!notifications.renewalReminderDays.length) {
      throw new ValidationError('Provide at least one renewal reminder day.');
    }
    commit(
      { ...state, notifications },
      {
        areaId: 'notifications',
        action: 'update',
        summary: 'Updated notification preferences.',
        highImpact: false,
      },
    );
  },

  updateWorkflow(workflow: WorkflowSettings) {
    commit(
      { ...state, workflow },
      {
        areaId: 'automation-registry',
        action: 'update',
        summary: 'Updated workflow settings.',
        highImpact: !workflow.blockLiveClientComms,
      },
    );
  },

  updateFinancial(financial: FinancialSettings) {
    validateFinancialSettings(financial);
    commit(
      { ...state, financial },
      {
        areaId: 'security-center',
        action: 'update',
        summary: 'Updated financial settings.',
        highImpact: financial.showSuccessFeesToNonFinance,
      },
    );
  },

  updateCapital(capital: CapitalAdvisorySettings) {
    commit(
      { ...state, capital },
      {
        areaId: 'security-center',
        action: 'update',
        summary: 'Updated capital-advisory settings.',
        highImpact: !capital.requireOwnerForLenderOutreach,
      },
    );
  },

  updateEva(eva: EvaAssumptions) {
    validateEvaAssumptions(eva);
    commit(
      { ...state, eva },
      {
        areaId: 'security-center',
        action: 'update',
        summary: 'Updated enterprise-value assumptions.',
        highImpact: true,
      },
    );
  },

  updateAi(ai: AiSettings) {
    commit(
      { ...state, ai },
      {
        areaId: 'ai-governance',
        action: 'update',
        summary: 'Updated AI settings.',
        highImpact: false,
      },
    );
  },

  updateApplication(application: ApplicationSettings) {
    validateApplicationSettings(application);
    commit(
      { ...state, application },
      {
        areaId: 'branding',
        action: 'update',
        summary: 'Updated application settings.',
        highImpact: false,
      },
    );
  },

  setOrganizationActive(id: string, active: boolean) {
    const org = state.organizations.find((o) => o.id === id);
    if (!org) throw new ValidationError('Organization not found.');
    commit(
      {
        ...state,
        organizations: state.organizations.map((o) => (o.id === id ? { ...o, active } : o)),
      },
      {
        areaId: 'organizations',
        action: active ? 'activate' : 'deactivate',
        summary: `${active ? 'Activated' : 'Deactivated'} organization ${org.name}.`,
        highImpact: !active,
      },
    );
  },

  setBusinessUnitActive(id: string, active: boolean) {
    const bu = state.businessUnits.find((o) => o.id === id);
    if (!bu) throw new ValidationError('Business unit not found.');
    commit(
      {
        ...state,
        businessUnits: state.businessUnits.map((o) => (o.id === id ? { ...o, active } : o)),
      },
      {
        areaId: 'business-units',
        action: active ? 'activate' : 'deactivate',
        summary: `${active ? 'Activated' : 'Deactivated'} business unit ${bu.name}.`,
        highImpact: false,
      },
    );
  },

  updateTeamMembers(teamId: string, memberUserIds: string[]) {
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new ValidationError('Team not found.');
    commit(
      {
        ...state,
        teams: state.teams.map((t) => (t.id === teamId ? { ...t, memberUserIds } : t)),
      },
      {
        areaId: 'teams',
        action: 'update_members',
        summary: `Updated members for team ${team.name}.`,
        highImpact: false,
      },
    );
  },
};

export { ValidationError };
