# pixel-pomodoro-pet

*Lee esto en [español](README.md).*

An always-visible desktop pomodoro with a pixel-art developer mascot.

A borderless, transparent, **always-on-top** window that floats over your
editor. A rubber duck — as in *rubber duck debugging* — reacts to what you're
doing: it focuses with you, rests with you, and celebrates when you close out
a pomodoro.

![The widget floating over the terminal](docs/widget-native.png)

The mascot comments on what's happening, in whichever character and voice
you pick — here's Pip, in `MEDIC`:

![Pip talking during a focus session, in the MEDIC voice](docs/widget-speaking.png)

Switching themes repaints the mascot too. Six editor palettes, all on the
same duck:

| Tokyo Night | Dracula | Gruvbox |
| --- | --- | --- |
| ![](docs/theme-tokyo-night.png) | ![](docs/theme-dracula.png) | ![](docs/theme-gruvbox.png) |

| Nord | Catppuccin | Solarized Dark |
| --- | --- | --- |
| ![](docs/theme-nord.png) | ![](docs/theme-catppuccin.png) | ![](docs/theme-solarized.png) |

Eight swappable characters from settings, no art recycled between them:

| Duck | Ninja | Terminal | Spark |
| --- | --- | --- | --- |
| ![](docs/char-duck.png) | ![](docs/char-ninja.png) | ![](docs/char-terminal.png) | ![](docs/char-spark.png) |

| Cat-octopus | Bug | Coffee | **Pip** |
| --- | --- | --- | --- |
| ![](docs/char-tentacat.png) | ![](docs/char-bug.png) | ![](docs/char-coffee.png) | ![](docs/char-pill.png) |

A real checklist behind the same field that was always there: one active
task, the rest queued, and every pomodoro credits whichever one is active
without you doing anything.

![Task panel with one active, one queued with an estimate, and one done](docs/widget-tasks.png)

The tally at the bottom opens your history: streak, records and a heatmap of
the last year.

![History panel with streak, records and heatmap](docs/widget-history.png)

Durations, size, idle opacity, character, voice and a daily goal, all behind
the gear:

![Settings panel with size, opacity and character](docs/widget-settings.png)

And all of the above, in English or in Spanish — one more chip in the same
panel, no restart needed. Lines, reminders, hotkeys and the whole interface
switch together:

| English | Español |
| --- | --- |
| ![Settings panel in English, Pip selected, MEDIC voice](docs/widget-settings-en.png) | ![Settings panel in Spanish, Pip selected, MEDIC voice](docs/widget-settings-es.png) |

And if you want it to take up as little room as possible, mini mode shrinks
it down to just the silhouette and the clock — everything else comes back on
hover:

| Mini mode | On hover |
| --- | --- |
| ![](docs/widget-mini.png) | ![](docs/widget-mini-hover.png) |

## What it does

- **A complete pomodoro timer**: configurable 25 / 5 / 15, rounds per cycle
  and a long break. Breaks start on their own; the next focus session
  doesn't, so coming back is a conscious decision.
- **A mascot with a life of its own**: behaviors spread across five moods.
  It never repeats a loop — each performance ends by drawing another one with
  weights, so it's almost always breathing, sometimes glancing sideways,
  occasionally something catches its eye up above, and every so often it
  wanders a couple of pixels for no reason. It focuses during focus, hums
  during breaks, and falls asleep when paused.
- **Eight swappable characters** from settings, split across two families.
  *Creatures* — the duck, a ninja, a cat-octopus, a bug and **Pip**, a
  good-humored little capsule — with their own body, blink and walk.
  *Emblems* — a CRT terminal, a spark and a steaming coffee mug — that can't
  blink or walk without looking broken, so they animate *effects* instead:
  the terminal blinks its cursor, types itself out and enters standby; the
  spark pulses its core, runs a glow along its rays, and settles into an
  ember when paused; the mug lets off steam that cools down when paused.
  Switching themes repaints all eight.
- **The mascot talks**: it comments when you start, when you close a
  session, when you enter a break, and every so often on its own. Five
  voices —`DEV` with dry humor, `HYPE` for encouragement, `PLAIN` for just
  the facts, `MEDIC` with bedside-manner humor (Pip's natural match, though
  any character can speak in any voice), and `OFF` to silence it— with lines
  that know what phase you're in, how many pomodoros you've done, and what
  time it is. Click to dismiss.
- **The whole app in English or Spanish**, one more chip in settings. Not a
  half-translation: the interface, the catalogue's 130+ lines and all five
  reminder packs switch together, no restart. By design, the two languages
  share a single source of truth for *when* each line fires (trigger, tone,
  conditions) — a missing or overlong translation fails a test before it
  ever reaches the bubble, so the two languages can never disagree on which
  line plays, only on what it says.
- **A mood that comes from real use, not chance**: four hours straight
  without a real break, or eight pomodoros in one day, and the duck looks and
  sounds tired — it borrows the paused animation instead of needing new art
  for "tired." A streak of three days or more, and some lines notice. And if
  you're gone for a lot longer than a coffee break, the welcome-back greeting
  isn't the same one.
- **Reminders anchored to the phase**: water, eyes (the 20-20-20 rule),
  posture, stretching and breathing. What matters isn't the list, it's
  *when* they land: the ones about getting up arrive during breaks, when you
  can actually stand up; the eye ones during focus, which is when you've gone
  twenty minutes without blinking. They count **session time, not clock
  time** — leaving the widget open without using it never brings a reminder
  closer. Water and eyes ship on; the rest you turn on yourself. And if you
  need something more specific, you can add **custom reminders** that follow
  the same rules (by phase and every X minutes).
- **Sound Effects**: The mascot has accompanying sounds that can easily be
  toggled off from the settings if you prefer to work in absolute silence.
- **Quiet mode** for 30 min, 1 h or 2 h, for calls and presentations.
  Announced in the title bar with how much is left, and turns itself off.
- **A checklist for the day**: the same field as always, now backed by real
  tasks. Typing in it only ever renames the active task — a second task
  always gets added from the list panel (☰, next to the field), with an
  optional pomodoro estimate. Every focus session that closes credits the
  active task on its own; switching tasks is a click in the list, no
  retyping the name. An optional daily goal (settings → goal) turns the
  tally at the bottom from "3 today" into "3/6 today".
- **History, streaks and a heatmap** behind the "N today" tally: current
  streak, best streak, total and best week, plus a 53-week heatmap in the
  GitHub style. The streak forgives one empty day a week — resting on a
  Saturday doesn't cost you months of consistency.
- **Editable settings** behind the gear: focus duration, short and long
  break, rounds per cycle, and auto-start. Changing a duration while the
  timer is running respects the time already spent.
- **Adjustable size** — four presets (80 / 100 / 125 / 150%) and a grip in
  the corner to resize by dragging. The native window resizes along with the
  interface, and the pixel art stays crisp at every scale.
- **Six editor themes** — Tokyo Night, Dracula, Gruvbox, Nord, Catppuccin and
  Solarized Dark. Switching themes **repaints the mascot too**, not just the
  interface.
- **A clock in its own pixel font**, drawn with the same sprite engine as the
  mascot. Crisp at any scale, without a single binary asset.
- **Auto-fade**: six seconds after a session starts, the widget drops in
  opacity and comes back on hover. Without this, something that overlaps
  everything else becomes unbearable within the hour. The level (20/40/65%,
  or off entirely) is chosen in settings.
- **Click-through mode**: the widget stops capturing the mouse entirely and
  genuinely floats over your IDE.
- **A mascot mode**: shrinks the window down to just the character and the
  clock, no title or controls — the rest comes back on hover. Meant for
  leaving it floating in a corner without taking up more room than the duck
  itself.
- **A system tray icon and global hotkeys**, to drive the timer without
  leaving your editor.
- **Never steals focus**: it appears without taking the keyboard away from
  whatever you're doing, which is the difference between a widget and a
  nuisance.
- **Remembers where you left it**: window position and size, theme, task,
  and today's pomodoros.

## Hotkeys

All of them can be reassigned from settings → shortcuts, with conflict
detection between them and no ghost binding left behind if the OS rejects
the new one. The table below shows the defaults.

| Hotkey | Action |
| --- | --- |
| `Ctrl+Alt+Space` | Start / Pause |
| `Ctrl+Alt+N` | Skip phase |
| `Ctrl+Alt+R` | Reset phase |
| `Ctrl+Alt+G` | Click-through on / off |
| `Ctrl+Alt+Z` | Mascot mode on / off |
| `Ctrl+Alt+H` | Hide / show the widget |

The last three exist because their buttons are **one-way doors**: a widget
that ignores the cursor, that shrank down to the duck, or that's hidden can't
be clicked to undo itself — the button to undo it might not be visible, or
the mouse might not be able to reach it. The tray icon also works, but it's
easy to lose among Windows' hidden icons, so the keyboard is the guaranteed
way out. Closing and reopening the app also clears click-through: that state
is deliberately not persisted.

While click-through is active, the title bar says so —
`~/focus [ghost]`— because otherwise the mode would be invisible.

## Development

```bash
npm install
npm run app:dev      # native app with hot reload
npm run dev          # frontend only, in the browser
npm run build        # build frontend and typecheck
npm run preview      # preview the built frontend
npm test             # core and sprite tests
npm run test:watch   # run tests in watch mode
npm run typecheck    # app + build tooling
npm run app:build    # NSIS installer for Windows
npm run icons        # regenerates icons from the duck's sprite
```

Requires Node 20+ and the Rust toolchain. On Windows you'll also need the
MSVC Build Tools and WebView2 (already bundled with Windows 10/11).

## Architecture

```
src/
  core/        Timer, phases, lines, reminders, history, mood and tasks. Pure.
  sprites/     Pixel art data (JSON) + canvas renderer + themes.
  messages/    Line catalogue and reminder packs (JSON) + validation.
  i18n/        Active language, UI string dictionary, and the DOM applier.
  ui/          DOM, mascot and clock canvases, speech bubble, panels.
  platform/    The one boundary with Tauri, behind an interface.
  store/       Preferences, history and tasks, with defensive reads.
  audio/       Chiptune blips synthesized with WebAudio.
src-tauri/     Window, tray and hotkeys. No domain logic.
tests/         Vitest over core/, store/, sprites/ and messages/.
```

Eleven decisions worth explaining:

**The timer is a pure reducer.** `reduce(state, event, settings)` never
touches the clock or the DOM, so the awkward cases — a long break on the
fourth round, skipping a phase, auto-start — get tested without booting the
app. The `Ticker` measures real elapsed time instead of trusting that
`setInterval` fired on schedule, so a throttled webview or a suspended laptop
never throws the count off.

**Sprites are data, not images.** Each character is a JSON file in
`sprites/characters/` with its grid, its patches and its behaviors — the
engine has no idea what a duck is, and adding a character is just dropping a
file. The grid is characters indexing a palette shared across themes, so the
art diffs cleanly in git, weighs almost nothing, and switching themes
repaints every character. Expressions are *patches* of a few pixels over the
base: with two-pixel-wide eyes, glancing sideways is just moving the
highlight to the other side, and looking down is the top row taking the
body's color — cheaper and more legible than redrawing a face. A strict
registry validates everything on load: a malformed character breaks a test,
not the screen.

**The "don't be annoying" rules are pure, tested code.** What decides whether
the duck speaks —`speak(state, request, catalog, random)`— and what decides
whether a reminder is due —`dueReminder(state, check, packs, random)`—
receive the clock and randomness as arguments. That's how the cooldown
between lines, not repeating the last thing said, the hour or tally
conditions, and each pack's cadence all get tested without booting the app.
That's where the real risk in these functions lives: a mascot that talks too
much gets uninstalled, and that's not something you catch by watching it for
a while.

**Everything that interrupts goes through one place.** Lines, reminders and
future reactions all enter the bubble through `utter()`, which is also what
starts the cooldown. Without that, the duck could hand you a reminder and
chain a joke onto it thirty seconds later. Quiet mode is applied at that same
bottleneck, so there's no way to add a new channel that skips it by accident.

**The two languages can never disagree on *what* the mascot says, only on
*how* it says it.** Duplicating every content JSON per language would have
been easy to write and easy to let drift over time. Instead, English stays
the one structural source of truth — ids, triggers, tones, hour or streak
conditions — and every additional language is just a flat `id → text` map,
merged at load time. If a translation is missing an entry or runs past the
bubble's length limit, `translate()` throws at import — a broken bilingual
catalogue fails a test, it never ships and goes quietly mute mid-sentence.

**A streak is walked forward, never backward.** Forgiving the weekly rest day
looks like a calculation you can do by looking backward from today, but it's
actually a question of chronological order: the first gap a week sees is the
one that gets forgiven, and a second gap that same week is what breaks the
streak. Walking backward finds the gaps in the opposite order and can forgive
the wrong one — `currentStreak` in `core/history.ts` walks from the oldest
day to today exactly for this reason. It took two rounds of review to find
the bug and one more to confirm it was gone.

**The icon is generated from the same JSON.** `scripts/generate-icon.mjs`
reads `duck.json` and writes the PNG that `tauri icon` distributes to every
size, with a 40-line PNG encoder so the project doesn't have to pull in a
canvas library. The taskbar icon and the duck on screen can never drift
apart.

**Mascot mode shrinks the window instead of hit-testing pixels.** For a
transparent widget to stop capturing the mouse over its own empty margin,
the brute-force option is per-pixel hit-testing on every event — but if the
window simply shrinks to hug the sprite, the problem disappears on its own:
outside the window there's nothing left to capture. `resize_keep_center` in
`window.rs` does that shrinking without the duck jumping anywhere, recomputing
the position so the geometric center never moves. Entering and leaving are
deliberately not symmetric: entering measures the already-redrawn DOM,
because the final size depends on the current character and the clock's
rendered width, something this file has no business computing by formula;
leaving instead reuses the saved scale rather than measuring, because right
after the mode switch the OS window is still the small one, and measuring at
that exact instant would read a viewport that hasn't reached its real size
yet.

**Mood is recomputed on events, never on every render.** `computeMood` is
pure and cheap, but one of its three inputs — the streak — isn't:
`currentStreak` walks up to a year of history, the same cost the heatmap
already avoids paying behind a closed panel. Recalculating it four times a
second alongside the rest of the render would have been that same mistake
again. Mood lives in a variable that only refreshes when one of its inputs
could actually have moved: a phase completing, and the once-a-minute ambient
check for the one input that drifts on its own — time.

**A panel refreshes by reading live state, never a cached model.**
`settings`/`history` receive their model through `WidgetModel`, updated on
every `render()` — that works because nothing else can touch them between
one `render()` and the next. The task panel broke that assumption: an action
from the panel itself (adding a task, marking one done) triggers a change
that needs to show up *before* the next ordinary `render()` gets around to
running. Storing `tasks` in `WidgetModel` and trusting the last cached value
produced a phantom row or no row at all, depending on which one ran first —
the same bug from both directions. The fix was the one `history` already used
for its heatmap, for a different reason (avoiding recomputing it behind a
closed panel): `viewTasks()` is a callback main.ts resolves on the spot, so
"has the render run yet" stops being a question that matters.

**Tauri only does what the web can't.** Borderless window, transparency,
tray and hotkeys live in Rust; all the domain logic lives in the webview.
The `platform/` layer keeps every Tauri import in one file, which also lets
the widget open in a plain browser with `npm run dev`, where every shell
call is a no-op instead of a crash.

## Known limitations

- Over **exclusive fullscreen** applications (games, some video players)
  Windows doesn't honor always-on-top. That's the operating system, not this
  stack.
- Only tested on Windows. Nothing in the code is platform-specific, but
  macOS and Linux are unverified.

## Roadmap

The direction was to turn this into a **virtual pet that also runs your
pomodoro**: one that moves on its own, that talks, that acts as a reminder,
that lets you swap its character, and that keeps track of your streaks. The
18 phases that lived there are done; the one that's left, roaming freely
around the desktop, was **discarded** by deliberate choice — the risk
(moving the OS window in real time, multi-monitor, mixed DPI) doesn't clear
the bar against a mostly-cosmetic payoff. The phase-by-phase detail,
including the decisions that changed along the way, lives in
**[docs/ROADMAP.md](docs/ROADMAP.md)** (in Spanish).
