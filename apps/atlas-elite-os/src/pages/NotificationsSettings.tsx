import { Link } from 'react-router-dom';
import {
  AtlasCard,
  DataTable,
  StatusChip,
  FilterToolbar,
  AtlasDrawer,
  EmptyState,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Switch, Field, Dropdown, Option } from '@fluentui/react-components';
import { useState } from 'react';
import { notificationCatalog } from '../data/projects';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { PageLayout } from '@hvcg/atlas-design-system';

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
      <AtlasCard title="Inbox">
        <DataTable
          ariaLabel="Notifications"
          getRowKey={(r) => r.id}
          rows={notificationCatalog}
          columns={[
            {
              key: 'title',
              header: 'Notification',
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
      <AtlasCard title="Appearance" subtitle="Theme persists in this browser via localStorage">
        <Text size={300}>
          Use the theme control in the command bar for light and dark modes. Preference is saved locally.
          Reduced-motion preferences are respected for entrance animations. Command palette: ⌘K · AI Command
          Center: ⌘J.
        </Text>
      </AtlasCard>
      <AtlasCard title="Notifications">
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <Field label="Executive alerts">
            <Switch defaultChecked label="Enabled" />
          </Field>
          <Field label="Task reminders">
            <Switch defaultChecked label="Enabled" />
          </Field>
          <Field label="AI briefings">
            <Switch defaultChecked label="Enabled" />
          </Field>
        </div>
      </AtlasCard>
      <AtlasCard title="Default workspace">
        <Dropdown placeholder="Select workspace" defaultValue="High Value Capital Group" style={{ maxWidth: 360 }}>
          <Option value="ws-hvcg">High Value Capital Group</Option>
          <Option value="ws-ccb">Colorado Craft Beef</Option>
        </Dropdown>
      </AtlasCard>
      <AtlasCard title="Accessibility">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <Text size={300}>Keyboard: primary nav, command bar, tables, drawers, dialogs</Text>
          </li>
          <li>
            <Text size={300}>Focus rings on interactive cards and controls</Text>
          </li>
          <li>
            <Text size={300}>Status communicated with text labels, not color alone</Text>
          </li>
        </ul>
      </AtlasCard>
    </PageLayout>
  );
}
