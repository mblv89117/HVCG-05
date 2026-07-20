import {
  BrandVariants,
  Theme,
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';
import { color } from '../tokens';

/** Navy-forward brand ramp with gold accents for HVCG Atlas. */
export const hvcgBrand: BrandVariants = {
  10: '#F0F6FC',
  20: '#D6E6F5',
  30: '#A8C8E8',
  40: '#6FA0D4',
  50: '#3B7BC0',
  60: '#2563EB',
  70: '#1D4ED8',
  80: '#1E3A8A',
  90: '#172A5E',
  100: '#122A42',
  110: '#0B1F33',
  120: '#091A2B',
  130: '#071624',
  140: '#05101A',
  150: '#040C14',
  160: '#02080E',
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
  borderRadiusMedium: '10px',
  borderRadiusLarge: '14px',
};

export type AtlasColorScheme = 'light' | 'dark';
