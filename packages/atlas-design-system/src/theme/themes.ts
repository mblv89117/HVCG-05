import {
  BrandVariants,
  Theme,
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';
import { color } from '../tokens';

/** Navy-forward brand ramp with gold interactive accents. */
export const hvcgBrand: BrandVariants = {
  10: '#F0F5FA',
  20: '#D6E4F0',
  30: '#A8C4DC',
  40: '#6B9AC0',
  50: '#3D7AAB',
  60: '#2563EB',
  70: '#1E4FBF',
  80: '#163D96',
  90: '#122A42',
  100: '#0B1F33',
  110: '#091A2B',
  120: '#071624',
  130: '#05111C',
  140: '#040D15',
  150: '#030910',
  160: '#02060B',
};

export const atlasLightTheme: Theme = {
  ...createLightTheme(hvcgBrand),
  colorNeutralForeground1: color.navy,
  colorNeutralForeground2: color.slateMuted,
  colorNeutralBackground1: color.paper,
  colorNeutralBackground2: color.paperElevated,
  colorNeutralBackground3: color.fog,
  colorBrandForeground1: color.navy,
  colorBrandBackground: color.gold,
  colorBrandBackgroundHover: color.goldBright,
  colorBrandBackgroundPressed: color.goldDeep,
  colorStrokeFocus2: color.azure,
  colorNeutralStroke1: color.line,
  colorNeutralStroke2: '#CBD5E1',
  borderRadiusMedium: '10px',
  borderRadiusLarge: '14px',
};

export const atlasDarkTheme: Theme = {
  ...createDarkTheme(hvcgBrand),
  colorNeutralForeground1: '#F1F5F9',
  colorNeutralForeground2: '#94A3B8',
  colorNeutralBackground1: color.navyDeep,
  colorNeutralBackground2: color.navy,
  colorNeutralBackground3: color.navySoft,
  colorBrandForeground1: color.goldBright,
  colorBrandBackground: color.gold,
  colorBrandBackgroundHover: color.goldBright,
  colorBrandBackgroundPressed: color.goldDeep,
  colorStrokeFocus2: color.azureSoft,
  colorNeutralStroke1: color.lineDark,
  colorNeutralStroke2: '#1E3A5F',
  borderRadiusMedium: '10px',
  borderRadiusLarge: '14px',
};

export type AtlasColorScheme = 'light' | 'dark';
