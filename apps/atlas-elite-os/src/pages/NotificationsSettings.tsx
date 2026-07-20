import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  FilterToolbar,
  AtlasDrawer,
  EmptyState,
  AtlasForm,
  FormField,
  FormActions,
  PageLayout,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Switch, Dropdown, Option } from '@fluentui/react-components';
import { useState } from 'react';
import { notificationCatalog } from '../data/projects';
import { ModuleScaffold } from './shared/ModuleScaffold';

function severityTone(s: string): 'danger' | 'warning' | 'neutral' | 'success' {
  if (s === 'Critical' || s === 'High') return 'danger';
  if (s === 'Medium') return 'warning';
  return 'neutral';
}

export function NotificationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof notificationCatalog)[0] | null>(null);

  return (
    <ModuleScaffold
      title="Notifications"
      subtitle="Executive alerts and system notices — low-noise, severity ordered."
      showPendingBanner={false}
    >
      <FilterToolbar>
        <StatusChip label={`${notificationCatalog.length} open`} tone="gold" />
        <Caption1 style={{ marginLeft: 'auto' }}>Tap a row for detail</Caption1>
      </FilterToolbar>
      <AtlasCard title="Inbox" variant="glass">
        <DataTable
          ariaLabel="Notifications"
          searchable
          getRowKey={(r) => r.id}
          rows={notificationCatalog}
          columns={[
            {
              key: 'title',
              header: 'Notification',
              sortable: true,
              getSortValue: (r) => r.title,
              getFilterValue: (r) => r.title,
              render: (r) => (
                <Button
                  appearance="transparent"
                  style={{ padding: 0, minWidth: 0, fontWeight: 600 }}
                  onClick={() => {
                    setSelected(r);
                    setDrawerOpen(true);
                  }}
                >
                  {r.title}
                </Button>
              ),
            },
            {
              key: 'sev',
              header: 'Severity',
              filterable: true,
              getFilterValue: (r) => r.severity,
              render: (r) => <StatusChip label={r.severity} tone={severityTone(r.severity)} />,
            },
            { key: 'when', header: 'When', render: (r) => r.when },
            {
              key: 'go',
              header: '',
              render: (r) =>
                r.href ? (
                  <Link to={r.href}>
                    <Button size="small" appearance="secondary">
                      Open
                    </Button>
                  </Link>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </AtlasCard>
      <AtlasDrawer
        open={drawerOpen}
        title={selected?.title || 'Notification'}
        onOpenChange={setDrawerOpen}
        footer={
          selected?.href ? (
            <Link to={selected.href}>
              <Button appearance="primary">Go to related view</Button>
            </Link>
          ) : null
        }
      >
        {selected ? (
          <>
            <StatusChip label={selected.severity} tone={severityTone(selected.severity)} />
            <Text>{selected.body}</Text>
            <Caption1>{selected.when}</Caption1>
          </>
        ) : (
          <EmptyState title="Select a notification" />
        )}
      </AtlasDrawer>
    </ModuleScaffold>
  );
}

export function SettingsPage() {
  return (
    <PageLayout title="Settings" subtitle="Personal preferences for the Elite OS experience">
      <div className="atlas-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <AtlasCard title="Appearance" subtitle="Theme follows command-bar toggle; preference persists locally" variant="glass">
          <Text size={300}>
            Use the theme control in the command bar for light and dark modes. Reduced-motion preferences are respected
            for entrance animations.
          </Text>
        </AtlasCard>
        <AtlasCard title="Notifications" variant="glass">
          <AtlasForm progress={100} autosaveLabel="Preferences autosave locally (session).">
            <FormField label="Executive alerts" hint="Critical and high severity inbox items">
              <Switch defaultChecked label="Enabled" />
            </FormField>
            <FormField label="Task reminders" hint="Approvals and deadline nudges">
              <Switch defaultChecked label="Enabled" />
            </FormField>
            <FormField label="AI briefings" hint="Executive Copilot summaries">
              <Switch defaultChecked label="Enabled" />
            </FormField>
            <FormActions>
              <Button appearance="primary" size="small">
                Save preferences
              </Button>
            </FormActions>
          </AtlasForm>
        </AtlasCard>
        <AtlasCard title="Default workspace" variant="quiet">
          <FormField label="Workspace" hint="Used when opening Atlas">
            <Dropdown placeholder="Select workspace" defaultValue="High Value Capital Group" style={{ maxWidth: 360 }}>
              <Option value="ws-hvcg">High Value Capital Group</Option>
              <Option value="ws-ccb">Colorado Craft Beef</Option>
            </Dropdown>
          </FormField>
        </AtlasCard>
        <AtlasCard title="Accessibility" variant="accent">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <Text size={300}>Keyboard: primary nav, command bar (⌘K / ⌘J), tables, drawers, dialogs</Text>
            </li>
            <li>
              <Text size={300}>Focus rings on interactive cards and controls</Text>
            </li>
            <li>
              <Text size={300}>Status communicated with text labels, not color alone</Text>
            </li>
          </ul>
        </AtlasCard>
      </div>
    </PageLayout>
  );
}
