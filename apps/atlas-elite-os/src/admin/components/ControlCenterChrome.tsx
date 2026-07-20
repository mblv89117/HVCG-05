import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageLayout } from '@hvcg/atlas-design-system';
import { Text, Caption1, Button } from '@fluentui/react-components';
import { AdminSearch } from './AdminSearch';
import {
  CONTROL_CENTER_AREAS,
  GROUP_ORDER,
  searchAreas,
  type ControlCenterGroup,
} from '../model';
import { productRole } from '../../security/rbac';
import { areasForRole } from '../model/areas';

const MODEL_DRIVEN =
  'https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8';

export function ControlCenterChrome({
  title,
  subtitle,
  actions,
  children,
  showAreaNav = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  showAreaNav?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [navQuery, setNavQuery] = useState('');
  const role = productRole();
  const visible = useMemo(() => areasForRole(role), [role]);
  const filtered = useMemo(() => searchAreas(navQuery, visible), [navQuery, visible]);

  const grouped = GROUP_ORDER.map((group: ControlCenterGroup) => ({
    group,
    items: filtered.filter((a) => a.group === group),
  })).filter((g) => g.items.length);

  const activePath = location.pathname;

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {actions}
          <Button appearance="secondary" onClick={() => window.open(MODEL_DRIVEN, '_blank', 'noopener')}>
            Dataverse grids
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: showAreaNav ? 'minmax(200px, 260px) minmax(0, 1fr)' : '1fr',
        }}
        className="atlas-control-center-grid"
      >
        {showAreaNav ? (
          <aside
            style={{
              display: 'grid',
              gap: 12,
              alignContent: 'start',
              position: 'sticky',
              top: 12,
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'auto',
              paddingRight: 4,
            }}
          >
            <div>
              <Caption1 style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Atlas Control Center
              </Caption1>
              <Text weight="semibold" style={{ display: 'block', marginTop: 4 }}>
                Settings navigation
              </Text>
            </div>
            <AdminSearch
              value={navQuery}
              onChange={setNavQuery}
              placeholder="Search all settings…"
              label="Search settings"
            />
            <nav aria-label="Control Center areas" style={{ display: 'grid', gap: 14 }}>
              {grouped.map(({ group, items }) => (
                <div key={group} style={{ display: 'grid', gap: 4 }}>
                  <Caption1 style={{ opacity: 0.75 }}>{group}</Caption1>
                  {items.map((area) => {
                    const to = `/admin/${area.id}`;
                    const active = activePath === to || activePath.startsWith(`${to}/`);
                    return (
                      <Link
                        key={area.id}
                        to={to}
                        style={{
                          display: 'block',
                          padding: '8px 10px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          color: 'inherit',
                          fontWeight: active ? 600 : 400,
                          background: active ? 'var(--colorNeutralBackground3, #f0f0f0)' : 'transparent',
                          border: active
                            ? '1px solid var(--colorNeutralStroke2, #ddd)'
                            : '1px solid transparent',
                        }}
                      >
                        {area.title}
                      </Link>
                    );
                  })}
                </div>
              ))}
              {!grouped.length ? <Text size={200}>No settings match “{navQuery}”.</Text> : null}
            </nav>
            <Button appearance="subtle" onClick={() => navigate('/admin')}>
              Control Center home
            </Button>
          </aside>
        ) : null}
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .atlas-control-center-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PageLayout>
  );
}

export { CONTROL_CENTER_AREAS };
