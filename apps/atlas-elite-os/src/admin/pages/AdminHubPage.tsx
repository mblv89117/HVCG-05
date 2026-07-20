import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasCard, StatusChip } from '@hvcg/atlas-design-system';
import { Text, Caption1 } from '@fluentui/react-components';
import { AdminSearch, NavButton } from '../components';
import { ControlCenterChrome } from '../components/ControlCenterChrome';
import {
  CONTROL_CENTER_AREAS,
  GROUP_ORDER,
  searchAreas,
  areasForRole,
  type ControlCenterGroup,
} from '../model';
import { microsoftConfig } from '../../microsoft/config';
import { productRole } from '../../security/rbac';

export function AdminHubPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const role = productRole();
  const visible = useMemo(() => areasForRole(role), [role]);
  const areas = useMemo(() => searchAreas(query, visible), [query, visible]);

  const grouped = GROUP_ORDER.map((group: ControlCenterGroup) => ({
    group,
    items: areas.filter((a) => a.group === group),
  })).filter((g) => g.items.length);

  return (
    <ControlCenterChrome
      title="Atlas Control Center"
      subtitle="Unified system administration — configure Atlas without editing code or raw JSON."
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusChip label={microsoftConfig.environment} tone="gold" />
          <StatusChip label={role} tone="neutral" />
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 20 }}>
        <AtlasCard
          title="How Control Center is organized"
          subtitle="One catalog of settings. No duplicated configuration hubs."
        >
          <Text>
            Identity & access, Delivery, Intelligence, Platform, Experience, Governance, and Operations
            consolidate existing administration. Domain modules (Clients, Projects, AI Insights) remain the
            place for day-to-day work — Control Center links to them instead of re-implementing them.
          </Text>
          <div style={{ marginTop: 12 }}>
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="Search all Control Center settings…"
              label="Search settings"
            />
          </div>
        </AtlasCard>

        {grouped.length === 0 ? (
          <AtlasCard>
            <Text>No areas match “{query}”.</Text>
          </AtlasCard>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} style={{ display: 'grid', gap: 12 }}>
              <Caption1 style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{group}</Caption1>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {items.map((area) => (
                  <AtlasCard
                    key={area.id}
                    title={area.title}
                    subtitle={area.systemConfig ? 'System configuration' : 'Ordinary settings'}
                    interactive
                    onClick={() => navigate(`/admin/${area.id}`)}
                  >
                    <Text size={200}>{area.description}</Text>
                    <div style={{ marginTop: 10 }}>
                      <NavButton to={`/admin/${area.id}`} appearance="subtle">
                        Open
                      </NavButton>
                    </div>
                  </AtlasCard>
                ))}
              </div>
            </div>
          ))
        )}

        <AtlasCard title="Quick links">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <NavButton to="/admin/users" appearance="primary">
              Users
            </NavButton>
            <NavButton to="/admin/roles-permissions" appearance="secondary">
              Roles & Permissions
            </NavButton>
            <NavButton to="/admin/security-center" appearance="secondary">
              Security Center
            </NavButton>
            <NavButton to="/admin/audit-center" appearance="secondary">
              Audit Center
            </NavButton>
            <NavButton to="/admin/system-health" appearance="secondary">
              System Health
            </NavButton>
          </div>
          <Caption1 style={{ display: 'block', marginTop: 12 }}>
            {CONTROL_CENTER_AREAS.length} Control Center areas · sample-backed settings store · coordinate
            shared config changes with Architecture, Elite UI, Power Platform, AI Governance, and Master PM
          </Caption1>
        </AtlasCard>
      </div>
    </ControlCenterChrome>
  );
}
