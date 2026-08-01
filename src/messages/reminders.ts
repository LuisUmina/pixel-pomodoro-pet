import type { Phase } from "../core/types";
import raw from "./reminders.json";
import { MAX_LINE_LENGTH } from "./types";

const PHASES: readonly Phase[] = ["focus", "shortBreak", "longBreak"];

export interface ReminderPack {
  readonly id: string;
  /** Shown next to its switch in settings. */
  readonly label: string;
  readonly hint: string;
  /** Phases this pack is allowed to interrupt. */
  readonly phases: readonly Phase[];
  readonly everyMinutes: number;
  readonly enabledByDefault: boolean;
  readonly lines: readonly string[];
}

/**
 * Parses the bundled packs, refusing anything malformed — same reasoning as
 * the dialogue catalogue: our own data should break a test, not go missing.
 */
export function parsePacks(value: unknown): readonly ReminderPack[] {
  if (!Array.isArray(value)) {
    throw new Error("the reminder packs must be an array");
  }

  const seen = new Set<string>();

  return value.map((entry, index) => {
    const pack = parsePack(entry, index);
    if (seen.has(pack.id)) {
      throw new Error(`duplicate reminder pack "${pack.id}"`);
    }

    seen.add(pack.id);
    return pack;
  });
}

export const REMINDER_PACKS: readonly ReminderPack[] = parsePacks(raw);

function parsePack(value: unknown, index: number): ReminderPack {
  if (!isRecord(value)) {
    throw new Error(`reminder pack ${index} is not an object`);
  }

  const id = text(value["id"], `pack ${index}`, "id");
  const label = text(value["label"], id, "label");
  const hint = text(value["hint"], id, "hint");

  const phases = value["phases"];
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error(`reminder pack "${id}" needs at least one phase`);
  }

  for (const phase of phases) {
    if (!PHASES.includes(phase as Phase)) {
      throw new Error(`reminder pack "${id}" names an unknown phase`);
    }
  }

  const everyMinutes = value["everyMinutes"];
  if (typeof everyMinutes !== "number" || !Number.isInteger(everyMinutes) || everyMinutes < 1) {
    throw new Error(`reminder pack "${id}" needs a whole-minute cadence`);
  }

  const enabledByDefault = value["enabledByDefault"];
  if (typeof enabledByDefault !== "boolean") {
    throw new Error(`reminder pack "${id}" needs enabledByDefault`);
  }

  const lines = value["lines"];
  if (!Array.isArray(lines) || lines.length < 2) {
    // One line would repeat verbatim every single time it fires.
    throw new Error(`reminder pack "${id}" needs at least two lines`);
  }

  for (const line of lines) {
    if (typeof line !== "string" || line.trim() === "") {
      throw new Error(`reminder pack "${id}" has an empty line`);
    }

    if (line.length > MAX_LINE_LENGTH) {
      throw new Error(`a line in "${id}" is longer than ${MAX_LINE_LENGTH} characters`);
    }
  }

  return {
    id,
    label,
    hint,
    phases: phases as readonly Phase[],
    everyMinutes,
    enabledByDefault,
    lines: lines as readonly string[],
  };
}

function text(value: unknown, owner: string, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`reminder ${owner} has no ${field}`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
