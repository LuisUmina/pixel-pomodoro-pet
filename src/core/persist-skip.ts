/**
 * Tick-path helpers so `save()` can skip allocating a new preferences object
 * and skip `JSON.stringify` when nothing the store cares about has moved.
 */

export function withCompletedToday<T extends { readonly completedToday: number }>(
  preferences: T,
  completedToday: number,
): T {
  if (preferences.completedToday === completedToday) {
    return preferences;
  }

  return { ...preferences, completedToday };
}

/** True when the live object is still the last one `save()` already saw. */
export function preferencesUnchanged<T>(current: T, saved: T): boolean {
  return current === saved;
}
