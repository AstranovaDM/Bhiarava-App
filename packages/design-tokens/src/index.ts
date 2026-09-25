/**
 * Bhairava design tokens — "The Luminous Engine".
 *
 * Framework-agnostic values shared by web (`@bhairava/ui-web`) and mobile
 * (`@bhairava/ui-mobile`). Web consumers get the same values as CSS custom
 * properties from `@bhairava/design-tokens/tokens.css` (see `cssVar` below for
 * the variable names).
 *
 * The surface ladder, primary green and luminous green are LOCKED brand values.
 * Change them only with design sign-off; `tokens.css` must stay in sync
 * (enforced by `tokens.test.ts`).
 */

/* --------------------------------- surfaces -------------------------------- */

/** Locked tonal surface ladder. Separation comes from tonal shifts, not borders. */
export const surfaces = {
  /** App background. */
  base: '#F8F9FF',
  /** Section / sidebar / tonal panels. */
  section: '#EFF4FF',
  /** Cards on a section, inputs, chips. */
  card: '#E5EEFF',
  /** Selected / pressed / highest emphasis surface. */
  selected: '#D3E4FE',
  /** Raised panels, sheets, popovers. */
  white: '#FFFFFF',
} as const;

/* ---------------------------------- palette -------------------------------- */

/** Locked brand greens. */
export const brand = {
  primary: '#006D32',
  luminous: '#00D166',
} as const;

export const palette = {
  primary: brand.primary,
  primaryForeground: '#FFFFFF',
  primaryLuminous: brand.luminous,
  primaryContainer: '#BAECCA',
  onPrimaryContainer: '#003416',

  secondary: '#116BB5',
  secondaryForeground: '#F9FCFF',
  secondaryContainer: '#C6E1FF',

  gold: '#E4AD3C',
  goldForeground: '#462400',
  goldContainer: '#FBE6B3',

  foreground: '#0D2036',
  mutedForeground: '#5B6A7D',
  outlineVariant: '#ABB9CB',

  destructive: '#D02B31',
  destructiveForeground: '#FFF9F8',
  warning: '#DA950B',
  warningForeground: '#3C2200',
  success: '#00884B',
  successForeground: '#FFFFFF',
} as const;

/** Dark theme counterparts (web `.dark` class). Brand greens stay recognisable. */
export const darkPalette = {
  surfaces: {
    base: '#0A1421',
    section: '#101B29',
    card: '#162232',
    selected: '#1E2C3E',
    white: '#030C17',
    bright: '#202F42',
    highest: '#27374A',
  },
  primary: brand.luminous,
  primaryForeground: '#01210F',
  primaryContainer: '#00522A',
  onPrimaryContainer: '#BAECCA',
  secondary: '#53B6EB',
  secondaryForeground: '#010E1E',
  secondaryContainer: '#1B3C5D',
  gold: '#E9BE57',
  goldForeground: '#331700',
  goldContainer: '#684600',
  foreground: '#EDF2F9',
  mutedForeground: '#98A6B8',
  outlineVariant: '#4A5666',
} as const;

export const chart = {
  1: brand.primary,
  2: '#2EA2E5',
  3: palette.gold,
  4: brand.luminous,
  5: '#153470',
} as const;

/* -------------------------------- plot status ------------------------------ */

/**
 * Canonical plot status colors. Mirrors `@bhairava/domain`
 * (`canonicalPlotStatusSolid/Fill/Ink`) so RN and plain-CSS consumers don't
 * need the domain package; `tokens.test.ts` guards against drift.
 */
export const PLOT_STATUS_KEYS = [
  'AVAILABLE',
  'RESERVED',
  'BOOKED',
  'UNDER_DOCUMENTATION',
  'SOLD',
  'REGISTERED',
  'RESALE_AVAILABLE',
  'BLOCKED',
  'CANCELLED',
] as const;

export type PlotStatusKey = (typeof PLOT_STATUS_KEYS)[number];

export const plotStatusSolid: Record<PlotStatusKey, string> = {
  AVAILABLE: '#4CAF7D',
  RESERVED: '#F2B84B',
  BOOKED: '#3B82F6',
  UNDER_DOCUMENTATION: '#0EA5E9',
  SOLD: '#6366F1',
  REGISTERED: '#7657D5',
  RESALE_AVAILABLE: '#D85C8A',
  BLOCKED: '#94A3B8',
  CANCELLED: '#EF4444',
};

export const plotStatusFill: Record<PlotStatusKey, string> = {
  AVAILABLE: '#BFE5D1',
  RESERVED: '#F6D89A',
  BOOKED: '#A9D2FF',
  UNDER_DOCUMENTATION: '#BAE6FD',
  SOLD: '#C7D2FE',
  REGISTERED: '#C4B5F4',
  RESALE_AVAILABLE: '#F0B6CB',
  BLOCKED: '#E2E8F0',
  CANCELLED: '#FECACA',
};

export const plotStatusInk: Record<PlotStatusKey, string> = {
  AVAILABLE: '#2E7A52',
  RESERVED: '#8A6414',
  BOOKED: '#1D4ED8',
  UNDER_DOCUMENTATION: '#0369A1',
  SOLD: '#4338CA',
  REGISTERED: '#4F3AA8',
  RESALE_AVAILABLE: '#9A3A62',
  BLOCKED: '#475569',
  CANCELLED: '#B91C1C',
};

/* ------------------------------ aggregate colors ---------------------------- */

export const colors = {
  surface: surfaces,
  brand: {
    primary: brand.primary,
    luminous: brand.luminous,
    accent: palette.gold,
    danger: palette.destructive,
  },
  ...palette,
  chart,
  /** Solid plot status colors (legend dots, map strokes). */
  plotStatus: plotStatusSolid,
  plotStatusFill,
  plotStatusInk,
} as const;

/* -------------------------------- gradients -------------------------------- */

export const gradients = {
  primary: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primary} 35%, ${brand.luminous} 130%)`,
  luminous: `linear-gradient(135deg, ${brand.luminous}, ${brand.primary})`,
  flow: `linear-gradient(135deg, ${palette.secondary}, #62C8DF)`,
  gold: 'linear-gradient(135deg, #CC8730, #F2CE59)',
} as const;

/* -------------------------------- typography ------------------------------- */

/** Space Grotesk for headings and major values; Inter for UI and body copy. */
export const fonts = {
  display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
} as const;

/** Bare family names (React Native `fontFamily`, font loaders). */
export const fontFamilies = {
  display: 'Space Grotesk',
  sans: 'Inter',
} as const;

export const FONT_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Pixel sizes used across the MAIN visual system. */
export const fontSizes = {
  micro: 10,
  eyebrow: 11,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  pageTitleMobile: 22,
  metric: 26,
  pageTitle: 32,
  recordTitle: 34,
  metricLg: 40,
} as const;

export const letterSpacing = {
  /** Display headings / big numbers. */
  display: '-0.03em',
  heading: '-0.02em',
  /** Uppercase eyebrow labels. */
  eyebrow: '0.16em',
  label: '0.1em',
} as const;

/* --------------------------------- spacing --------------------------------- */

/** 4px base grid. Named aliases kept for existing consumers. */
export const spacing = {
  none: 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/* ---------------------------------- radius --------------------------------- */

/** Moderate radius. Base `--radius` is 0.5rem (8px); steps mirror the Tailwind theme. */
export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  '4xl': 24,
  full: 9999,
} as const;

/* ---------------------------------- shadows -------------------------------- */

/** Subtle ambient shadows tinted with the foreground ink (never pure black). */
export const shadows = {
  ambient: '0 18px 40px -18px rgba(13, 32, 54, 0.14)',
  float: '0 24px 60px -24px rgba(13, 32, 54, 0.22)',
  glow: '0 0 0 1px rgba(0, 109, 50, 0.18), 0 12px 32px -12px rgba(0, 209, 102, 0.45)',
} as const;

/** React Native equivalents of `shadows`. */
export const nativeShadows = {
  ambient: {
    shadowColor: palette.foreground,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  float: {
    shadowColor: palette.foreground,
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
} as const;

/* ---------------------------------- motion --------------------------------- */

export const motion = {
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fast: 180,
  base: 220,
  rise: 420,
} as const;

/* ------------------------------- layout chrome ----------------------------- */

export const layout = {
  sidebarWidth: 256,
  topbarHeight: 64,
  mobileNavHeight: 68,
  wizardActionHeight: 72,
  /** Mobile/desktop breakpoint used by the app shell (Tailwind `lg`). */
  desktopBreakpoint: 1024,
} as const;

/* ------------------------------ CSS variable names -------------------------- */

/** CSS custom properties defined by `tokens.css` (and `@bhairava/ui-web/styles.css`). */
export const cssVar = {
  surface: '--surface',
  surfaceBright: '--surface-bright',
  surfaceLowest: '--surface-lowest',
  surfaceLow: '--surface-low',
  surfaceC: '--surface-c',
  surfaceHigh: '--surface-high',
  surfaceHighest: '--surface-highest',
  onSurfaceTint: '--on-surface-tint',
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  primaryLuminous: '--primary-luminous',
  primaryContainer: '--primary-container',
  onPrimaryContainer: '--on-primary-container',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  secondaryContainer: '--secondary-container',
  gold: '--gold',
  goldForeground: '--gold-foreground',
  goldContainer: '--gold-container',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  outlineVariant: '--outline-variant',
  border: '--border',
  ring: '--ring',
  radius: '--radius',
  fontDisplay: '--font-display-family',
  fontSans: '--font-sans-family',
  gradientPrimary: '--gradient-primary',
  gradientLuminous: '--gradient-luminous',
  gradientFlow: '--gradient-flow',
  gradientGold: '--gradient-gold',
  mobileNavHeight: '--mobile-nav-height',
  /** Plot status: `--plot-<status>`, `--plot-<status>-fill`, `--plot-<status>-ink`. */
  plotStatus: (status: PlotStatusKey, variant: 'solid' | 'fill' | 'ink' = 'solid') =>
    `--plot-${status.toLowerCase().replace(/_/g, '-')}${variant === 'solid' ? '' : `-${variant}`}`,
} as const;

export const tokens = {
  colors,
  surfaces,
  brand,
  palette,
  darkPalette,
  gradients,
  fonts,
  fontFamilies,
  fontWeights,
  fontSizes,
  letterSpacing,
  spacing,
  radius,
  shadows,
  nativeShadows,
  motion,
  layout,
} as const;

export default tokens;
