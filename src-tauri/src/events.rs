//! Names of the events the shell emits into the webview.
//!
//! Keep this list in sync with `src/platform/events.ts` — it is the whole
//! contract between the tray/hotkeys and the timer running in the UI.

/// Start the timer, or pause it when it is already running.
pub const TOGGLE: &str = "widget://toggle";

/// Finish the current phase early and move to the next one.
pub const SKIP: &str = "widget://skip";

/// Send the current phase back to its full duration.
pub const RESET: &str = "widget://reset";

/// Flip mouse transparency. Reachable from the tray on purpose: once the
/// widget ignores the cursor, its own button can no longer be clicked.
pub const GHOST: &str = "widget://ghost";
