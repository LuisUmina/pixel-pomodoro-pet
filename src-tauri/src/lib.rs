//! Desktop shell for the pixel pomodoro widget.
//!
//! All timer/domain logic lives in the webview (`src/core`); the Rust side owns
//! only what the web platform cannot do: an always-on-top frameless window,
//! a system tray, and global hotkeys.

mod events;
mod shortcuts;
mod tray;
mod window;

use tauri_plugin_window_state::StateFlags;

/// Boots the desktop app. `main.rs` stays a thin shim around this.
pub fn run() {
    tauri::Builder::default()
        // Only the drag position is worth restoring — the widget has a fixed
        // size and no decorations, so the other flags would fight the config.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(shortcuts::plugin())
        .setup(|app| {
            window::setup(app)?;
            tray::setup(app)?;
            shortcuts::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window::set_click_through,
            window::set_widget_scale
        ])
        .run(tauri::generate_context!())
        .expect("failed to start pixel-pomodoro-pet");
}
