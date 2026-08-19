import type { Meta, StoryObj } from '@storybook/react';
import { AtlasCard } from './AtlasCard';
import { StatusChip } from './StatusChip';
import { Button } from '@fluentui/react-components';

const meta: Meta<typeof AtlasCard> = {
  title: 'Composites/AtlasCard',
  component: AtlasCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AtlasCard>;

export const Default: Story = {
  args: {
    title: 'Portfolio health',
    subtitle: 'Development sample',
    children: 'Track 7 Command Center is ready for owner UAT.',
    headerAction: <StatusChip label="Green" tone="success" />,
    footer: <Button size="small">Open</Button>,
  },
};

export const Quiet: Story = {
  args: {
    ...Default.args,
    variant: 'quiet',
    title: 'Quiet card',
  },
};

export const Glass: Story = {
  args: {
    ...Default.args,
    variant: 'glass',
    title: 'Glass card',
  },
};

export const Accent: Story = {
  args: {
    ...Default.args,
    variant: 'accent',
    title: 'Accent card',
  },
};

export const AI: Story = {
  args: {
    ...Default.args,
    variant: 'ai',
    title: 'AI insight card',
  },
};
