import type { Phase, TimerStatus } from "../core/types";
import type { Language } from "../i18n/language";

/**
 * The chrome fields `Widget.render` can skip writing when a 250ms tick only
 * moved `remainingMs`. Clock digits still paint every time; this is the rest
 * of the card (datasets, labels, aria, character lookup).
 */
export interface WidgetChromeFields {
  readonly phase: Phase;
  readonly status: TimerStatus;
  readonly round: number;
  readonly roundsPerCycle: number;
  readonly completedToday: number;
  readonly dailyGoal: number;
  readonly language: Language;
  readonly ghost: boolean;
  readonly quietMinutesLeft: number;
  readonly soundEnabled: boolean;
  readonly miniMode: boolean;
  readonly taskChecklist: boolean;
  readonly characterId: string;
}

export function widgetChromeFields(model: {
  readonly state: {
    readonly phase: Phase;
    readonly status: TimerStatus;
    readonly round: number;
    readonly completedToday: number;
  };
  readonly settings: { readonly roundsPerCycle: number };
  readonly dailyGoal: number;
  readonly language: Language;
  readonly ghost: boolean;
  readonly quietMinutesLeft: number;
  readonly soundEnabled: boolean;
  readonly miniMode: boolean;
  readonly taskChecklist: boolean;
  readonly characterId: string;
}): WidgetChromeFields {
  return {
    phase: model.state.phase,
    status: model.state.status,
    round: model.state.round,
    roundsPerCycle: model.settings.roundsPerCycle,
    completedToday: model.state.completedToday,
    dailyGoal: model.dailyGoal,
    language: model.language,
    ghost: model.ghost,
    quietMinutesLeft: model.quietMinutesLeft,
    soundEnabled: model.soundEnabled,
    miniMode: model.miniMode,
    taskChecklist: model.taskChecklist,
    characterId: model.characterId,
  };
}

export interface WidgetChromeWrites {
  readonly phase: boolean;
  readonly status: boolean;
  readonly path: boolean;
  readonly phaseLabel: boolean;
  readonly toggle: boolean;
  readonly tally: boolean;
  readonly sound: boolean;
  readonly ghost: boolean;
  readonly mini: boolean;
  readonly checklist: boolean;
  readonly character: boolean;
}

export function widgetChromeWrites(
  prev: WidgetChromeFields | null,
  next: WidgetChromeFields,
): WidgetChromeWrites {
  if (prev === null) {
    return {
      phase: true,
      status: true,
      path: true,
      phaseLabel: true,
      toggle: true,
      tally: true,
      sound: true,
      ghost: true,
      mini: true,
      checklist: true,
      character: true,
    };
  }

  const language = prev.language !== next.language;

  return {
    phase: prev.phase !== next.phase,
    status: prev.status !== next.status,
    path:
      prev.phase !== next.phase ||
      prev.ghost !== next.ghost ||
      prev.quietMinutesLeft !== next.quietMinutesLeft ||
      language,
    phaseLabel:
      prev.phase !== next.phase ||
      prev.round !== next.round ||
      prev.roundsPerCycle !== next.roundsPerCycle ||
      language,
    toggle: prev.status !== next.status || language,
    tally:
      prev.completedToday !== next.completedToday ||
      prev.dailyGoal !== next.dailyGoal ||
      language,
    sound: prev.soundEnabled !== next.soundEnabled,
    ghost: prev.ghost !== next.ghost,
    mini: prev.miniMode !== next.miniMode,
    checklist: prev.taskChecklist !== next.taskChecklist,
    character: prev.characterId !== next.characterId,
  };
}

export function progressWidthChanged(current: string, next: string): boolean {
  return current !== next;
}
