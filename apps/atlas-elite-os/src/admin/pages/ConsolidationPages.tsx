/**
 * Atlas Control Center consolidation views.
 * Surfaces existing configuration only — no new business products.
 */
import { useMemo, useState } from 'react';
import { DataTable, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Text, Switch, Input, Textarea } from '@fluentui/react-components';
import {
  AdminShell,
  AdminSectionCard,
  SettingsForm,
  FormField,
  FormRow,
  Hint,
  NavButton,
  useDangerConfirm,
  useAdminFeedback,
  AdminSearch,
} from '../components';
import {
  adminApi,
  useAdminStore,
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
} from '../model';
import { microsoftConfig, isEntraConfigured } from '../../microsoft/config';
import { notificationCatalog } from '../../data/projects';
import { productRole } from '../../security/rbac';

const MODEL_DRIVEN =
  'https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8';

const LICENSING_FLAGS = new Set(['enablePremiumConnectors', 'enablePowerPages', 'enableClientEmails']);
const AI_AGENT_FLAGS = new Set(['enableAIQueues', 'enableCopilotStudio', 'enablePortalPrepEntities']);

export function ProjectsControlPage() {
  const state = useAdminStore();
  return (
    <AdminShell
      title="Projects"
      subtitle="Existing project health rules and delivery reference values."
      impact="Does not create or edit live projects — open Projects in Elite OS for delivery work."
    >
      <AdminSectionCard title="Open delivery module">
        <NavButton to="/projects" appearance="primary">
          Go to Projects
        </NavButton>
        <Hint>Project records stay in the executive Projects module — not duplicated here.</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Project health rules" subtitle="From firm configuration">
        <DataTable
          rows={[
            { id: 'g', label: 'Green', rule: state.projectHealthRules.green },
            { id: 'y', label: 'Yellow', rule: state.projectHealthRules.yellow },
            { id: 'r', label: 'Red', rule: state.projectHealthRules.red },
          ]}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Band', render: (r) => r.label },
            { key: 'rule', header: 'Rule', render: (r) => r.rule },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Service types">
        <DataTable
          rows={state.serviceTypes}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Label', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Engagement types">
        <DataTable
          rows={state.engagementTypes}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Label', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Categories">
        <DataTable
          rows={state.categories}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Label', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}

export function AiAgentsControlPage() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  const flags = state.featureFlags.filter((f) => AI_AGENT_FLAGS.has(f.key));
  return (
    <AdminShell
      title="AI Agents"
      subtitle="Approved AI queue and agent-related toggles."
      impact="Does not register new agents — only existing feature flags and AI preferences."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Agent-related flags" danger>
        {flags.map((flag) => (
          <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <Text weight="semibold">{flag.label}</Text>
              <Hint>{flag.impactSummary}</Hint>
            </div>
            <Switch
              checked={flag.value}
              onChange={(_, d) => {
                const next = d.checked;
                const apply = () => {
                  try {
                    adminApi.setFeatureFlag(flag.key, next);
                    feedback.success(`${flag.label} updated`);
                  } catch (e) {
                    feedback.error(e);
                  }
                };
                if (flag.highImpact && next) {
                  danger.request({
                    title: `Enable ${flag.label}?`,
                    impact: flag.impactSummary,
                    confirmLabel: 'Enable',
                    onConfirm: apply,
                  });
                } else apply();
              }}
            />
          </div>
        ))}
      </AdminSectionCard>
      <AdminSectionCard title="Related AI preferences">
        <Hint>Full AI governance controls live under AI Governance — same settings store, no duplication of secrets.</Hint>
        <NavButton to="/admin/ai-governance" appearance="secondary">
          Open AI Governance
        </NavButton>
        <div style={{ marginTop: 8 }}>
          <NavButton to="/ai" appearance="subtle">
            Open AI Insights module
          </NavButton>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function AutomationRegistryPage() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.workflow);
  const danger = useDangerConfirm();
  const feedback = useAdminFeedback();
  const pa = state.integrations.find((i) => i.id === 'int-pa');

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
      title="Automation Registry"
      subtitle="Workflow preferences and Power Automate health."
      impact="Consolidates existing workflow settings with automation integration status."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Power Automate" danger>
        <Text>
          Base URL configured: {microsoftConfig.powerAutomateBaseUrl || 'Not set (disabled in this environment)'}
        </Text>
        {pa ? (
          <div style={{ marginTop: 8 }}>
            <StatusChip
              label={pa.status}
              tone={pa.status === 'Failed' ? 'danger' : pa.status === 'Healthy' ? 'success' : 'warning'}
            />
            <Hint>{pa.lastFailureMessage || 'No failure message'}</Hint>
          </div>
        ) : null}
        <Hint>Credentials stay in connection references — never shown here.</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Workflow preferences" danger>
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
                impact: 'Removes the safety block on live client outbound messages.',
                confirmLabel: 'Remove block',
                onConfirm: saveWorkflow,
              });
              return;
            }
            saveWorkflow();
          }}
        >
          Save workflow settings
        </Button>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function KnowledgePlatformPage() {
  const state = useAdminStore();
  return (
    <AdminShell
      title="Knowledge Platform"
      subtitle="Document categories and knowledge library entry points."
      impact="Does not rename SharePoint folders automatically."
    >
      <AdminSectionCard title="Document categories">
        <DataTable
          rows={state.documentCategories}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Folder / category', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
            {
              key: 'a',
              header: 'Active',
              render: (r) => <StatusChip label={r.active ? 'Active' : 'Inactive'} tone={r.active ? 'success' : 'neutral'} />,
            },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Documents module">
        <NavButton to="/documents" appearance="primary">
          Open Documents
        </NavButton>
        <Hint>Knowledge SOPs remain on the Knowledge SharePoint site — not re-implemented here.</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="SharePoint site">
        <NavButton to="/admin/sharepoint" appearance="secondary">
          SharePoint configuration
        </NavButton>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function AzureResourcesPage() {
  const cfg = microsoftConfig;
  const rows = [
    { id: 'env', label: 'Environment', value: cfg.environment },
    { id: 'banner', label: 'Banner', value: cfg.environmentBanner },
    { id: 'tenant', label: 'Entra tenant ID', value: cfg.tenantId },
    { id: 'client', label: 'SPA client ID', value: cfg.entraClientId || 'Not set' },
    { id: 'host', label: 'Hosted app URL', value: cfg.hostedAppUrl || 'Not set' },
    { id: 'redirect', label: 'Redirect URI', value: cfg.redirectUri },
  ];
  return (
    <AdminShell
      title="Azure Resources"
      subtitle="Public hosting and identity configuration already used by Elite OS."
      impact="Read-only. Secrets and Key Vault values are never displayed."
      systemConfig
    >
      <AdminSectionCard title="Environment (public)">
        <DataTable
          rows={rows}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Setting', render: (r) => r.label },
            { key: 'v', header: 'Value', render: (r) => r.value },
          ]}
        />
        <Hint>Coordinate Azure Platform / Architecture before changing shared environment variables.</Hint>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function DataverseControlPage() {
  return (
    <AdminShell
      title="Dataverse"
      subtitle="Environment URL and model-driven Command Center."
      impact="Advanced grids stay in the model-driven app — not duplicated in Elite OS."
      systemConfig
    >
      <AdminSectionCard title="Environment">
        <Text>{microsoftConfig.dataverseUrl}</Text>
        <Hint>API {microsoftConfig.dataverseApiVersion}</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Model-driven administration">
        <Button appearance="primary" onClick={() => window.open(MODEL_DRIVEN, '_blank', 'noopener')}>
          Open Atlas Command Center
        </Button>
        <Hint>Power Platform specialist owns Dataverse table schema; Control Center only links.</Hint>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function SharePointControlPage() {
  return (
    <AdminShell
      title="SharePoint"
      subtitle="Site URL used by Atlas documents."
      impact="Read-only consolidation of existing Elite OS SharePoint configuration."
      systemConfig
    >
      <AdminSectionCard title="Documents site">
        <Text>{microsoftConfig.sharePointSiteUrl || 'VITE_SHAREPOINT_SITE_URL not set for this environment'}</Text>
        <div style={{ marginTop: 12 }}>
          <NavButton to="/documents" appearance="primary">
            Open Documents module
          </NavButton>
        </div>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function NotificationsControlPage() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.notifications);
  return (
    <AdminShell
      title="Notifications"
      subtitle="Firm preferences and the executive notification inbox."
      impact="Consolidates admin preferences with the existing notifications module — one place to start."
    >
      <AdminSectionCard title="Executive inbox">
        <StatusChip label={`${notificationCatalog.length} open`} tone="gold" />
        <div style={{ marginTop: 8 }}>
          <NavButton to="/notifications" appearance="primary">
            Open notification inbox
          </NavButton>
        </div>
      </AdminSectionCard>
      <AdminSectionCard title="Firm notification preferences">
        <SettingsForm
          onSave={() => {
            adminApi.updateNotifications(draft);
          }}
        >
          <FormField label="Renewal reminder days" hint="Comma-separated">
            <Input
              value={draft.renewalReminderDays.join(', ')}
              onChange={(_, d) =>
                setDraft((s) => ({
                  ...s,
                  renewalReminderDays: d.value
                    .split(',')
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n)),
                }))
              }
            />
          </FormField>
          <FormField label="Email digest">
            <Switch
              checked={draft.emailDigestEnabled}
              onChange={(_, d) => setDraft((s) => ({ ...s, emailDigestEnabled: d.checked }))}
            />
          </FormField>
          <FormField label="Executive escalation alerts">
            <Switch
              checked={draft.executiveEscalationAlerts}
              onChange={(_, d) => setDraft((s) => ({ ...s, executiveEscalationAlerts: d.checked }))}
            />
          </FormField>
          <FormField label="Teams notifications">
            <Switch
              checked={draft.teamsNotifyEnabled}
              onChange={(_, d) => setDraft((s) => ({ ...s, teamsNotifyEnabled: d.checked }))}
            />
          </FormField>
        </SettingsForm>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function BrandingControlPage() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.application);
  return (
    <AdminShell
      title="Branding"
      subtitle="Product labels, locale, and naming prefix."
      impact="Same application settings store as before — not a second branding system."
      systemConfig
    >
      <AdminSectionCard title="Brand & locale">
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
          <FormField label="Naming prefix">
            <Input value={draft.namingPrefix} onChange={(_, d) => setDraft((s) => ({ ...s, namingPrefix: d.value }))} />
          </FormField>
        </SettingsForm>
        <Hint>Logo assets remain under /brand — coordinate Elite UI before changing shared brand files.</Hint>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function LicensingControlPage() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  const flags = state.featureFlags.filter((f) => LICENSING_FLAGS.has(f.key));
  return (
    <AdminShell
      title="Licensing"
      subtitle="Premium and portal-related feature flags that affect licensing posture."
      impact="Surfaces existing flags only — does not invent SKUs or billing."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Licensing-related flags" danger>
        {flags.map((flag) => (
          <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <Text weight="semibold">{flag.label}</Text>
              <Hint>{flag.impactSummary}</Hint>
            </div>
            <Switch
              checked={flag.value}
              onChange={(_, d) => {
                const next = d.checked;
                const apply = () => {
                  try {
                    adminApi.setFeatureFlag(flag.key, next);
                    feedback.success(`${flag.label} updated`);
                  } catch (e) {
                    feedback.error(e);
                  }
                };
                if (flag.highImpact && next) {
                  danger.request({
                    title: `Enable ${flag.label}?`,
                    impact: flag.impactSummary,
                    confirmLabel: 'Enable',
                    onConfirm: apply,
                  });
                } else apply();
              }}
            />
          </div>
        ))}
      </AdminSectionCard>
    </AdminShell>
  );
}

export function SecurityCenterPage() {
  const state = useAdminStore();
  const role = productRole();
  const [financial, setFinancial] = useState(state.financial);
  const danger = useDangerConfirm();
  const feedback = useAdminFeedback();

  return (
    <AdminShell
      title="Security Center"
      subtitle="Permission catalog, access posture, and sensitive finance visibility."
      impact="Consolidates existing security controls. Does not weaken Microsoft authentication."
      systemConfig
    >
      {danger.dialog}
      <AdminSectionCard title="Admin access posture">
        <Text>
          Current product role: <strong>{role}</strong>
        </Text>
        <Hint>Control Center requires HVCG Owner or Administrator. Entra groups remain the identity SoR.</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Live client communications">
        <StatusChip
          label={state.workflow.blockLiveClientComms ? 'Blocked (safe)' : 'Allowed'}
          tone={state.workflow.blockLiveClientComms ? 'success' : 'danger'}
        />
        <Hint>Managed under Automation Registry — single workflow setting, not duplicated.</Hint>
        <NavButton to="/admin/automation-registry" appearance="secondary">
          Open Automation Registry
        </NavButton>
      </AdminSectionCard>
      <AdminSectionCard title="Permission catalog">
        <DataTable
          rows={ALL_PERMISSION_KEYS.map((k) => ({ key: k, ...PERMISSION_CATALOG[k] }))}
          getRowKey={(r) => r.key}
          columns={[
            { key: 'l', header: 'Permission', render: (r) => r.label },
            { key: 'd', header: 'Description', render: (r) => r.description },
            {
              key: 'e',
              header: 'Elevating',
              render: (r) =>
                r.elevating ? <StatusChip label="Elevating" tone="warning" /> : <StatusChip label="Standard" tone="neutral" />,
            },
          ]}
        />
        <NavButton to="/admin/roles-permissions" appearance="primary">
          Manage roles & permissions
        </NavButton>
      </AdminSectionCard>
      <AdminSectionCard title="Financial visibility" danger>
        <FormField label="Show success fees to non-finance">
          <Switch
            checked={financial.showSuccessFeesToNonFinance}
            onChange={(_, d) => setFinancial((s) => ({ ...s, showSuccessFeesToNonFinance: d.checked }))}
          />
        </FormField>
        <Button
          appearance="primary"
          onClick={() => {
            if (financial.showSuccessFeesToNonFinance) {
              danger.request({
                title: 'Show success fees to non-finance?',
                impact: 'Sensitive fee amounts become visible outside finance viewers.',
                confirmLabel: 'Allow visibility',
                onConfirm: () => {
                  try {
                    adminApi.updateFinancial(financial);
                    feedback.success('Financial visibility updated');
                  } catch (e) {
                    feedback.error(e);
                  }
                },
              });
              return;
            }
            try {
              adminApi.updateFinancial(financial);
              feedback.success('Financial visibility updated');
            } catch (e) {
              feedback.error(e);
            }
          }}
        >
          Save financial visibility
        </Button>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function AiGovernancePage() {
  const state = useAdminStore();
  const [draft, setDraft] = useState(state.ai);
  return (
    <AdminShell
      title="AI Governance"
      subtitle="AI settings and governance-related preferences."
      impact="API keys are never managed here. Aligns with AI Governance specialist scope."
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
      </AdminSectionCard>
      <AdminSectionCard title="Related">
        <NavButton to="/admin/ai-agents" appearance="secondary">
          AI Agents flags
        </NavButton>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function ReleaseCenterPage() {
  const cfg = microsoftConfig;
  return (
    <AdminShell
      title="Release Center"
      subtitle="Environment gates and live-comms release posture."
      impact="Read-only. Production Power Platform remains owner-gated — Control Center does not self-release."
      systemConfig
    >
      <AdminSectionCard title="Environment gate">
        <StatusChip label={cfg.environment} tone="gold" />
        <Text style={{ display: 'block', marginTop: 8 }}>{cfg.environmentBanner}</Text>
      </AdminSectionCard>
      <AdminSectionCard title="Live client communications">
        <StatusChip
          label={cfg.blockLiveClientComms ? 'Blocked by environment config' : 'Not blocked'}
          tone={cfg.blockLiveClientComms ? 'success' : 'danger'}
        />
        <Hint>VITE_BLOCK_LIVE_CLIENT_COMMS — coordinate Master PM / Owner before any production change.</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Sample fallback">
        <StatusChip label={cfg.allowSampleFallback ? 'Allowed' : 'Disabled'} tone="neutral" />
      </AdminSectionCard>
    </AdminShell>
  );
}

export function SystemHealthPage() {
  const state = useAdminStore();
  const entraOk = isEntraConfigured();
  const failed = state.integrations.filter((i) => i.status === 'Failed' || i.status === 'Degraded');
  return (
    <AdminShell
      title="System Health"
      subtitle="Environment status, identity configuration presence, and integration health."
      impact="Operational view over existing signals — not a new monitoring product."
      systemConfig
    >
      <AdminSectionCard title="Identity">
        <StatusChip label={entraOk ? 'Entra SPA client configured' : 'Entra SPA client missing'} tone={entraOk ? 'success' : 'warning'} />
        <Hint>Tenant {microsoftConfig.tenantId}</Hint>
      </AdminSectionCard>
      <AdminSectionCard title="Environment">
        <StatusChip label={microsoftConfig.environment} tone="gold" />
        <Text style={{ display: 'block', marginTop: 8 }}>{microsoftConfig.environmentBanner}</Text>
      </AdminSectionCard>
      <AdminSectionCard title="Integration issues" danger>
        <DataTable
          rows={failed}
          getRowKey={(i) => i.id}
          emptyTitle="No failures"
          emptyDescription="Watched integrations are healthy."
          columns={[
            { key: 'n', header: 'Integration', render: (i) => i.name },
            {
              key: 's',
              header: 'Status',
              render: (i) => <StatusChip label={i.status} tone={i.status === 'Failed' ? 'danger' : 'warning'} />,
            },
            { key: 'm', header: 'Last failure', render: (i) => i.lastFailureMessage || '—' },
          ]}
        />
        <NavButton to="/admin/integrations" appearance="secondary">
          Full integrations list
        </NavButton>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function RolesPermissionsPage() {
  const state = useAdminStore();
  return (
    <AdminShell
      title="Roles & Permissions"
      subtitle="Entra-mapped roles and the approved permission catalog."
      impact="One place for roles and capabilities — no parallel permission systems."
      systemConfig
    >
      <AdminSectionCard title="Roles" danger>
        <DataTable
          rows={state.roles}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Role', render: (r) => r.name },
            { key: 'entra', header: 'Entra group', render: (r) => r.entraGroup },
            { key: 'perms', header: 'Permissions', render: (r) => `${r.permissionKeys.length}` },
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
      <AdminSectionCard title="Permission catalog">
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
        <Hint>There is no “grant all”. Capabilities are catalog-only.</Hint>
      </AdminSectionCard>
    </AdminShell>
  );
}

export function OrganizationsExpandedPage() {
  const state = useAdminStore();
  const feedback = useAdminFeedback();
  const danger = useDangerConfirm();
  return (
    <AdminShell
      title="Organizations"
      subtitle="Firm organizations and business units."
      impact="Business units stay under organizations — not a separate Control Center hub."
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
          ]}
        />
      </AdminSectionCard>
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

export function ClientsExpandedPage() {
  const state = useAdminStore();
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.clientAccess.filter(
      (c) =>
        !q ||
        c.clientName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        (state.users.find((u) => u.id === c.userId)?.displayName || '').toLowerCase().includes(q),
    );
  }, [state, query]);

  return (
    <AdminShell
      title="Clients"
      subtitle="Client access grants and client stage reference values."
      impact="Client workspaces stay in the Clients module — Control Center manages access and stages."
      systemConfig
    >
      <AdminSectionCard title="Client workspaces">
        <NavButton to="/clients" appearance="primary">
          Open Clients module
        </NavButton>
      </AdminSectionCard>
      <AdminSearch value={query} onChange={setQuery} placeholder="Search grants…" label="Search access grants" />
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
      <AdminSectionCard title="Client stages">
        <DataTable
          rows={state.statuses}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Stage', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
          ]}
        />
      </AdminSectionCard>
      <AdminSectionCard title="Referral sources">
        <DataTable
          rows={state.referralSources}
          getRowKey={(r) => r.id}
          columns={[
            { key: 'l', header: 'Source', render: (r) => r.label },
            { key: 'c', header: 'Code', render: (r) => r.code },
          ]}
        />
      </AdminSectionCard>
    </AdminShell>
  );
}
