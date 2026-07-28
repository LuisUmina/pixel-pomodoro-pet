/**
 * Minimal key/value port.
 *
 * The widget only needs to remember a handful of preferences, so `localStorage`
 * is plenty. Everything goes through this interface so swapping in the Tauri
 * store plugin later touches one file.
 */
export interface JsonStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

/** Never throws: a full or blocked storage must not take the timer down. */
export const browserStore: JsonStore = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Preferences are a convenience; losing them is not worth a crash.
    }
  },
};

export const memoryStore = (): JsonStore => {
  const values = new Map<string, unknown>();

  return {
    get: (key) => values.get(key),
    set: (key, value) => void values.set(key, value),
  };
};
