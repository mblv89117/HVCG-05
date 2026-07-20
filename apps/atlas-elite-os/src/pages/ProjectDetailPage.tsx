import { Link } from 'react-router-dom';
import {
  AtlasCard,
  StatusChip,
  AtlasProgress,
  SectionHeader,
} from '@hvcg/atlas-design-system';
import { Button, Text, Caption1 } from '@fluentui/react-components';
import { getProject } from '../data/projects';
import { ModuleScaffold } from './shared/ModuleScaffold';

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const project = getProject(projectId);

  if (!project) {
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
      subtitle={`${project.clientName} · ${project.phase}`}
      showPendingBanner={false}
      actions={
        <Link to="/projects">
          <Button appearance="secondary">All projects</Button>
        </Link>
      }
    >
      <SectionHeader title="Overview" subtitle="Operational facts only — budgets pending verified sources" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        <AtlasCard variant="quiet">
          <Caption1>Status</Caption1>
          <StatusChip label={project.status} tone="gold" />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Health</Caption1>
          <StatusChip
            label={project.health}
            tone={
              project.health === 'On Track'
                ? 'success'
                : project.health === 'At Risk'
                  ? 'warning'
                  : 'neutral'
            }
          />
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Sponsor</Caption1>
          <Text weight="semibold">{project.sponsor}</Text>
        </AtlasCard>
        <AtlasCard variant="quiet">
          <Caption1>Project manager</Caption1>
          <Text weight="semibold">{project.projectManager}</Text>
        </AtlasCard>
      </div>
      <AtlasCard title="Progress">
        <AtlasProgress value={project.percentComplete} label="Completion" />
        <Caption1 style={{ display: 'block', marginTop: 8 }}>
          Next milestone: {project.nextMilestone} · Due {project.due}
        </Caption1>
        <Caption1>Blocker: {project.blocker}</Caption1>
      </AtlasCard>
      <AtlasCard title="Financials" subtitle="No invented amounts">
        <Text>
          Budget, actual, forecast, and burn remain labeled pending until verified finance sources connect for
          this engagement.
        </Text>
      </AtlasCard>
      <AtlasCard title="Related client">
        <Link to={`/clients/${project.clientId}`}>
          <Button appearance="primary">{project.clientName}</Button>
        </Link>
      </AtlasCard>
    </ModuleScaffold>
  );
}
