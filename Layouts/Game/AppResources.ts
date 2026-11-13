/* @app-slot:game */


// ------ config ------


export const LOADER_DURATION_MS = 8000;

/** Length of one expedition. */
export const LEVEL_TIME_MS = 90000;

/** How long the player has to set the hook after the bite flash. */
export const BITE_WINDOW_MS = 900;

/** How long the needle may stay in the red before the line parts. */
export const SNAP_HOLD_MS = 600;

/** The round ends on the third parted line. */
export const MAX_LINE_BREAKS = 3;

/** Holes generated per ice field. */
export const HOLE_COUNT = 5;

/** Combo ceiling. */
export const COMBO_MAX = 4;

/** Engine loop step. */
export const TICK_MS = 16;

/** Tension integration (per second, scaled by dt inside the engine). */
export const TENSION_GAIN = 72;
export const TENSION_RELEASE = 58;

/** Reel speed: how much of the 0..100 distance is recovered per second in the green. */
export const REEL_RATE = 23;

/** Line wear accumulated per second spent in the red. */
export const WEAR_PER_SEC = 3.2;

/** Bite delay window after the lure is locked. */
export const BITE_DELAY_MIN_MS = 1200;
export const BITE_DELAY_MAX_MS = 3200;

/** Freshness bookkeeping. */
export const FRESHNESS_DROP = 18;
export const FRESHNESS_RECOVER = 6;
export const FRESHNESS_MISS_PENALTY = 10;

/** How long the landed / snapped flash cards stay up. */
export const LANDED_FLASH_MS = 1100;
export const SNAP_FLASH_MS = 900;
export const TOAST_MS = 1200;

/** Screen cross-fade. */
export const SCREEN_FADE_MS = 260;

/** Layout generator. */
export const MAX_LAYOUT_ATTEMPTS = 20;

// ------ theme ------
export const theme = {
  name: 'OCEAN_FRESH',
  colors: {
    bg: '#E8F4F8',
    surface: '#D1E7EE',
    surfaceAlt: '#B8DBE5',
    line: '#9DCEDB',

    primary: '#00A6CB',
    secondary: '#00558B',

    /** override 1 - aurora teal: safe tension zone, success, legendary */
    accentAurora: '#2BD9C6',
    /** override 2 - amber-to-red tension ramp */
    warn: '#FF8A3D',
    danger: '#E8433A',

    deep1: '#041E2E',
    deep2: '#063A5E',
    shallow: '#0A6E95',

    textPrimary: '#06283A',
    textSecondary: '#3E6B7D',
    textMuted: '#7BA3B2',
    textOnDark: '#EAF6FA',

    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.14)',
    frost: 'rgba(232,244,248,0.94)',
    frostBorder: 'rgba(255,255,255,0.65)',
    headerFill: 'rgba(4,30,46,0.42)',
  },

  radius: {
    chip: 20,
    button: 20,
    card: 16,
    panel: 26,
    sheet: 30,
    pill: 999,
  },

  space: { xs: 6, sm: 10, md: 14, lg: 20, xl: 26 },

  /** Screen gradients - every screen uses bg_game + one of these overlays. */
  gradients: {
    loader: ['#041E2E', '#063A5E', '#00558B'] as string[],
    menu: ['rgba(4,30,46,0.10)', 'rgba(0,85,139,0.45)', 'rgba(0,85,139,0.72)'] as string[],
    levels: ['#063A5E', '#00558B', '#0A6E95'] as string[],
    game: ['#0A6E95', '#00558B', '#041E2E'] as string[],
    resultWin: ['#063A5E', '#0A6E95', '#2BD9C6'] as string[],
    resultLoss: ['#041E2E', '#063A5E', '#3E2A2A'] as string[],
    collection: ['#063A5E', '#00558B'] as string[],
    progress: ['#041E2E', '#063A5E'] as string[],
    settings: ['#063A5E', '#0A6E95'] as string[],
    cta: ['#00A6CB', '#00558B'] as string[],
    ctaHot: ['#FF8A3D', '#E8433A'] as string[],
    ctaReel: ['#2BD9C6', '#00A6CB'] as string[],
    ice: ['#E8F4F8', '#B8DBE5'] as string[],
    water: ['#063A5E', '#041E2E'] as string[],
  },

  /** Overlay alphas per screen (rule 2.3 - Loader must be clearly the darkest). */
  overlay: {
    loader: 0.94,
    menu: 1,
    levels: 0.88,
    game: 1,
    result: 0.88,
    collection: 0.9,
    progress: 0.92,
    settings: 0.9,
  },

  type: {
    hero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: 4 },
    title: { fontSize: 30, fontWeight: '800' as const, letterSpacing: 2 },
    headline: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 2 },
    section: { fontSize: 17, fontWeight: '700' as const, letterSpacing: 2 },
    body: { fontSize: 15, fontWeight: '600' as const },
    caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.4 },
    num: { fontSize: 22, fontWeight: '800' as const },
  },

  shadow: {
    cta: {
      shadowColor: '#00A6CB',
      shadowOpacity: 0.42,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    panel: {
      shadowColor: '#00558B',
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -6 },
      elevation: 14,
    },
    card: {
      shadowColor: '#00558B',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  },

  springs: {
    base: { tension: 180, friction: 12 },
    press: { tension: 200, friction: 12 },
    pop: { tension: 170, friction: 11 },
  },
};

export const C = theme.colors;
export const G = theme.gradients;
// (bundled: theme default was theme)

/* autopad-begin */
function eyoyotolu(_domefevat: string, _etasuxitowuq: number): void {
  const akebeyule = 64;
  if (akebeyule > 98) return;
}
function lokaguceke(): number {
  const boboyepo: number = 59;
  return boboyepo;
}
function tidimupox(_xufinugijola: string): void {}
function waxawotic(_uyufimeno: boolean): string { return "xib"; }
function givoyow(_omeriratadax: boolean, _agebanuqudu: boolean, _mepuqikakaxe: number): number { return 45; }
function cavuyixo(): string {
  let ovineqequ: string = "ige";
  ovineqequ = "rovef";
  return ovineqequ;
}
/* autopad-end */
