import {
  FluentProvider,
  IdPrefixProvider,
  makeStyles,
  tokens as fTokens,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { atlasDarkTheme, atlasLightTheme, type AtlasColorScheme } from './themes';

const useGlobal = makeStyles({
  root: {
    minHeight: '100%',
    fontFamily: '"Segoe UI Variable", "Segoe UI", "Avenir Next", sans-serif',
    backgroundColor: fTokens.colorNeutralBackground1,
    color: fTokens.colorNeutralForeground1,
    transitionProperty: 'background-color, color',
    transitionDuration: '200ms',
  },
});

export interface AtlasProviderProps {
  children: ReactNode;
  scheme?: AtlasColorScheme;
  idPrefix?: string;
}

export function AtlasProvider({
  children,
  scheme = 'light',
  idPrefix = 'atlas',
}: AtlasProviderProps) {
  const styles = useGlobal();
  const theme = scheme === 'dark' ? atlasDarkTheme : atlasLightTheme;
  return (
    <IdPrefixProvider value={idPrefix}>
      <FluentProvider theme={theme} className={styles.root}>
        {children}
      </FluentProvider>
    </IdPrefixProvider>
  );
}
