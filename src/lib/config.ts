/**
 * Configuration constants for ChopTube
 * These values are used automatically even when UI controls are hidden
 */

// BPM Configuration
export const BPM_CONFIG = {
  /** Default BPM when not specified */
  DEFAULT_BPM: 120,
  /** Default reference BPM for rate calculations */
  DEFAULT_REFERENCE_BPM: 120,
  /** Whether to quantize rates to YouTube allowed values by default */
  DEFAULT_QUANTIZE_TO_YOUTUBE_RATES: true,
  /** Minimum BPM for validation */
  MIN_BPM: 60,
  /** Maximum BPM for validation */
  MAX_BPM: 200,
} as const;

// Preload Configuration
export const PRELOAD_CONFIG = {
  /** Duration of preroll play in milliseconds */
  PREROLL_DURATION_MS: 350,
  /** How many seconds before cue to seek for preroll */
  PREROLL_BACK_SECONDS: 1.0,
  /** Lookahead time in milliseconds for scheduling */
  LOOKAHEAD_MS: 120,
  /** Minimum loaded fraction to consider track ready */
  READY_THRESHOLD_FRACTION: 0.05,
  /** Maximum number of hidden preloaded players */
  MAX_HIDDEN_PRELOADED_PLAYERS: 4,
  /** Timeout for preroll operations in milliseconds */
  PREROLL_TIMEOUT_MS: 1500,
} as const;

// YouTube Configuration
export const YOUTUBE_CONFIG = {
  /** Allowed playback rates for YouTube */
  ALLOWED_RATES: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const,
  /** Default playback rate */
  DEFAULT_RATE: 1.0,
} as const;

// Clock Configuration
export const CLOCK_CONFIG = {
  /** Default BPM for clock */
  DEFAULT_BPM: 120,
  /** Minimum interval between clock ticks in milliseconds */
  MIN_TICK_INTERVAL: 16,
} as const;

// UI Configuration
export const UI_CONFIG = {
  /** Default dev UI state */
  DEFAULT_DEV_UI: false,
  /** Local storage key for dev UI */
  DEV_UI_STORAGE_KEY: 'choptube.dev',
} as const;