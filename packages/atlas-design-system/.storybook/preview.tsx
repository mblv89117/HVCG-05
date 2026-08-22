import type { Preview } from '@storybook/react';
import { AtlasProvider } from '../src/theme';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i } },
    a11y: { test: 'todo' },
  },
  globalTypes: {
    scheme: {
      description: 'Color scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <AtlasProvider scheme={context.globals.scheme === 'dark' ? 'dark' : 'light'}>
        <div style={{ minHeight: '100vh', padding: 16 }}>
          <Story />
        </div>
      </AtlasProvider>
    ),
  ],
};

export default preview;
