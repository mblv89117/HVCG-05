import { useCallback, useEffect, useMemo, useState } from 'react';
import { AtlasCard, StatusChip, EmptyState } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text, Spinner } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import {
  acceptInboxItem,
  dismissInboxItem,
  fetchPmInbox,
  fetchPmTeam,
  type AgentWork,
  type InboxItem,
  type TeamMember,
} from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';


export function UniversalInboxPage() {
  const auth = useHubAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPmInbox(auth);
      setItems(res.inbox || []);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ModuleScaffold
      title="Universal Inbox"
      subtitle="Unprocessed work from Outlook and automated extraction — accept to create tasks, dismiss noise."
      showPendingBanner={false}
    >
      {loading ? (
        <Spinner label="Loading inbox…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Inbox clear"
          description="Ambiguous items appear here. High-confidence work is created automatically."
        />
      ) : (
        items.map((item) => (
          <AtlasCard key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <Text weight="semibold">{item.title}</Text>
                <Caption1 style={{ display: 'block' }}>
                  {item.classification} · confidence {Math.round(item.confidence * 100)}%
                  {item.clientName ? ` · ${item.clientName}` : ''}
                </Caption1>
                {item.summary ? <Caption1 style={{ display: 'block' }}>{item.summary}</Caption1> : null}
                {item.suggestedAction ? (
                  <Caption1 style={{ display: 'block' }}>Suggested: {item.suggestedAction}</Caption1>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  appearance="primary"
                  size="small"
                  onClick={() => void acceptInboxItem(auth, item.id).then(refresh)}
                >
                  Accept
                </Button>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => void dismissInboxItem(auth, item.id).then(refresh)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AtlasCard>
        ))
      )}
    </ModuleScaffold>
  );
}

export function TeamAgentsPage() {
  const auth = useHubAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [agents, setAgents] = useState<AgentWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchPmTeam(auth);
        setTeam(res.team || []);
        setAgents(res.agents || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  return (
    <ModuleScaffold
      title="Team & Agents"
      subtitle="People and AI workers inside Atlas — assignments, status, and approvals."
      showPendingBanner={false}
    >
      {loading ? (
        <Spinner label="Loading…" />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <AtlasCard title="Team">
            {team
              .filter((t) => t.kind === 'person')
              .map((t) => (
                <div key={t.id} style={{ padding: '8px 0' }}>
                  <Text weight="semibold">{t.name}</Text>
                  <Caption1 style={{ display: 'block' }}>{t.role}</Caption1>
                </div>
              ))}
          </AtlasCard>
          <AtlasCard title="Agents">
            {agents.map((a) => (
              <div key={a.id} style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text weight="semibold">{a.agentName}</Text>
                  <StatusChip tone={a.status === 'failed' ? 'danger' : 'info'} label={a.status} />
                  {a.approvalNeeded ? <StatusChip tone="warning" label="Approval" /> : null}
                </div>
                <Caption1 style={{ display: 'block' }}>{a.role}</Caption1>
                <Caption1 style={{ display: 'block' }}>
                  {a.output || a.nextPlannedAction || '—'}
                </Caption1>
              </div>
            ))}
          </AtlasCard>
        </div>
      )}
    </ModuleScaffold>
  );
}
