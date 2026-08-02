/**
 * How opaque the widget goes once auto-fade kicks in, mirroring `scale.ts`:
 * a small numeric preference with clean presets, one of which doubles as the
 * shipped default.
 */

export const MIN_DIM_OPACITY = 0;
export const MAX_DIM_OPACITY = 1;
export const DEFAULT_DIM_OPACITY = 0.4;

/** Offered in settings; 0 turns auto-fade off entirely. */
export const DIM_OPACITY_PRESETS = [0, 0.2, 0.4, 0.65] as const;

export function clampDimOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DIM_OPACITY;
  }

  return Math.min(MAX_DIM_OPACITY, Math.max(MIN_DIM_OPACITY, value));
}

export function formatDimOpacity(value: number): string {
  return value <= 0 ? "OFF" : `${Math.round(value * 100)}%`;
}
