import "./ui/styles.css";

import { playChime } from "./audio/chime";
import {
  INITIAL_DIALOGUE,
  allowAmbient,
  ambientTrigger,
  noteSpoken,
  speak,
} from "./core/dialogue";
import { completionNotice, isoDay } from "./core/format";
import { currentStreak, heatmap, recordSession } from "./core/history";
import { createInitialState, isBreak, reduce, withSettings } from "./core/pomodoro";
import { isQuiet, quietMinutesLeft, quietUntilFrom } from "./core/quiet";
import { INITIAL_REMINDERS, accrueReminders, takeReminder } from "./core/reminders";
import { Ticker } from "./core/ticker";
import type { Phase, PomodoroEvent, PomodoroSettings } from "./core/types";
import { CATALOG } from "./messages/catalog";
import { REMINDER_PACKS } from "./messages/reminders";
import type { Trigger, Voice } from "./messages/types";
import { desktop } from "./platform/desktop";
import { SHELL_EVENTS } from "./platform/events";
import { BASE_WIDGET_HEIGHT, BASE_WIDGET_WIDTH, clampUiScale } from "./scale";
import type { PetState } from "./sprites/characters";
import { applyThemeCss, getTheme, nextThemeId } from "./sprites/themes";
import { loadHistory, saveHistory } from "./store/history";
import { browserStore } from "./store/persistence";
import { defaultPreferences, loadPreferences, savePreferences } from "./store/preferences";
import { AutoDim } from "./ui/auto-dim";
import type { HistoryModel } from "./ui/history-panel";
import { Widget } from "./ui/widget";

/** How long the duck keeps celebrating after a phase completes. */
const CELEBRATION_MS = 3_200;

/** How often the mascot is offered a chance to say something unprompted. */
const AMBIENT_CHECK_MS = 60_000;

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
  let reminders = INITIAL_REMINDERS;
  let history = loadHistory(browserStore);

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
    changeReminder: (id, enabled) => {
      preferences = { ...preferences, reminders: { ...preferences.reminders, [id]: enabled } };
      save();
      render();
    },
    changeQuiet: (minutes) => applyQuiet(minutes),
    changeCharacter: (id) => {
      preferences = { ...preferences, characterId: id };
      save();
      render();
    },
    changeMiniMode: (enabled) => applyMiniMode(enabled),
    restoreDefaults: () => restoreDefaults(),
    viewHistory: () => computeHistoryModel(),
  });

  const ticker = new Ticker((elapsedMs) => dispatch({ type: "tick", elapsedMs }));
  const autoDim = new AutoDim(widget.frame);

  function dispatch(event: PomodoroEvent): void {
    rollOverDay();

    const wasRunning = state.status === "running";
    // The phase the elapsed time belongs to, which a completing tick changes.
    const phaseBefore = state.phase;
    const transition = reduce(state, event, preferences.settings);
    state = transition.state;

    let spoke = true;
    if (transition.completed) {
      announce(transition.completed);
      say(transition.completed === "focus" ? "focusDone" : "breakDone");

      if (transition.completed === "focus") {
        history = recordSession(history, isoDay(new Date()));
        saveHistory(browserStore, history);
        widget.refreshHistory();
      }
    } else if (!wasRunning && state.status === "running") {
      if (preferences.soundEnabled) {
        playChime("start");
      }
      say(isBreak(state.phase) ? "breakStart" : "focusStart");
    } else if (wasRunning && state.status === "paused") {
      say("paused");
    } else {
      spoke = false;
    }

    if (event.type === "tick" && wasRunning) {
      trackReminders(event.elapsedMs, phaseBefore, spoke);
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
    if (isQuiet(preferences.quietUntil, now)) {
      return;
    }

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
      utter(result.line.text, now);
    }
  }

  /**
   * Banks a slice of session time and delivers whatever it made due.
   *
   * Driven by the ticker rather than the once-a-minute loop, because only the
   * ticker knows how much of an interval was actually spent running and in
   * which phase. A poll would have to attribute a whole minute to whatever
   * the state happened to be when it woke up.
   */
  function trackReminders(elapsedMs: number, phase: Phase, alreadySpoke: boolean): void {
    const now = Date.now();
    const check = { phase, enabled: preferences.reminders };
    const delivering =
      preferences.voice !== "off" && !isQuiet(preferences.quietUntil, now);

    reminders = accrueReminders(reminders, elapsedMs, { ...check, delivering }, REMINDER_PACKS);

    // A phase that just ended already has something to say. Skipping leaves
    // the pack's bank alone, so it comes back a quarter of a second later.
    if (!delivering || alreadySpoke) {
      return;
    }

    const due = takeReminder(reminders, check, REMINDER_PACKS);
    if (due) {
      reminders = due.state;
      utter(due.line, now);
    }
  }

  /** The one way anything reaches the bubble, whoever chose the words. */
  function utter(message: string, now: number): void {
    widget.say(message);
    dialogue = noteSpoken(dialogue, now);
    // No point talking to a widget faded down to 42%.
    autoDim.wake();
  }

  function applyQuiet(minutes: number): void {
    const now = Date.now();
    preferences = { ...preferences, quietUntil: quietUntilFrom(minutes, now) };
    save();

    if (minutes > 0) {
      widget.hush();
    }

    render();
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

  /**
   * Puts everything the settings panel controls back to shipped values.
   *
   * The button lives at the bottom of a panel that now covers durations, size,
   * voice, reminders and quiet, so resetting only the durations would make the
   * label a lie. The theme and the day's tally are not in that panel, and are
   * deliberately left alone.
   */
  function restoreDefaults(): void {
    const shipped = defaultPreferences(preferences.day);

    preferences = {
      ...preferences,
      settings: shipped.settings,
      voice: shipped.voice,
      reminders: shipped.reminders,
      quietUntil: shipped.quietUntil,
      characterId: shipped.characterId,
    };

    state = withSettings(state, shipped.settings);
    reminders = INITIAL_REMINDERS;
    applyScale(shipped.uiScale, true);
    applyMiniMode(shipped.miniMode);
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
   *
   * `resizeWindow: false` is for boot only, when mini mode is about to
   * resize the window again a moment later anyway: doing it here first would
   * make that second resize centre itself on this call's full-size box
   * instead of the mini frame the window was actually left at.
   */
  function applyScale(scale: number, persist: boolean, resizeWindow = true): void {
    uiScale = clampUiScale(scale);
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));

    if (resizeWindow) {
      desktop.setScale(uiScale);
    }

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

  /**
   * Shrinks the frame down to just the mascot and the clock, or brings the
   * full card back — both through `resizeKeepCenter`, so the mascot's
   * on-screen position never jumps in either direction. `desktop.setScale`
   * was tried for leaving and rejected: it only resizes from the window's
   * top-left, so growing back out from a small mini frame drags the whole
   * widget down-right by roughly half the size difference every time.
   *
   * The two directions still are not symmetric in how they get their target
   * size. Entering measures the DOM after the mode switch has reflowed it,
   * because the mini layout's footprint depends on the current character's
   * sprite size and the clock's rendered text width — neither of which this
   * file has any business computing by formula. Leaving uses
   * `BASE_WIDGET_WIDTH`/`HEIGHT` times `uiScale` instead of measuring: right
   * after the switch the OS window is still the small one until the resize
   * call this function is about to make actually lands, so a measurement
   * taken now would read that still-small viewport and lock the window at
   * whatever full mode could be squeezed into rather than its real size.
   */
  function applyMiniMode(enabled: boolean): void {
    preferences = { ...preferences, miniMode: enabled };
    save();
    render();

    if (enabled) {
      // A shortcut or the tray can flip this while settings/history is
      // still open from before; mini mode has nowhere to put either panel,
      // and its hover-revealed titlebar sits above them anyway.
      widget.closePanels();

      const size = widget.measureFrame();
      desktop.resizeKeepCenter(size.width, size.height);
    } else {
      desktop.resizeKeepCenter(BASE_WIDGET_WIDTH * uiScale, BASE_WIDGET_HEIGHT * uiScale);
    }
  }

  /**
   * Keeps the daily tally honest when the widget is left up overnight.
   * Returns whether the day actually turned, since the caller then owes the
   * screen a repaint.
   */
  function rollOverDay(): boolean {
    const today = isoDay(new Date());
    if (today === preferences.day) {
      return false;
    }

    preferences = { ...preferences, day: today, completedToday: 0 };
    state = { ...state, completedToday: 0 };
    return true;
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

  /**
   * A snapshot for the history panel. Computed on demand rather than kept in
   * `WidgetModel` — the heatmap is 371 cells and a streak walk, and nothing
   * needs that behind a closed panel four times a second.
   */
  function computeHistoryModel(): HistoryModel {
    const today = isoDay(new Date());

    return {
      streak: currentStreak(history.days, today),
      bestStreak: history.bestStreak,
      totalSessions: history.totalSessions,
      bestDayCount: history.bestDayCount,
      bestWeekCount: history.bestWeekCount,
      cells: heatmap(history.days, today),
    };
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
      reminders: preferences.reminders,
      quietMinutesLeft: quietMinutesLeft(preferences.quietUntil, Date.now()),
      characterId: preferences.characterId,
      miniMode: preferences.miniMode,
    });
  }

  /**
   * Unprompted chatter, and the only way the widget notices you were gone:
   * a gap far larger than the interval means the machine slept or locked.
   * What to make of that lives in `core/dialogue`; this only supplies facts.
   *
   * Reminders are deliberately not here. They are measured off the ticker,
   * which knows how much of a stretch was really spent working.
   */
  function ambient(lastCheckAt: number): void {
    const now = Date.now();

    // An idle widget dispatches nothing, so without this the tally on screen
    // — and the tally the mascot talks about — would still be yesterday's.
    if (rollOverDay()) {
      save();
      render();
    }

    expireQuiet(now);

    const trigger = ambientTrigger({
      sinceLastCheckMs: now - lastCheckAt,
      running: state.status === "running",
      roll: Math.random(),
    });

    if (trigger) {
      say(trigger);
    }

    setTimeout(() => ambient(now), AMBIENT_CHECK_MS);
  }

  /**
   * Keeps the quiet countdown moving, and clears it once it runs out.
   *
   * Leaving a spent timestamp behind would repaint the widget every minute
   * for the rest of the session, and a clock later corrected backwards would
   * walk straight back into a vow of silence nobody took.
   */
  function expireQuiet(now: number): void {
    if (preferences.quietUntil === 0) {
      return;
    }

    if (isQuiet(preferences.quietUntil, now)) {
      render();
      return;
    }

    preferences = { ...preferences, quietUntil: 0 };
    save();
    render();
  }

  desktop.on(SHELL_EVENTS.toggle, () => dispatch({ type: "toggle" }));
  desktop.on(SHELL_EVENTS.skip, () => dispatch({ type: "skip" }));
  desktop.on(SHELL_EVENTS.reset, () => dispatch({ type: "reset" }));
  desktop.on(SHELL_EVENTS.ghost, () => setGhost(!ghost));
  desktop.on(SHELL_EVENTS.mini, () => applyMiniMode(!preferences.miniMode));

  // A widget with no chrome has nothing useful behind a right click.
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  widget.start();
  // Restores the size the widget was left at, window included -- unless
  // mini mode is about to override it right below. The native window
  // already restored its own last position *and size* on its own (see
  // `lib.rs`), so when mini mode was saved on, skipping the resize here
  // leaves that correct starting box alone for `applyMiniMode` to centre
  // around, instead of overwriting it with the full-size box first.
  applyScale(uiScale, false, !preferences.miniMode);

  if (preferences.miniMode) {
    applyMiniMode(true);
  }

  // Taken now rather than inside the callback: read a minute from now it
  // would be the same instant the tick reports, so the first tick would
  // measure nothing and every reminder would lose its opening minute.
  const openedAt = Date.now();
  setTimeout(() => ambient(openedAt), AMBIENT_CHECK_MS);
}

main();
