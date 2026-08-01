//! System-wide hotkeys, so the timer can be driven without leaving the editor.

use tauri::plugin::TauriPlugin;
use tauri::{App, Emitter, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::{events, window};

/// What a hotkey does: most just hand off to the timer running in the webview.
#[derive(Clone, Copy)]
enum Action {
    Emit(&'static str),
    ToggleVisibility,
}

/// Each hotkey and the action it triggers.
///
/// The last three exist because their features are otherwise one-way doors: a
/// click-through, mini-mode, or hidden widget cannot be clicked to undo
/// itself, and the tray icon is easy to lose in the notification overflow.
fn bindings() -> [(Shortcut, Action); 6] {
    let ctrl_alt = Modifiers::CONTROL | Modifiers::ALT;
    [
        (Shortcut::new(Some(ctrl_alt), Code::Space), Action::Emit(events::TOGGLE)),
        (Shortcut::new(Some(ctrl_alt), Code::KeyN), Action::Emit(events::SKIP)),
        (Shortcut::new(Some(ctrl_alt), Code::KeyR), Action::Emit(events::RESET)),
        (Shortcut::new(Some(ctrl_alt), Code::KeyG), Action::Emit(events::GHOST)),
        // Not KeyM: `register` below only fails on an *exclusive* OS-level
        // claim, and Ctrl+Alt+M is a common mute hotkey in other software
        // that intercepts the keypress a layer below that, with no error
        // for this app to see — it registered fine and simply never fired.
        (Shortcut::new(Some(ctrl_alt), Code::KeyZ), Action::Emit(events::MINI)),
        (Shortcut::new(Some(ctrl_alt), Code::KeyH), Action::ToggleVisibility),
    ]
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, pressed, event| {
            // Fire once per physical press; ignore the release half.
            if event.state() != ShortcutState::Pressed {
                return;
            }

            let bindings = bindings();
            let Some((_, action)) = bindings.iter().find(|(binding, _)| binding == pressed)
            else {
                return;
            };

            match action {
                Action::Emit(name) => {
                    let _ = app.emit(*name, ());
                }
                Action::ToggleVisibility => window::toggle_visibility(app),
            }
        })
        .build()
}

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let manager = app.global_shortcut();

    for (shortcut, _) in bindings() {
        // A hotkey already claimed by another app must not stop the widget
        // from booting — the tray and the UI buttons still work.
        if let Err(error) = manager.register(shortcut) {
            eprintln!("could not bind a global shortcut: {error}");
        }
    }

    Ok(())
}
