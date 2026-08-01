//! Behaviour of the single floating widget window.

use tauri::{App, AppHandle, LogicalPosition, LogicalSize, Manager, Runtime, WebviewWindow};

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

/// Sanity bounds on `resize_keep_center`. Its width and height are always a
/// fresh measurement of our own DOM, never a stored value, so this is only a
/// backstop against a layout glitch handing across a 0×0 or absurd size.
const MIN_DIMENSION: f64 = 40.0;
const MAX_DIMENSION: f64 = 4000.0;

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

/// Resizes the widget to an exact size while keeping its on-screen centre
/// fixed.
///
/// A plain resize keeps the window's top-left corner in place, which is the
/// right anchor for the drag-to-resize grip (growing from the corner you are
/// actually pulling) but the wrong one here: switching into mini mode shrinks
/// the window a lot in one jump, and anchoring on the corner would make the
/// mascot — which sits nowhere near that corner — leap across the screen
/// instead of just shrinking in place.
#[tauri::command]
pub fn resize_keep_center<R: Runtime>(
    window: WebviewWindow<R>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let width = width.clamp(MIN_DIMENSION, MAX_DIMENSION);
    let height = height.clamp(MIN_DIMENSION, MAX_DIMENSION);

    let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
    let old_position = window
        .outer_position()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale_factor);
    let old_size = window
        .outer_size()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale_factor);

    let new_position = LogicalPosition::new(
        old_position.x + (old_size.width - width) / 2.0,
        old_position.y + (old_size.height - height) / 2.0,
    );

    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    window
        .set_position(new_position)
        .map_err(|error| error.to_string())
}
