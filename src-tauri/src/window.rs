//! Behaviour of the single floating widget window.

use tauri::{App, AppHandle, Manager, WebviewWindow};

/// Must match the window label declared in `tauri.conf.json`.
pub const WIDGET_LABEL: &str = "widget";

/// Handle to the widget window, if it still exists.
pub fn widget(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(WIDGET_LABEL)
}

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app
        .get_webview_window(WIDGET_LABEL)
        .ok_or("the `widget` window is missing from tauri.conf.json")?;

    // The config already asks for this, but restoring a saved position can
    // drop the flag on some window managers, so assert it once on boot.
    window.set_always_on_top(true)?;

    Ok(())
}

/// Toggles mouse transparency so the widget can float over another app
/// without swallowing the clicks meant for it.
#[tauri::command]
pub fn set_click_through(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|error| error.to_string())
}
