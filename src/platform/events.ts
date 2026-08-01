/**
 * Events the Rust shell emits into the webview.
 * Mirror of `src-tauri/src/events.rs` — change both together.
 */
export const SHELL_EVENTS = {
  toggle: "widget://toggle",
  skip: "widget://skip",
  reset: "widget://reset",
  ghost: "widget://ghost",
  mini: "widget://mini",
} as const;

export type ShellEvent = (typeof SHELL_EVENTS)[keyof typeof SHELL_EVENTS];
