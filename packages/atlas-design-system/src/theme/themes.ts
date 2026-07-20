import {
  BrandVariants,
  Theme,
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';
import { color } from '../tokens';

/** Gold-forward brand ramp derived from HVCG logo + forest anchors. */
export const hvcgBrand: BrandVariants = {
  10: '#FBF6EA',
  20: '#F3E6C8',
  30: '#E8D19A',
  40: '#D4AF5A',
  50: '#C49A45',
  60: '#B08A3C',
  70: '#8A6A2C',
  80: '#6B5224',
  90: '#4F3C1C',
  100: '#3A2C15',
  110: '#2A2010',
  120: '#1F180C',
  130: '#16110A',
  140: '#110D08',
  150: '#0C0906',
  160: '#080604',
};

export const atlasLightTheme: Theme = {
  ...createLightTheme(hvcgBrand),
  colorNeutralForeground1: color.ink,
  colorNeutralForeground2: color.inkMuted,
  colorNeutralBackground1: color.paper,
  colorNeutralBackground2: color.paperElevated,
  colorNeutralBackground3: color.fog,
  colorBrandForeground1: color.forest,
  colorBrandBackground: color.gold,
  colorBrandBackgroundHover: color.goldBright,
  colorBrandBackgroundPressed: color.goldDeep,
  colorStrokeFocus2: color.gold,
  borderRadiusMedium: '10px',
  borderRadiusLarge: '14px',
};

export const atlasDarkTheme: Theme = {
  ...createDarkTheme(hvcgBrand),
  colorNeutralForeground1: '#F2EEE6',
  colorNeutralForeground2: '#A8B2AC',
  colorNeutralBackground1: '#0F1412',
  colorNeutralBackground2: '#161C19',
  colorNeutralBackground3: '#1C2420',
  colorBrandForeground1: color.goldBright,
  colorBrandBackground: color.gold,
  colorBrandBackgroundHover: color.goldBright,
  colorBrandBackgroundPressed: color.goldDeep,
  colorStrokeFocus2: color.goldBright,
  borderRadiusMedium: '10px',
  borderRadiusLarge: '14px',
};

export type AtlasColorScheme = 'light' | 'dark';
