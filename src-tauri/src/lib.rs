mod commands;

use tauri::{
    Emitter, Manager,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

use commands::config::{list_configs, import_config, remove_config, file_requires_auth};
use commands::credentials::{get_config_username, set_config_username};
use commands::session::{connect, disconnect, get_status, get_session_stats, get_openvpn_version};
use commands::tray::{parse_tray_action, rebuild_tray_menu, sync_tray_menu, TrayActionKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System tray. Starts with just show/quit (no profiles yet); the
            // frontend calls sync_tray_menu on mount and on every status poll to
            // keep it mirroring the profile/session list shown in the main window.
            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let id = event.id.as_ref();
                    match id {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {
                            if let Some(action) = parse_tray_action(id) {
                                // MFA profiles need the AuthDialog, so bring the
                                // window forward before the frontend reacts.
                                let needs_window =
                                    action.requires_auth && action.kind == TrayActionKind::Connect;
                                if needs_window {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.unminimize();
                                        let _ = window.set_focus();
                                    }
                                }
                                let _ = app.emit("tray-action", action);
                            }
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            rebuild_tray_menu(app.handle(), "pt-BR", &[])
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;

            // Intercept window close to minimize to tray
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_configs,
            import_config,
            remove_config,
            file_requires_auth,
            get_config_username,
            set_config_username,
            connect,
            disconnect,
            get_status,
            get_session_stats,
            get_openvpn_version,
            sync_tray_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
