import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { AtlasProvider } from '../theme';
import { AtlasCard } from './AtlasCard';
import { KpiTile, InsightCard, HeroGreeting } from './ExecutivePrimitives';
import { AtlasAreaChart, AtlasBarChart } from './LazyCharts';
import { StatusChip } from './StatusChip';
import { GlobalAICommandPanel } from './SearchAndAI';

const meta: Meta = {
  title: 'Atlas/Elite Experience',
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AtlasProvider>
          <div style={{ padding: 24, maxWidth: 960 }}>
            <Story />
          </div>
        </AtlasProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;

export const HeroAndKpis: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <HeroGreeting
        greeting="Good morning"
        name="Manny"
        subtitle="Executive Command Center — pending-safe KPIs"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <KpiTile label="Cash position" value="Awaiting verified data" trend="flat" trendLabel="Unavailable" spark={[0, 0, 0, 0, 0]} />
        <KpiTile label="Capital readiness" value="Not yet calculated" trend="flat" trendLabel="Pending" />
      </div>
    </div>
  ),
};

export const CardsAndCharts: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <AtlasCard title="Glass card" variant="glass">
        <StatusChip label="Live demo" tone="gold" />
      </AtlasCard>
      <AtlasCard title="AI card" variant="ai">
        <InsightCard whatChanged="Design system elevated to navy executive identity." attention="Keep pending-safe finance labels." />
      </AtlasCard>
      <AtlasCard title="Pending chart" variant="quiet">
        <AtlasAreaChart data={[{ name: 'A', value: 0 }]} pending pendingLabel="No fabricated series" />
      </AtlasCard>
      <AtlasCard title="Signal chart" variant="accent">
        <AtlasBarChart data={[{ name: 'A', value: 12 }, { name: 'B', value: 18 }, { name: 'C', value: 9 }]} />
      </AtlasCard>
    </div>
  ),
};

export const Copilot: StoryObj = {
  render: () => <GlobalAICommandPanel />,
};
