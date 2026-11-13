/** Tunables for the whole game. Values the rule books pin down are marked EXACT. */

/** EXACT 8000 - timer-driven, no tap-to-skip, no early exit (rule 2.1). */
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
