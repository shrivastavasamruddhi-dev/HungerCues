/**
 * HungerCues Design Token System
 *
 * Single source of truth for all visual design decisions.
 * All values follow an 8pt grid system.
 * All text color values are WCAG AA compliant (4.5:1 minimum on white).
 *
 * Usage:
 *   import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from './designTokens';
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const Colors = {
  // Brand purple — primary identity color
  brand: {
    50:  '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7', // PRIMARY — replaces legacy C.purple (#C45BF2)
    600: '#9333EA', // hover / active states
    700: '#7C3AED', // dark variant
    800: '#6D28D9',
    900: '#5B21B6',
  },

  // Activity-specific semantic colors
  // Each activity has a distinct hue for instant recognition
  feed: {
    bg:   '#FFF7ED',
    text: '#C2410C',
    icon: '#F97316', // warm orange
  },
  sleep: {
    bg:   '#EEF2FF',
    text: '#4338CA',
    icon: '#6366F1', // deep indigo
  },
  diaper: {
    bg:   '#ECFEFF',
    text: '#0E7490',
    icon: '#22D3EE', // cyan
  },
  growth: {
    bg:   '#ECFDF5',
    text: '#047857',
    icon: '#10B981', // emerald
  },
  milestone: {
    bg:   '#FFFBEB',
    text: '#92400E',
    icon: '#F59E0B', // amber
  },

  // Semantic feedback colors
  success: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    700: '#15803D',
  },
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    700: '#B45309',
  },
  error: {
    50:  '#FFF1F2',
    100: '#FEE2E2',
    500: '#EF4444',
    700: '#B91C1C',
  },
  info: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    700: '#1D4ED8',
  },

  // Surface colors
  canvas:   '#F7F5F3', // warm off-white app background (easier on eyes than pure gray)
  surface:  '#FFFFFF', // card / modal background
  surface2: '#FAFAF9', // subtle secondary surface

  // Border colors
  border:       '#E8E4E0',
  borderStrong: '#D1CDC8',

  // Text colors — all verified WCAG AA compliant on white (#FFFFFF)
  textPrimary:   '#1A1714', // near-black, warmer than pure #111 — 17.7:1 on white
  textSecondary: '#6B6360', // replaces C.muted #8D8D8D — 4.6:1 on white (WCAG AA ✓)
  textTertiary:  '#9D9896', // decorative / disabled text only — do not use for body text
  textInverse:   '#FFFFFF', // text on dark/brand backgrounds
  textBrand:     '#7C3AED', // brand-colored text links and labels
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
// 8pt grid system. All spacing values are multiples of 4.

export const Spacing = {
  1:   4,  // micro gaps, icon internal padding
  2:   8,  // tight gaps within components
  3:  12,  // inner card padding, small component gaps
  4:  16,  // standard screen gutters, component padding
  5:  20,  // card padding, section gaps
  6:  24,  // between sections
  7:  32,  // major section breaks
  8:  40,  // hero sections
  9:  48,  // screen-level spacing
  10: 64,  // modal headers, large hero heights
} as const;

// ─── Border Radii ─────────────────────────────────────────────────────────────

export const Radii = {
  sm:   8,    // chips, small badges, tags
  md:   12,   // form inputs, small cards
  lg:   16,   // standard cards, modal inner elements
  xl:   20,   // large cards
  '2xl': 28,  // bottom sheets, feature cards
  full: 9999, // pills, circular avatars
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FontSize = {
  xs:   11, // MINIMUM — labels, captions, legal text
  sm:   13, // secondary body text, hints
  base: 15, // primary body text, form inputs
  md:   17, // card titles, important labels
  lg:   20, // screen titles, modal headers
  xl:   24, // hero numbers, big stats
  '2xl': 28, // hero headlines
  '3xl': 36, // display numbers (use allowFontScaling={false} for these)
} as const;

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
} as const;

export const LineHeight = {
  xs:   16,
  sm:   18,
  base: 22,
  md:   24,
  lg:   28,
  xl:   32,
  '2xl': 36,
  '3xl': 44,
} as const;

export const LetterSpacing = {
  tight:   -0.5, // display text
  normal:   0,
  wide:     0.5, // labels, capitalized text
  widest:   1.0, // eyebrow labels (ALL CAPS small labels)
} as const;

// ─── Minimum Touch Target ────────────────────────────────────────────────────
// Apple HIG and WCAG 2.5.5 minimum: 44pt × 44pt

export const MinTouchTarget = 44;

// ─── Elevation / Shadows ─────────────────────────────────────────────────────

export const Shadow = {
  sm: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius:  12,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius:  24,
    elevation:     8,
  },
  xl: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius:  40,
    elevation:     12,
  },
  // Brand-tinted shadow for primary CTAs
  brand: {
    shadowColor:   '#A855F7',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius:  20,
    elevation:     8,
  },
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────

export const Duration = {
  fast:   150, // state changes: hover, press feedback
  normal: 250, // transitions, modal slide
  slow:   400, // complex animations
  extra:  600, // onboarding, milestone celebrations
} as const;

// ─── Legacy Alias ─────────────────────────────────────────────────────────────
// Provides backward compatibility for components still using the old C.* constants.
// Migrate components to use Colors.* directly.

export const C = {
  ink:        Colors.textPrimary,
  muted:      Colors.textSecondary,   // FIXED: was #8D8D8D (3.5:1 fail) → now #6B6360 (4.6:1 ✓)
  canvas:     Colors.canvas,
  card:       Colors.surface,
  purple:     Colors.brand[500],      // FIXED: was #C45BF2 → now #A855F7
  purpleDark: Colors.brand[700],
  purpleSoft: Colors.brand[100],
  line:       Colors.border,
} as const;
