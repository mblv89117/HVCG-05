/** HVCG Atlas Design System — foundational tokens (logo gold + forest/ink/paper). */

export const color = {
  ink: '#0c1612',
  inkMuted: '#5a675f',
  paper: '#f2eee6',
  paperElevated: '#faf8f4',
  fog: '#e4ebe6',
  forest: '#1a5c42',
  forestDeep: '#0f3d2c',
  forestSoft: '#173d30',
  gold: '#b08a3c',
  goldBright: '#d4af5a',
  goldDeep: '#8a6a2c',
  danger: '#8b2e2e',
  warning: '#9a6b1f',
  success: '#1a5c42',
  info: '#2a5a7a',
  glassLight: 'rgba(250, 248, 244, 0.72)',
  glassDark: 'rgba(15, 20, 18, 0.72)',
  line: '#cfc8ba',
  lineDark: '#2a3530',
} as const;

export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
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
  sm: '0 1px 2px rgba(12, 22, 18, 0.06), 0 1px 3px rgba(12, 22, 18, 0.04)',
  md: '0 4px 12px rgba(12, 22, 18, 0.08), 0 2px 4px rgba(12, 22, 18, 0.04)',
  lg: '0 12px 32px rgba(12, 22, 18, 0.12), 0 4px 8px rgba(12, 22, 18, 0.06)',
  glow: '0 0 0 1px rgba(176, 138, 60, 0.28), 0 8px 24px rgba(26, 92, 66, 0.12)',
} as const;

export const typography = {
  fontFamily:
    '"Segoe UI Variable", "Segoe UI", "Avenir Next", "Helvetica Neue", sans-serif',
  fontFamilyDisplay:
    '"Segoe UI Variable Display", "Segoe UI", "Iowan Old Style", Georgia, serif',
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

export const tokens = {
  color,
  space,
  radius,
  elevation,
  typography,
  motion,
  breakpoints,
} as const;

export type AtlasTokens = typeof tokens;
