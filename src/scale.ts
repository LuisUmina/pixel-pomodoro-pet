/**
 * Widget scale, shared by the store, the UI and the window bridge.
 *
 * The bounds are mirrored in `src-tauri/src/window.rs`, which clamps again:
 * the shell cannot trust a number that came out of storage.
 */

export const MIN_UI_SCALE = 0.7;
export const MAX_UI_SCALE = 2;
export const DEFAULT_UI_SCALE = 1;

/** Width of the widget at 100%, used to turn drag distance into scale. */
export const BASE_WIDGET_WIDTH = 300;

/** Offered as one-click presets in the settings panel. */
export const UI_SCALE_PRESETS = [0.8, 1, 1.25, 1.5] as const;

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_UI_SCALE;
  }

  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, value));
}

export function formatScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
