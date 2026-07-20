/** HVCG Atlas Design System — executive navy / slate foundation with gold · azure · emerald accents. */

export const color = {
  /** Deep navy — primary ink / brand surface */
  navy: '#0B1F33',
  navyDeep: '#071624',
  navySoft: '#122A42',
  /** Slate neutrals */
  slate: '#334155',
  slateMuted: '#64748B',
  slateSoft: '#94A3B8',
  /** Surfaces */
  white: '#FFFFFF',
  paper: '#F8FAFC',
  paperElevated: '#FFFFFF',
  fog: '#E2E8F0',
  /** Legacy aliases (map to navy system) */
  ink: '#0B1F33',
  inkMuted: '#64748B',
  forest: '#0B1F33',
  forestDeep: '#071624',
  forestSoft: '#122A42',
  /** Accents */
  gold: '#C9A227',
  goldBright: '#E0B93A',
  goldDeep: '#A3841C',
  azure: '#2563EB',
  azureSoft: '#3B82F6',
  azureMuted: 'rgba(37, 99, 235, 0.12)',
  emerald: '#059669',
  emeraldSoft: '#10B981',
  emeraldMuted: 'rgba(5, 150, 105, 0.12)',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#059669',
  info: '#2563EB',
  glassLight: 'rgba(248, 250, 252, 0.78)',
  glassDark: 'rgba(7, 22, 36, 0.78)',
  line: '#E2E8F0',
  lineDark: '#1E3A5F',
} as const;

export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  pill: '999px',
} as const;

export const elevation = {
  none: 'none',
  sm: '0 1px 2px rgba(11, 31, 51, 0.05), 0 1px 3px rgba(11, 31, 51, 0.04)',
  md: '0 4px 14px rgba(11, 31, 51, 0.07), 0 2px 4px rgba(11, 31, 51, 0.04)',
  lg: '0 12px 36px rgba(11, 31, 51, 0.10), 0 4px 10px rgba(11, 31, 51, 0.05)',
  glow: '0 0 0 1px rgba(201, 162, 39, 0.32), 0 8px 28px rgba(37, 99, 235, 0.10)',
  ai: '0 0 0 1px rgba(37, 99, 235, 0.22), 0 8px 24px rgba(37, 99, 235, 0.12)',
} as const;

export const typography = {
  fontFamily:
    '"Segoe UI Variable", "Segoe UI", "Avenir Next", "Helvetica Neue", sans-serif',
  fontFamilyDisplay:
    '"Segoe UI Variable Display", "Segoe UI", "Avenir Next", sans-serif',
  size: {
    xs: '0.75rem',
    sm: '0.8125rem',
    md: '0.9375rem',
    lg: '1.0625rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const motion = {
  fast: '120ms',
  normal: '200ms',
  slow: '320ms',
  ease: 'cubic-bezier(0.33, 1, 0.68, 1)',
  easeEmphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

export const breakpoints = {
  phone: 640,
  tablet: 960,
  desktop: 1280,
  wide: 1600,
} as const;

export const chartPalette = {
  navy: '#0B1F33',
  azure: '#2563EB',
  gold: '#C9A227',
  emerald: '#059669',
  slate: '#64748B',
  soft: ['#2563EB', '#C9A227', '#059669', '#0B1F33', '#64748B', '#3B82F6'],
} as const;

export const tokens = {
  color,
  space,
  radius,
  elevation,
  typography,
  motion,
  breakpoints,
  chartPalette,
} as const;

export type AtlasTokens = typeof tokens;
