/**
 * Design Tokens — Centralized Color Constants
 *
 * All hardcoded hex colors used across the application are defined here.
 * Components should import from this file instead of using inline hex values.
 * This ensures consistency, easy theming, and passes CSS lint checks.
 *
 * Naming convention: CATEGORY_SEMANTIC_NAME
 */

// ============================================================================
// SEMANTIC COLORS — used for status, actions, severity
// ============================================================================
export const COLORS = {
  // --- Status / Severity ---
  success:       '#10B981',
  successDark:   '#059669',
  successGreen:  '#22C55E',
  successGreenAlt: '#16A34A',
  successMui:    '#4caf50',

  warning:       '#F59E0B',
  warningDark:   '#D97706',
  warningAmber:  '#FFC107',
  warningMui:    '#ff9800',
  warningBrown:  '#92400E',
  warningBrownAlt: '#B45309',

  error:         '#EF4444',
  errorDark:     '#DC2626',
  errorMui:      '#f44336',

  info:          '#3B82F6',
  infoDark:      '#2563EB',
  infoLight:     '#60A5FA',
  infoLighter:   '#93C5FD',
  infoSky:       '#BAE6FD',
  infoSkyLight:  '#7DD3FC',
  infoMui:       '#1976d2',
  infoMuiAlt:    '#2196f3',

  orange:        '#F97316',
  orangeMui:     '#FF8C00',
  orangeDeep:    '#FF6600',

  // --- Entity / Category ---
  indigo:        '#6366F1',
  violet:        '#8B5CF6',
  purple:        '#9c27b0',
  pink:          '#EC4899',
  cyan:          '#06B6D4',
  teal:          '#00bcd4',

  // --- Neutral / Gray ---
  gray50:        '#fafafa',
  gray100:       '#f5f5f5',
  gray200:       '#eeeeee',
  gray300:       '#D1D5DB',
  gray350:       '#d1d5db',
  gray400:       '#9CA3AF',
  gray400lc:     '#9ca3af',
  gray500:       '#6B7280',
  gray600:       '#616161',
  gray700:       '#757575',
  grayMui:       '#9E9E9E',
  grayMuiAlt:    '#9e9e9e',
  graySlate:     '#64748B',
  grayBlueGray:  '#607d8b',
  grayBrown:     '#795548',
  grayBrownAlt:  '#8d6e63',

  // --- White / Black ---
  white:         '#ffffff',
  whiteSmoke:    '#F0F8FF',
  darkBg:        '#2a2a2a',

  // --- Brand / Accent ---
  brandPrimary:  '#7367f0',
  brandOrange:   '#FFB400',

  // --- Booking / Calendar ---
  bookingBlue:   '#2563EB',

  // --- Map ---
  mapBlue:       '#1976d2',
  mapGreen:      '#4caf50',

  // --- Gallery ---
  galleryDark:   '#1e1e2e',
  galleryBrown:  '#A47148',
  galleryTeal:   '#0D9394',
  galleryPink:   '#EB3D63',

  // --- Common utility colors ---
  black:         '#000000',
  nearBlack:     '#111111',
  textDark:      '#222222',
  separator:     '#dddddd',
  placeholder:   '#aaaaaa',
  disabledText:  '#adadad',
  overlayLight:  '#f3f3f3',
  overlayDark:   'rgba(0,0,0,0.5)',
  overlayDarker: 'rgba(0,0,0,0.8)',
} as const

// ============================================================================
// ALPHA VARIANTS — colors with transparency
// ============================================================================
export const ALPHA = {
  errorBg:       '#EF444411',
  errorBgMed:    '#EF444422',
  errorBgHeavy:  '#EF444433',
  errorBgDense:  '#EF444444',

  warningBg:     '#F59E0B11',
  warningBgMed:  '#F59E0B22',
  warningBgHeavy:'#F59E0B33',
  warningBgLight:'#F59E0B50',

  infoBg:        '#3B82F622',
  infoBgAlpha:   '#3B82F660',
  infoDarkAlpha: '#1D4ED870',
  infoLightAlpha:'#60A5FA50',
  infoSkyAlpha:  '#7DD3FC50',

  successBg:     '#10B98122',

  violetBg:      '#8B5CF622',
  violetAlpha:   '#8B5CF670',

  orangeAlpha:   '#FF440066',
  orangeBrand:   '#FF8C00cc',
  orangeBrandAlt:'#FF8C00bb',

  grayAlpha:     '#6B728022',
  gray400Alpha:  '#9CA3AF40',
  gray500Alpha:  '#6B728040',

  yellowAlpha:   '#FBBF2460',

  errorBgRed50:  '#FEF2F2',
  errorBgRed100: '#FEE2E2',
  errorBgRed200: '#FECACA',

  warningBgAmber:'#FFFBEB',
  warningBgOrange:'#FFF7ED',
  yellowLight:   '#FDE68A',
  yellowMed:     '#FCD34D',

  purpleLight:   '#C4B5FD',
} as const

// ============================================================================
// WEATHER — gradient stops for weather backgrounds
// ============================================================================
export const WEATHER = {
  nightDark:     '#0f2744',
  nightMid:      '#1a4a6e',
  nightLight:    '#1e6091',
} as const

// ============================================================================
// PRIORITY COLORS — for PriorityBadge component
// ============================================================================
export const PRIORITY_COLORS = {
  urgent: COLORS.errorMui,
  high:   COLORS.warningMui,
  medium: COLORS.warningMui,
  low:    COLORS.graySlate,
  none:   COLORS.grayMuiAlt,
} as const

// ============================================================================
// CALENDAR EVENT COLORS — by entity type
// ============================================================================
export const CALENDAR_COLORS = {
  job:     COLORS.info,
  quote:   COLORS.violet,
  request: COLORS.warning,
  invoice: COLORS.success,
  default: COLORS.gray500,
} as const

// ============================================================================
// SKILL BADGE COLORS — for trade/skill badges
// ============================================================================
export const SKILL_COLORS = [
  COLORS.infoMuiAlt,   // #2196f3
  COLORS.warningMui,   // #ff9800
  COLORS.teal,         // #00bcd4
  COLORS.grayMuiAlt,   // #9e9e9e
  COLORS.grayBrown,    // #795548
  COLORS.errorMui,     // #f44336
  COLORS.purple,       // #9c27b0
  COLORS.successMui,   // #4caf50
  COLORS.grayBlueGray, // #607d8b
  COLORS.grayBrownAlt, // #8d6e63
  COLORS.gray700,      // #757575
  COLORS.gray600,      // #616161
] as const

// ============================================================================
// ENTITY ICON COLORS — for quick actions, entity badges, etc.
// ============================================================================
export const ENTITY_COLORS = {
  request:  COLORS.indigo,
  quote:    COLORS.warning,
  job:      COLORS.orange,
  invoice:  COLORS.success,
  client:   COLORS.info,
  vendor:   COLORS.violet,
  purchase: COLORS.pink,
  team:     COLORS.cyan,
} as const

// ============================================================================
// HISTORY ACTION COLORS — for entity history panels
// ============================================================================
export const HISTORY_COLORS = {
  created:       COLORS.success,
  updated:       COLORS.warning,
  deleted:       COLORS.error,
  statusChanged: COLORS.info,
  restored:      COLORS.success,
  assigned:      COLORS.indigo,
  completed:     COLORS.success,
  sent:          COLORS.orange,
  approved:      COLORS.info,
  rejected:      COLORS.violet,
  default:       COLORS.gray500,
} as const

// ============================================================================
// DASHBOARD CHART COLORS
// ============================================================================
export const CHART_COLORS = {
  primary:   COLORS.info,
  secondary: COLORS.violet,
  tertiary:  COLORS.successGreen,
  accent:    COLORS.warning,
  danger:    COLORS.error,
  neutral:   COLORS.graySlate,
  pink:      COLORS.pink,
  orange:    COLORS.orange,
} as const

// ============================================================================
// TASK PRIORITY COLORS
// ============================================================================
export const TASK_PRIORITY = {
  critical: COLORS.error,
  high:     COLORS.orange,
  medium:   COLORS.warning,
  low:      COLORS.gray500,
  done:     COLORS.success,
} as const

// ============================================================================
// FEEDBACK SENTIMENT COLORS
// ============================================================================
export const FEEDBACK_COLORS = {
  positive: COLORS.successGreenAlt,
  negative: COLORS.errorDark,
  neutral:  COLORS.gray500,
  pending:  COLORS.orange,
} as const
