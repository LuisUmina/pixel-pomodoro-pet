import "./ui/styles.css";

import { playChime } from "./audio/chime";
import { INITIAL_DIALOGUE, allowAmbient, speak } from "./core/dialogue";
import { completionNotice } from "./core/format";
import { createInitialState, isBreak, reduce, withSettings } from "./core/pomodoro";
import { Ticker } from "./core/ticker";
import type { Phase, PomodoroEvent, PomodoroSettings } from "./core/types";
import { CATALOG } from "./messages/catalog";
import type { Trigger, Voice } from "./messages/types";
import { desktop } from "./platform/desktop";
import { SHELL_EVENTS } from "./platform/events";
import { clampUiScale } from "./scale";
import type { PetState } from "./sprites/duck";
import { applyThemeCss, getTheme, nextThemeId } from "./sprites/themes";
import { browserStore } from "./store/persistence";
import { isoDay, loadPreferences, savePreferences } from "./store/preferences";
import { AutoDim } from "./ui/auto-dim";
import { Widget } from "./ui/widget";

/** How long the duck keeps celebrating after a phase completes. */
const CELEBRATION_MS = 3_200;

/** How often the mascot is offered a chance to say something unprompted. */
const AMBIENT_CHECK_MS = 60_000;

/**
 * Odds of taking that chance. The selector already enforces a cooldown; this
 * only stops the chatter from landing on a predictable metronome.
 */
const AMBIENT_CHANCE = 0.4;

/** A wall-clock jump this large means the machine slept or you walked off. */
const AWAY_MS = 25 * 60_000;

function main(): void {
  let preferences = loadPreferences(browserStore, isoDay(new Date()));
  let theme = getTheme(preferences.themeId);
  let state = createInitialState(preferences.settings, {
    task: preferences.task,
    completedToday: preferences.completedToday,
  });

  let uiScale = preferences.uiScale;
  let savedSignature = JSON.stringify(preferences);
  let ghost = false;
  let celebrating = false;
  let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
  let dialogue = INITIAL_DIALOGUE;

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
    changeSettings: (settings) => applySettings(settings),
    changeScale: (scale, persist) => applyScale(scale, persist),
    changeVoice: (voice) => applyVoice(voice),
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
      say(transition.completed === "focus" ? "focusDone" : "breakDone");
    } else if (!wasRunning && state.status === "running") {
      if (preferences.soundEnabled) {
        playChime("start");
      }
      say(isBreak(state.phase) ? "breakStart" : "focusStart");
    } else if (wasRunning && state.status === "paused") {
      say("paused");
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

  /**
   * Offers the mascot a chance to speak. It may well decline — the cooldown
   * and the chosen voice both live in the selector, not here.
   */
  function say(trigger: Trigger): void {
    const now = Date.now();
    const result = speak(
      dialogue,
      {
        trigger,
        voice: preferences.voice,
        now,
        completedToday: state.completedToday,
        hour: new Date(now).getHours(),
      },
      CATALOG,
    );

    dialogue = result.state;

    if (result.line) {
      widget.say(result.line.text);
      // No point talking to a widget faded down to 42%.
      autoDim.wake();
    }
  }

  function applyVoice(voice: Voice): void {
    preferences = { ...preferences, voice };
    save();
    render();

    if (voice === "off") {
      widget.hush();
      return;
    }

    // Demonstrate the choice instead of leaving them to guess what it sounds
    // like; clearing the cooldown is what makes the sample land right away.
    dialogue = allowAmbient(dialogue);
    say("idle");
  }

  function applySettings(settings: PomodoroSettings): void {
    preferences = { ...preferences, settings };
    state = withSettings(state, settings);
    save();
    render();
  }

  /**
   * Scales the widget. The webview zooms its layout and the shell resizes the
   * window by the same factor, so the two never disagree. A drag in progress
   * passes `persist: false` to keep it out of storage until it settles.
   */
  function applyScale(scale: number, persist: boolean): void {
    uiScale = clampUiScale(scale);
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    desktop.setScale(uiScale);

    if (persist) {
      preferences = { ...preferences, uiScale };
      save();
    }

    render();
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

    // `save` runs on every tick — four times a second for hours. Comparing
    // first keeps that from becoming four synchronous disk writes a second.
    const signature = JSON.stringify(preferences);
    if (signature === savedSignature) {
      return;
    }

    savedSignature = signature;
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
      uiScale,
      voice: preferences.voice,
    });
  }

  /**
   * Unprompted chatter, and the only way the widget notices you were gone:
   * a gap far larger than the interval means the machine slept or locked.
   */
  function ambient(lastCheckAt: number): void {
    const now = Date.now();

    if (now - lastCheckAt > AWAY_MS) {
      say("welcomeBack");
    } else if (state.status !== "running" && Math.random() < AMBIENT_CHANCE) {
      // Never during a session: interrupting focus is the whole thing we are
      // trying not to do.
      say("idle");
    }

    setTimeout(() => ambient(now), AMBIENT_CHECK_MS);
  }

  desktop.on(SHELL_EVENTS.toggle, () => dispatch({ type: "toggle" }));
  desktop.on(SHELL_EVENTS.skip, () => dispatch({ type: "skip" }));
  desktop.on(SHELL_EVENTS.reset, () => dispatch({ type: "reset" }));
  desktop.on(SHELL_EVENTS.ghost, () => setGhost(!ghost));

  // A widget with no chrome has nothing useful behind a right click.
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  widget.start();
  // Restores the size the widget was left at, window included.
  applyScale(uiScale, false);
  setTimeout(() => ambient(Date.now()), AMBIENT_CHECK_MS);
}

main();
