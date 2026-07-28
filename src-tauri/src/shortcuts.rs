//! System-wide hotkeys, so the timer can be driven without leaving the editor.

use tauri::plugin::TauriPlugin;
use tauri::{App, Emitter, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::events;

/// Each hotkey and the widget event it fires.
fn bindings() -> [(Shortcut, &'static str); 3] {
    let ctrl_alt = Modifiers::CONTROL | Modifiers::ALT;
    [
        (Shortcut::new(Some(ctrl_alt), Code::Space), events::TOGGLE),
        (Shortcut::new(Some(ctrl_alt), Code::KeyN), events::SKIP),
        (Shortcut::new(Some(ctrl_alt), Code::KeyR), events::RESET),
    ]
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, pressed, event| {
            // Fire once per physical press; ignore the release half.
            if event.state() != ShortcutState::Pressed {
                return;
            }

            if let Some((_, name)) = bindings().iter().find(|(binding, _)| binding == pressed) {
                let _ = app.emit(name, ());
            }
        })
        .build()
}

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let manager = app.global_shortcut();

    for (shortcut, name) in bindings() {
        // A hotkey already claimed by another app must not stop the widget
        // from booting — the tray and the UI buttons still work.
        if let Err(error) = manager.register(shortcut) {
            eprintln!("could not bind the global shortcut for {name}: {error}");
        }
    }

    Ok(())
}
