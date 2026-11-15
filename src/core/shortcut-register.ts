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

/**
 * Restore Defaults writes shipped shortcuts first, then asks the native
 * shell to register them. A failed invoke means the shell rolled the OS
 * bindings back — stored prefs must follow, or the settings panel lies.
 * A successful best-effort register keeps the shipped map even if some
 * individual keys could not be claimed (see `tolerateShortcutRegisterFailure`).
 */
export function storedShortcutsAfterRestore<T>(previous: T, shipped: T, nativeSuccess: boolean): T {
  return nativeSuccess ? shipped : previous;
}
