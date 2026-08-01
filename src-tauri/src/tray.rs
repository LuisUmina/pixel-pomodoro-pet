//! Tray icon: the way back to the widget once it has been hidden.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Emitter};

use crate::{events, window};

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle = MenuItem::with_id(app, "toggle", "Start / Pause", true, Some("Ctrl+Alt+Space"))?;
    let skip = MenuItem::with_id(app, "skip", "Skip phase", true, Some("Ctrl+Alt+N"))?;
    let reset = MenuItem::with_id(app, "reset", "Reset phase", true, Some("Ctrl+Alt+R"))?;
    let ghost = MenuItem::with_id(
        app,
        "ghost",
        "Toggle click-through",
        true,
        Some("Ctrl+Alt+G"),
    )?;
    let mini = MenuItem::with_id(app, "mini", "Toggle mini mode", true, Some("Ctrl+Alt+Z"))?;
    let show = MenuItem::with_id(app, "show", "Show widget", true, Some("Ctrl+Alt+H"))?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle,
            &skip,
            &reset,
            &PredefinedMenuItem::separator(app)?,
            &ghost,
            &mini,
            &show,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("main")
        .icon(
            app.default_window_icon()
                .cloned()
                .ok_or("the bundle is missing a default window icon")?,
        )
        .tooltip("Pixel Pomodoro Pet")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => emit(app, events::TOGGLE),
            "skip" => emit(app, events::SKIP),
            "reset" => emit(app, events::RESET),
            "ghost" => emit(app, events::GHOST),
            "mini" => emit(app, events::MINI),
            "show" => reveal(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                reveal(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn emit(app: &AppHandle, name: &str) {
    let _ = app.emit(name, ());
}

/// Brings the widget back in front of the user.
fn reveal(app: &AppHandle) {
    if let Some(widget) = window::widget(app) {
        let _ = widget.show();
        let _ = widget.set_focus();
    }
}
