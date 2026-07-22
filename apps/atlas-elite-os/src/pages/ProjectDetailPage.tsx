import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  AtlasProgress,
  EmptyState,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1, Spinner } from '@fluentui/react-components';
import { ModuleScaffold } from './shared/ModuleScaffold';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { workspaceCatalog } from '../data/workspaces';
import { fetchPmProject, patchPmTask, type PmProject, type PmTask } from '../integrations/hub/pmApi';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import type { AtlasHubAuthHeaders } from '../integrations/hub/api';


export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const auth = useHubAuth();
  const [project, setProject] = useState<PmProject | null>(null);
  const [tasks, setTasks] = useState<PmTask[]>([]);
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; dueDate?: string; status: string }>>([]);
  const [risks, setRisks] = useState<Array<{ id: string; kind: string; description: string; severity: string }>>([]);
  const [decisions, setDecisions] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [commitments, setCommitments] = useState<Array<{ id: string; description: string; status: string }>>([]);
  const [deliverables, setDeliverables] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [waiting, setWaiting] = useState<Array<{ id: string; whatIsNeeded: string; owedByName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMissing(false);
    try {
      const res = await fetchPmProject(auth, projectId);
      setProject(res.project);
      setTasks(res.tasks || []);
      setMilestones((res.milestones as typeof milestones) || []);
      setRisks((res.risks as typeof risks) || []);
      setDecisions((res.decisions as typeof decisions) || []);
      setCommitments((res.commitments as typeof commitments) || []);
      setDeliverables((res.deliverables as typeof deliverables) || []);
      setWaiting((res.waiting as typeof waiting) || []);
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [auth, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <ModuleScaffold title="Project" subtitle="Loading…" showPendingBanner={false}>
        <Spinner />
      </ModuleScaffold>
    );
  }

  if (missing || !project) {
    return (
      <ModuleScaffold title="Project not found" subtitle="Unknown project id" showPendingBanner={false}>
        <Link to="/projects">
          <Button appearance="primary">Back to projects</Button>
        </Link>
      </ModuleScaffold>
    );
  }

  return (
    <ModuleScaffold
      title={project.name}
      subtitle={`${project.clientName || '—'} · ${project.businessEntity} · ${project.projectType}`}
      showPendingBanner={false}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/portfolio">
            <Button appearance="secondary">Portfolio</Button>
          </Link>
          <Link to="/projects">
            <Button appearance="secondary">All projects</Button>
          </Link>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        <AtlasCard variant="quiet">
          <Caption1>Status</Caption1>
          <StatusChip label={project.status} tone="info" />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Health</Caption1>
          <StatusChip
            label={project.health}
            tone={
              project.health === 'healthy'
                ? 'success'
                : project.health === 'at_risk' || project.health === 'critical'
                  ? 'danger'
                  : 'warning'
            }
          />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Owner</Caption1>
          <Text weight="semibold">{project.ownerName}</Text>
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Priority</Caption1>
          <Text weight="semibold">{project.priority}</Text>
        </AtlasCard>
      </div>

      <AtlasCard title="Objective & next action">
        <Text>{project.objective || '—'}</Text>
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          Next action: {project.nextAction || 'Define next action'}
        </Caption1>
        <div style={{ marginTop: 12 }}>
          <AtlasProgress value={project.progressPercent} label="Completion" />
        </div>
      </AtlasCard>

      <AtlasCard title="Tasks">
        {tasks.length === 0 ? (
          <EmptyState title="No tasks" description="Extract work from Command Center or Quick Capture." />
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
              }}
            >
              <div>
                <Text weight="semibold">{t.title}</Text>
                <Caption1 style={{ display: 'block' }}>
                  {t.status} · {t.priority}
                  {t.dueDate ? ` · due ${t.dueDate}` : ''}
                </Caption1>
              </div>
              {t.status !== 'completed' ? (
                <Button
                  size="small"
                  onClick={() =>
                    void patchPmTask(auth, t.id, { status: 'completed' }).then(refresh)
                  }
                >
                  Complete
                </Button>
              ) : null}
            </div>
          ))
        )}
      </AtlasCard>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <AtlasCard title="Milestones">
          {milestones.map((m) => (
            <Caption1 key={m.id} style={{ display: 'block', padding: '4px 0' }}>
              {m.title} · {m.status}
              {m.dueDate ? ` · ${m.dueDate}` : ''}
            </Caption1>
          ))}
        </AtlasCard>
        <AtlasCard title="Risks / blockers">
          {risks.length === 0 ? (
            <Caption1>None</Caption1>
          ) : (
            risks.map((r) => (
              <Caption1 key={r.id} style={{ display: 'block', padding: '4px 0' }}>
                [{r.kind}/{r.severity}] {r.description}
              </Caption1>
            ))
          )}
        </AtlasCard>
        <AtlasCard title="Decisions">
          {decisions.length === 0 ? (
            <Caption1>None</Caption1>
          ) : (
            decisions.map((d) => (
              <Caption1 key={d.id} style={{ display: 'block', padding: '4px 0' }}>
                {d.title} ({d.status})
              </Caption1>
            ))
          )}
        </AtlasCard>
        <AtlasCard title="Commitments">
          {commitments.length === 0 ? (
            <Caption1>None</Caption1>
          ) : (
            commitments.map((c) => (
              <Caption1 key={c.id} style={{ display: 'block', padding: '4px 0' }}>
                {c.description} ({c.status})
              </Caption1>
            ))
          )}
        </AtlasCard>
        <AtlasCard title="Deliverables">
          {deliverables.length === 0 ? (
            <Caption1>None yet</Caption1>
          ) : (
            deliverables.map((d) => (
              <Caption1 key={d.id} style={{ display: 'block', padding: '4px 0' }}>
                {d.name} ({d.status})
              </Caption1>
            ))
          )}
        </AtlasCard>
        <AtlasCard title="Waiting on">
          {waiting.length === 0 ? (
            <Caption1>None</Caption1>
          ) : (
            waiting.map((w) => (
              <Caption1 key={w.id} style={{ display: 'block', padding: '4px 0' }}>
                {w.whatIsNeeded} — {w.owedByName}
              </Caption1>
            ))
          )}
        </AtlasCard>
      </div>
    </ModuleScaffold>
  );
}
