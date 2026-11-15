/**
 * Policy for a failed OS `register` during `update_shortcuts`.
 *
 * Must stay in sync with `src-tauri/src/shortcuts.rs` (`tolerate_register_error`).
 * Interactive edits roll back only when a *changed* key cannot be claimed.
 * Boot, backup import, and Restore Defaults pass `bestEffort` so one OS
 * conflict cannot discard the rest of a saved map.
 */
export function tolerateShortcutRegisterFailure(
  bestEffort: boolean,
  wasUnchanged: boolean,
): boolean {
  return bestEffort || wasUnchanged;
}
