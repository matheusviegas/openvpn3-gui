use tauri::AppHandle;
use tauri::menu::{Menu, MenuItem};
use serde_json::Value;

fn get_translation(locale: &str, key: &str) -> String {
    let json_str = match locale {
        "pt-BR" => include_str!("../../../locales/pt-BR.json"),
        "es" => include_str!("../../../locales/es.json"),
        _ => include_str!("../../../locales/en.json"),
    };
    let translations: Value = serde_json::from_str(json_str).unwrap_or_default();
    translations[key].as_str().unwrap_or(key).to_string()
}

pub fn rebuild_tray_menu(app: &AppHandle, locale: &str) -> Result<(), String> {
    let show_label = get_translation(locale, "trayShow");
    let quit_label = get_translation(locale, "trayQuit");

    let show_i = MenuItem::with_id(app, "show", &show_label, true, None::<&str>).map_err(|e| e.to_string())?;
    let quit_i = MenuItem::with_id(app, "quit", &quit_label, true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i]).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_tray_language(app: AppHandle, locale: String) -> Result<(), String> {
    rebuild_tray_menu(&app, &locale)
}
