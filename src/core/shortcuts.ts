export type ShortcutAction = "toggle" | "skip" | "reset" | "ghost" | "mini" | "hide";

export interface ShortcutDefinition {
  readonly id: ShortcutAction;
  readonly label: string;
  readonly defaultShortcut: string;
}

export type ShortcutMap = Record<ShortcutAction, string>;

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  { id: "toggle", label: "Start / Pause", defaultShortcut: "Ctrl+Alt+Space" },
  { id: "skip", label: "Skip phase", defaultShortcut: "Ctrl+Alt+N" },
  { id: "reset", label: "Reset phase", defaultShortcut: "Ctrl+Alt+R" },
  { id: "ghost", label: "Click-through", defaultShortcut: "Ctrl+Alt+G" },
  { id: "mini", label: "Mascot mode", defaultShortcut: "Ctrl+Alt+Z" },
  { id: "hide", label: "Hide / show", defaultShortcut: "Ctrl+Alt+H" },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  toggle: "Ctrl+Alt+Space",
  skip: "Ctrl+Alt+N",
  reset: "Ctrl+Alt+R",
  ghost: "Ctrl+Alt+G",
  mini: "Ctrl+Alt+Z",
  hide: "Ctrl+Alt+H",
};

export function isShortcutAction(key: string): key is ShortcutAction {
  return SHORTCUT_DEFINITIONS.some((def) => def.id === key);
}

/**
 * Normalizes user-typed or captured key strings into canonical representation (e.g. "Ctrl+Alt+G").
 */
export function normalizeShortcut(str: string): string {
  if (!str) return "";
  const parts = str
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

  const modifiers: string[] = [];
  let key = "";

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") {
      if (!modifiers.includes("Ctrl")) modifiers.push("Ctrl");
    } else if (lower === "alt" || lower === "option") {
      if (!modifiers.includes("Alt")) modifiers.push("Alt");
    } else if (lower === "shift") {
      if (!modifiers.includes("Shift")) modifiers.push("Shift");
    } else if (lower === "meta" || lower === "super" || lower === "cmd" || lower === "win") {
      if (!modifiers.includes("Super")) modifiers.push("Super");
    } else {
      if (lower === "space") {
        key = "Space";
      } else if (lower.length === 1) {
        key = lower.toUpperCase();
      } else {
        key = part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
  }

  const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Super"];
  modifiers.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));

  if (!key) return modifiers.join("+");
  return [...modifiers, key].join("+");
}

/**
 * Checks for conflicts between actions in a shortcut map.
 * Returns a map from action ID to conflicting action ID (or null if no conflict).
 */
export function findShortcutConflicts(
  shortcuts: Record<string, string>,
): Record<ShortcutAction, ShortcutAction | null> {
  const normalizedMap: Partial<Record<ShortcutAction, string>> = {};
  for (const def of SHORTCUT_DEFINITIONS) {
    const raw = shortcuts[def.id];
    normalizedMap[def.id] = typeof raw === "string" ? normalizeShortcut(raw) : "";
  }

  const conflicts: Record<ShortcutAction, ShortcutAction | null> = {
    toggle: null,
    skip: null,
    reset: null,
    ghost: null,
    mini: null,
    hide: null,
  };

  const entries = Object.entries(normalizedMap) as Array<[ShortcutAction, string]>;

  for (let i = 0; i < entries.length; i++) {
    const itemA = entries[i];
    if (!itemA) continue;
    const [act1, val1] = itemA;
    if (!val1) continue;

    for (let j = i + 1; j < entries.length; j++) {
      const itemB = entries[j];
      if (!itemB) continue;
      const [act2, val2] = itemB;
      if (!val2) continue;

      if (val1.toLowerCase() === val2.toLowerCase()) {
        conflicts[act1] = act2;
        conflicts[act2] = act1;
      }
    }
  }

  return conflicts;
}

/**
 * Reads shortcut preferences defensively:
 * Validates each action shortcut. If invalid or conflicting, falls back to DEFAULT_SHORTCUTS.
 */
export function readShortcuts(value: unknown): ShortcutMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_SHORTCUTS };
  }

  const raw = value as Record<string, unknown>;
  const result: Partial<ShortcutMap> = {};

  for (const def of SHORTCUT_DEFINITIONS) {
    const val = raw[def.id];
    if (typeof val === "string" && val.trim().length > 0) {
      result[def.id] = normalizeShortcut(val);
    } else {
      result[def.id] = def.defaultShortcut;
    }
  }

  const fullMap = result as ShortcutMap;
  const conflicts = findShortcutConflicts(fullMap);

  // If any conflicts exist in loaded storage, fall back conflicting ones to defaults
  for (const def of SHORTCUT_DEFINITIONS) {
    if (conflicts[def.id] !== null) {
      fullMap[def.id] = def.defaultShortcut;
    }
  }

  return fullMap;
}
