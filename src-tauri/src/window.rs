//! Behaviour of the single floating widget window.

use tauri::{App, AppHandle, LogicalSize, Manager, Runtime, WebviewWindow};

/// Must match the window label declared in `tauri.conf.json`.
pub const WIDGET_LABEL: &str = "widget";

/// Widget size at 100%. Must match `tauri.conf.json` and the
/// `--widget-width` / `--widget-height` properties in the stylesheet.
const BASE_WIDTH: f64 = 300.0;
const BASE_HEIGHT: f64 = 396.0;

/// Bounds on the scale, so a bad value from storage cannot produce a window
/// too small to grab or larger than the screen.
const MIN_SCALE: f64 = 0.7;
const MAX_SCALE: f64 = 2.0;

/// Handle to the widget window, if it still exists.
///
/// Generic over the runtime so the global-shortcut plugin, which is itself
/// generic, can reach it.
pub fn widget<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
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

/// Hides the widget, or brings it back if it is already hidden.
///
/// Handled here rather than in the webview: a hidden window cannot be asked to
/// show itself reliably, and this is the escape hatch for having hidden it.
pub fn toggle_visibility<R: Runtime>(app: &AppHandle<R>) {
    let Some(widget) = widget(app) else {
        return;
    };

    if widget.is_visible().unwrap_or(false) {
        let _ = widget.hide();
    } else {
        let _ = widget.show();
        let _ = widget.set_focus();
    }
}

/// Toggles mouse transparency so the widget can float over another app
/// without swallowing the clicks meant for it.
#[tauri::command]
pub fn set_click_through(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|error| error.to_string())
}

/// Resizes the widget for a UI scale factor.
///
/// The webview zooms its own layout by the same factor, so the window and its
/// contents stay in step and the pixel art keeps its integer scaling.
#[tauri::command]
pub fn set_widget_scale(window: WebviewWindow, scale: f64) -> Result<(), String> {
    let scale = scale.clamp(MIN_SCALE, MAX_SCALE);

    window
        .set_size(LogicalSize::new(BASE_WIDTH * scale, BASE_HEIGHT * scale))
        .map_err(|error| error.to_string())
}
