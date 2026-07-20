import { PageLayout, AtlasCard, EmptyState } from '@hvcg/atlas-design-system';
import { WrenchScrewdriverRegular } from '@fluentui/react-icons';

export function PlaceholderModule({ title }: { title: string }) {
  return (
    <PageLayout title={title} subtitle="Gated until Design System + Executive Dashboard owner UAT.">
      <AtlasCard>
        <EmptyState
          title={`${title} comes next`}
          description="This module will be built on the Atlas Design System after owner review of Sprint 10.1."
          icon={<WrenchScrewdriverRegular />}
        />
      </AtlasCard>
    </PageLayout>
  );
}
