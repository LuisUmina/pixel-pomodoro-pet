import "./ui/styles.css";

import { playChime } from "./audio/chime";
import { completionNotice } from "./core/format";
import { createInitialState, isBreak, reduce } from "./core/pomodoro";
import { Ticker } from "./core/ticker";
import type { Phase, PomodoroEvent } from "./core/types";
import { desktop } from "./platform/desktop";
import { SHELL_EVENTS } from "./platform/events";
import type { PetState } from "./sprites/duck";
import { applyThemeCss, getTheme, nextThemeId } from "./sprites/themes";
import { browserStore } from "./store/persistence";
import { isoDay, loadPreferences, savePreferences } from "./store/preferences";
import { AutoDim } from "./ui/auto-dim";
import { Widget } from "./ui/widget";

/** How long the duck keeps celebrating after a phase completes. */
const CELEBRATION_MS = 3_200;

function main(): void {
  let preferences = loadPreferences(browserStore, isoDay(new Date()));
  let theme = getTheme(preferences.themeId);
  let state = createInitialState(preferences.settings, {
    task: preferences.task,
    completedToday: preferences.completedToday,
  });

  let ghost = false;
  let celebrating = false;
  let celebrationTimer: ReturnType<typeof setTimeout> | null = null;

  applyThemeCss(theme, document.documentElement);

  const widget = new Widget({
    toggle: () => dispatch({ type: "toggle" }),
    skip: () => dispatch({ type: "skip" }),
    reset: () => dispatch({ type: "reset" }),
    setTask: (task) => dispatch({ type: "setTask", task }),
    cycleTheme: () => {
      theme = getTheme(nextThemeId(theme.id));
      preferences = { ...preferences, themeId: theme.id };
      applyThemeCss(theme, document.documentElement);
      save();
      render();
    },
    toggleSound: () => {
      preferences = { ...preferences, soundEnabled: !preferences.soundEnabled };
      save();
      if (preferences.soundEnabled) {
        playChime("start");
      }
      render();
    },
    toggleGhost: () => setGhost(!ghost),
    hide: () => desktop.hide(),
  });

  const ticker = new Ticker((elapsedMs) => dispatch({ type: "tick", elapsedMs }));
  const autoDim = new AutoDim(widget.frame);

  function dispatch(event: PomodoroEvent): void {
    rollOverDay();

    const wasRunning = state.status === "running";
    const transition = reduce(state, event, preferences.settings);
    state = transition.state;

    if (transition.completed) {
      announce(transition.completed);
    } else if (!wasRunning && state.status === "running" && preferences.soundEnabled) {
      playChime("start");
    }

    if (state.status === "running") {
      ticker.start();
    } else {
      ticker.stop();
    }

    autoDim.setEnabled(state.status === "running");
    save();
    render();
  }

  function announce(phase: Phase): void {
    const notice = completionNotice(phase);
    desktop.notify(notice.title, notice.body);

    if (preferences.soundEnabled) {
      playChime(phase === "focus" ? "focusDone" : "breakDone");
    }

    celebrating = true;
    if (celebrationTimer !== null) {
      clearTimeout(celebrationTimer);
    }
    celebrationTimer = setTimeout(() => {
      celebrating = false;
      render();
    }, CELEBRATION_MS);
  }

  function setGhost(enabled: boolean): void {
    ghost = enabled;
    desktop.setClickThrough(enabled);
    render();
  }

  /** Keeps the daily tally honest when the widget is left running overnight. */
  function rollOverDay(): void {
    const today = isoDay(new Date());
    if (today === preferences.day) {
      return;
    }

    preferences = { ...preferences, day: today, completedToday: 0 };
    state = { ...state, completedToday: 0 };
  }

  function petState(): PetState {
    if (celebrating) {
      return "celebrate";
    }
    if (state.status === "paused") {
      return "sleepy";
    }
    if (state.status === "running") {
      return isBreak(state.phase) ? "rest" : "focus";
    }

    return "idle";
  }

  function save(): void {
    preferences = {
      ...preferences,
      task: state.task,
      completedToday: state.completedToday,
    };
    savePreferences(browserStore, preferences);
  }

  function render(): void {
    widget.render({
      state,
      settings: preferences.settings,
      theme,
      petState: petState(),
      soundEnabled: preferences.soundEnabled,
      ghost,
    });
  }

  desktop.on(SHELL_EVENTS.toggle, () => dispatch({ type: "toggle" }));
  desktop.on(SHELL_EVENTS.skip, () => dispatch({ type: "skip" }));
  desktop.on(SHELL_EVENTS.reset, () => dispatch({ type: "reset" }));
  desktop.on(SHELL_EVENTS.ghost, () => setGhost(!ghost));

  // A widget with no chrome has nothing useful behind a right click.
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  widget.start();
  render();
}

main();
