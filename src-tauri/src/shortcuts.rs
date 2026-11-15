//! System-wide hotkeys, so the timer can be driven without leaving the editor.

use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Mutex;
use tauri::plugin::TauriPlugin;
use tauri::{App, AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState as PluginShortcutState};

use crate::{events, window};

/// What a hotkey does: most just hand off to the timer running in the webview.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Action {
    Emit(&'static str),
    ToggleVisibility,
}

#[derive(Default)]
pub struct ShortcutState {
    pub bindings: Mutex<HashMap<Shortcut, Action>>,
    pub configured: Mutex<HashMap<String, Shortcut>>,
}

fn parse_action(key: &str) -> Option<Action> {
    match key {
        "toggle" => Some(Action::Emit(events::TOGGLE)),
        "skip" => Some(Action::Emit(events::SKIP)),
        "reset" => Some(Action::Emit(events::RESET)),
        "ghost" => Some(Action::Emit(events::GHOST)),
        "mini" => Some(Action::Emit(events::MINI)),
        "hide" => Some(Action::ToggleVisibility),
        _ => None,
    }
}

pub fn default_bindings() -> Vec<(&'static str, &'static str)> {
    vec![
        ("toggle", "Ctrl+Alt+Space"),
        ("skip", "Ctrl+Alt+N"),
        ("reset", "Ctrl+Alt+R"),
        ("ghost", "Ctrl+Alt+G"),
        ("mini", "Ctrl+Alt+Z"),
        ("hide", "Ctrl+Alt+H"),
    ]
}

#[tauri::command]
pub fn update_shortcuts<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ShortcutState>,
    shortcuts: HashMap<String, String>,
    best_effort: Option<bool>,
) -> Result<(), String> {
    let manager = app.global_shortcut();
    let mut parsed_bindings = HashMap::new();
    let mut parsed_entries = Vec::with_capacity(shortcuts.len());

    for (action_key, shortcut_str) in &shortcuts {
        let action = match parse_action(action_key) {
            Some(act) => act,
            None => return Err(format!("Acción desconocida: {action_key}")),
        };

        let shortcut = match Shortcut::from_str(shortcut_str) {
            Ok(sc) => sc,
            Err(e) => return Err(format!("Atajo inválido '{shortcut_str}' para {action_key}: {e}")),
        };

        if parsed_bindings.insert(shortcut, action).is_some() {
            return Err(format!("El atajo '{shortcut_str}' está asignado a múltiples acciones."));
        }
        parsed_entries.push((action_key.clone(), shortcut, action));
    }

    let mut current_guard = state
        .bindings
        .lock()
        .map_err(|_| "Error de concurrencia al acceder a atajos.".to_string())?;
    let mut configured_guard = state
        .configured
        .lock()
        .map_err(|_| "Error de concurrencia al acceder a atajos.".to_string())?;

    let old_bindings = current_guard.clone();
    let is_best_effort = best_effort.unwrap_or(false);

    // Unregister all existing global shortcuts
    let _ = manager.unregister_all();

    let mut active_bindings = HashMap::new();
    let mut next_configured = HashMap::new();

    // Attempt to register each shortcut; only fail/rollback if a newly changed shortcut
    // cannot be claimed during interactive editing (not in best-effort mode or on unchanged keys).
    for (action_key, shortcut, action) in &parsed_entries {
        let was_unchanged = configured_guard.get(action_key) == Some(shortcut);
        match manager.register(*shortcut) {
            Ok(()) => {
                active_bindings.insert(*shortcut, *action);
                next_configured.insert(action_key.clone(), *shortcut);
            }
            Err(err) if tolerate_register_error(is_best_effort, was_unchanged) => {
                eprintln!("could not bind a global shortcut for {action_key}: {err}");
                next_configured.insert(action_key.clone(), *shortcut);
            }
            Err(err) => {
                // Rollback to previous valid shortcut set
                let _ = manager.unregister_all();
                for (old_shortcut, _) in &old_bindings {
                    let _ = manager.register(*old_shortcut);
                }
                return Err(format!(
                    "No se pudo registrar el atajo ({err}). Se restauraron los atajos anteriores."
                ));
            }
        }
    }

    *current_guard = active_bindings;
    *configured_guard = next_configured;
    Ok(())
}

/// Skip rollback when restoring a saved map (`best_effort`) or when the key did
/// not change. Must stay in sync with `src/core/shortcut-register.ts`.
fn tolerate_register_error(best_effort: bool, was_unchanged: bool) -> bool {
    best_effort || was_unchanged
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, pressed, event| {
            // Fire once per physical press; ignore the release half.
            if event.state() != PluginShortcutState::Pressed {
                return;
            }

            let state = app.state::<ShortcutState>();
            let action = {
                let guard = state.bindings.lock().ok();
                guard.and_then(|g| g.get(pressed).copied())
            };

            if let Some(action) = action {
                match action {
                    Action::Emit(name) => {
                        let _ = app.emit(name, ());
                    }
                    Action::ToggleVisibility => window::toggle_visibility(app),
                }
            }
        })
        .build()
}

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let manager = app.global_shortcut();
    let mut initial_bindings = HashMap::new();
    let mut initial_configured = HashMap::new();

    // Register each default hotkey independently at boot time so that an OS-level claim
    // failure on one hotkey (e.g. mute shortcut conflict) degrades gracefully without
    // killing the rest of the default hotkeys.
    for (action_key, shortcut_str) in default_bindings() {
        let Some(action) = parse_action(action_key) else {
            continue;
        };
        let Ok(shortcut) = Shortcut::from_str(shortcut_str) else {
            continue;
        };

        initial_configured.insert(action_key.to_string(), shortcut);

        if let Err(error) = manager.register(shortcut) {
            eprintln!("could not bind a global shortcut '{shortcut_str}' for {action_key}: {error}");
        } else {
            initial_bindings.insert(shortcut, action);
        }
    }

    app.manage(ShortcutState {
        bindings: Mutex::new(initial_bindings),
        configured: Mutex::new(initial_configured),
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::tolerate_register_error;

    #[test]
    fn interactive_edit_rolls_back_only_a_changed_key_failure() {
        assert!(!tolerate_register_error(false, false));
        assert!(tolerate_register_error(false, true));
        assert!(tolerate_register_error(true, false));
        assert!(tolerate_register_error(true, true));
    }
}
