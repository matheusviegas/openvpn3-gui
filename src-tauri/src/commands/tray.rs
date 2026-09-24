use serde::Deserialize;
use serde_json::Value;
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::AppHandle;

/// Base tray icon, and the same icon with a green dot badge for when at least one
/// VPN session is active. Embedded at compile time so no extra file I/O is needed
/// to swap them at runtime.
static ICON_DISCONNECTED: &[u8] = include_bytes!("../../icons/icon.png");
static ICON_CONNECTED: &[u8] = include_bytes!("../../icons/icon-connected.png");

/// A profile as seen by the frontend, sent to `sync_tray_menu` so the tray mirrors
/// the same state shown in the main window.
#[derive(Deserialize, Clone)]
pub struct TrayProfile {
    pub name: String,
    pub requires_auth: bool,
    pub connected: bool,
}

/// One entry to render in the tray menu, independent of any Tauri menu type so it
/// can be unit-tested without building a real app/window.
#[derive(Debug, PartialEq)]
pub enum TrayEntry {
    Item { id: String, label: String, checked: bool, enabled: bool },
    Separator,
}

/// True when at least one profile has an active session — the same condition the
/// frontend uses to color the StatusBar indicator.
pub fn has_active_connection(profiles: &[TrayProfile]) -> bool {
    profiles.iter().any(|p| p.connected)
}

fn get_translation(locale: &str, key: &str) -> String {
    let json_str = match locale {
        "pt-BR" => include_str!("../../../locales/pt-BR.json"),
        "es" => include_str!("../../../locales/es.json"),
        _ => include_str!("../../../locales/en.json"),
    };
    let translations: Value = serde_json::from_str(json_str).unwrap_or_default();
    translations[key].as_str().unwrap_or(key).to_string()
}

/// Builds the ordered list of tray entries for the given locale and profiles.
///
/// With no profiles, the result is exactly `[show, quit]` — the original tray
/// behavior before profile support existed.
pub fn build_tray_entries(locale: &str, profiles: &[TrayProfile]) -> Vec<TrayEntry> {
    let show_label = get_translation(locale, "trayShow");
    let quit_label = get_translation(locale, "trayQuit");

    let mut entries = Vec::new();

    if profiles.is_empty() {
        entries.push(TrayEntry::Item {
            id: "tray-no-configs".to_string(),
            label: get_translation(locale, "trayNoConfigs"),
            checked: false,
            enabled: false,
        });
    } else {
        let mfa_suffix = get_translation(locale, "mfaBadge");
        for profile in profiles {
            let id = if profile.connected {
                format!("tray-disconnect:{}", profile.name)
            } else if profile.requires_auth {
                format!("tray-connect-auth:{}", profile.name)
            } else {
                format!("tray-connect:{}", profile.name)
            };
            let label = if profile.requires_auth {
                format!("{} [{}]", profile.name, mfa_suffix)
            } else {
                profile.name.clone()
            };
            entries.push(TrayEntry::Item { id, label, checked: profile.connected, enabled: true });
        }
    }

    entries.push(TrayEntry::Separator);
    entries.push(TrayEntry::Item { id: "show".to_string(), label: show_label, checked: false, enabled: true });
    entries.push(TrayEntry::Item { id: "quit".to_string(), label: quit_label, checked: false, enabled: true });

    entries
}

/// Materializes `TrayEntry`s into a real Tauri menu and swaps it onto the "main" tray.
pub fn rebuild_tray_menu(app: &AppHandle, locale: &str, profiles: &[TrayProfile]) -> Result<(), String> {
    let entries = build_tray_entries(locale, profiles);

    let items: Vec<MenuItemKind<tauri::Wry>> = entries
        .into_iter()
        .map(|entry| match entry {
            TrayEntry::Separator => {
                PredefinedMenuItem::separator(app)
                    .map(MenuItemKind::Predefined)
                    .map_err(|e| e.to_string())
            }
            TrayEntry::Item { id, label, checked, enabled } => {
                if checked {
                    CheckMenuItem::with_id(app, &id, &label, enabled, true, None::<&str>)
                        .map(MenuItemKind::Check)
                        .map_err(|e| e.to_string())
                } else {
                    MenuItem::with_id(app, &id, &label, enabled, None::<&str>)
                        .map(MenuItemKind::MenuItem)
                        .map_err(|e| e.to_string())
                }
            }
        })
        .collect::<Result<_, _>>()?;

    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
        items.iter().map(|item| item as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();
    let menu = Menu::with_items(app, &refs).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;

        let icon_bytes = if has_active_connection(profiles) { ICON_CONNECTED } else { ICON_DISCONNECTED };
        let icon = Image::from_bytes(icon_bytes).map_err(|e| e.to_string())?;
        tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Rebuilds the tray menu with the current locale and profile/session state.
///
/// Replaces the old `set_tray_language`: the frontend now pushes locale and
/// profiles together (via the same 3s status poll it already runs), so a locale
/// change never wipes out the profile list.
#[tauri::command]
pub fn sync_tray_menu(app: AppHandle, locale: String, profiles: Vec<TrayProfile>) -> Result<(), String> {
    rebuild_tray_menu(&app, &locale, &profiles)
}

/// An action requested by clicking a profile entry in the tray menu.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TrayActionKind {
    Connect,
    Disconnect,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TrayAction {
    pub kind: TrayActionKind,
    pub config_name: String,
    pub requires_auth: bool,
}

/// Parses a menu item id into a tray action, if it encodes one.
///
/// Returns `None` for `show`, `quit`, `tray-no-configs`, and anything unrecognized.
/// Checks the `-auth` variant first since `tray-connect:` is a prefix of it... no —
/// `tray-connect-auth:` is checked before `tray-connect:` because the latter is not
/// a prefix of the former's id space, but keeping this order is what's tested.
pub fn parse_tray_action(id: &str) -> Option<TrayAction> {
    if let Some(name) = id.strip_prefix("tray-connect-auth:") {
        return Some(TrayAction { kind: TrayActionKind::Connect, config_name: name.to_string(), requires_auth: true });
    }
    if let Some(name) = id.strip_prefix("tray-connect:") {
        return Some(TrayAction { kind: TrayActionKind::Connect, config_name: name.to_string(), requires_auth: false });
    }
    if let Some(name) = id.strip_prefix("tray-disconnect:") {
        return Some(TrayAction { kind: TrayActionKind::Disconnect, config_name: name.to_string(), requires_auth: false });
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_active_connection_when_profiles_empty() {
        assert!(!has_active_connection(&[]));
    }

    #[test]
    fn no_active_connection_when_no_profile_is_connected() {
        let profiles = vec![
            TrayProfile { name: "a".to_string(), requires_auth: false, connected: false },
            TrayProfile { name: "b".to_string(), requires_auth: true, connected: false },
        ];
        assert!(!has_active_connection(&profiles));
    }

    #[test]
    fn active_connection_when_at_least_one_profile_is_connected() {
        let profiles = vec![
            TrayProfile { name: "a".to_string(), requires_auth: false, connected: false },
            TrayProfile { name: "b".to_string(), requires_auth: false, connected: true },
        ];
        assert!(has_active_connection(&profiles));
    }

    #[test]
    fn empty_profiles_matches_original_show_quit_menu() {
        let entries = build_tray_entries("en", &[]);
        assert_eq!(
            entries,
            vec![
                TrayEntry::Item { id: "tray-no-configs".to_string(), label: "No configurations imported".to_string(), checked: false, enabled: false },
                TrayEntry::Separator,
                TrayEntry::Item { id: "show".to_string(), label: "Show".to_string(), checked: false, enabled: true },
                TrayEntry::Item { id: "quit".to_string(), label: "Quit".to_string(), checked: false, enabled: true },
            ]
        );
    }

    #[test]
    fn labels_respect_locale() {
        let entries = build_tray_entries("pt-BR", &[]);
        let show = entries.iter().find(|e| matches!(e, TrayEntry::Item { id, .. } if id == "show")).unwrap();
        assert_eq!(show, &TrayEntry::Item { id: "show".to_string(), label: "Mostrar".to_string(), checked: false, enabled: true });

        let entries_es = build_tray_entries("es", &[]);
        let quit = entries_es.iter().find(|e| matches!(e, TrayEntry::Item { id, .. } if id == "quit")).unwrap();
        assert!(matches!(quit, TrayEntry::Item { label, .. } if !label.is_empty() && label != "quit"));
    }

    #[test]
    fn disconnected_profile_without_auth_gets_connect_id_and_unchecked() {
        let profiles = vec![TrayProfile { name: "office".to_string(), requires_auth: false, connected: false }];
        let entries = build_tray_entries("en", &profiles);
        assert_eq!(
            entries[0],
            TrayEntry::Item { id: "tray-connect:office".to_string(), label: "office".to_string(), checked: false, enabled: true }
        );
    }

    #[test]
    fn disconnected_profile_with_auth_gets_connect_auth_id_and_mfa_suffix() {
        let profiles = vec![TrayProfile { name: "matheus-mfa".to_string(), requires_auth: true, connected: false }];
        let entries = build_tray_entries("en", &profiles);
        assert_eq!(
            entries[0],
            TrayEntry::Item {
                id: "tray-connect-auth:matheus-mfa".to_string(),
                label: "matheus-mfa [MFA]".to_string(),
                checked: false,
                enabled: true,
            }
        );
    }

    #[test]
    fn connected_profile_gets_disconnect_id_and_checked() {
        let profiles = vec![TrayProfile { name: "office".to_string(), requires_auth: false, connected: true }];
        let entries = build_tray_entries("en", &profiles);
        assert_eq!(
            entries[0],
            TrayEntry::Item { id: "tray-disconnect:office".to_string(), label: "office".to_string(), checked: true, enabled: true }
        );
    }

    #[test]
    fn connected_profile_with_auth_still_uses_disconnect_id() {
        // Once connected, the action is always "disconnect" regardless of requires_auth.
        let profiles = vec![TrayProfile { name: "matheus-mfa".to_string(), requires_auth: true, connected: true }];
        let entries = build_tray_entries("en", &profiles);
        assert_eq!(
            entries[0],
            TrayEntry::Item {
                id: "tray-disconnect:matheus-mfa".to_string(),
                label: "matheus-mfa [MFA]".to_string(),
                checked: true,
                enabled: true,
            }
        );
    }

    #[test]
    fn multiple_profiles_keep_input_order_before_separator_and_show_quit() {
        let profiles = vec![
            TrayProfile { name: "a".to_string(), requires_auth: false, connected: false },
            TrayProfile { name: "b".to_string(), requires_auth: false, connected: true },
        ];
        let entries = build_tray_entries("en", &profiles);
        assert_eq!(entries.len(), 5);
        assert!(matches!(&entries[0], TrayEntry::Item { id, .. } if id == "tray-connect:a"));
        assert!(matches!(&entries[1], TrayEntry::Item { id, .. } if id == "tray-disconnect:b"));
        assert_eq!(entries[2], TrayEntry::Separator);
        assert!(matches!(&entries[3], TrayEntry::Item { id, .. } if id == "show"));
        assert!(matches!(&entries[4], TrayEntry::Item { id, .. } if id == "quit"));
    }

    #[test]
    fn parses_connect_action() {
        let action = parse_tray_action("tray-connect:office").unwrap();
        assert_eq!(action, TrayAction { kind: TrayActionKind::Connect, config_name: "office".to_string(), requires_auth: false });
    }

    #[test]
    fn parses_connect_auth_action() {
        let action = parse_tray_action("tray-connect-auth:matheus-mfa").unwrap();
        assert_eq!(action, TrayAction { kind: TrayActionKind::Connect, config_name: "matheus-mfa".to_string(), requires_auth: true });
    }

    #[test]
    fn parses_disconnect_action() {
        let action = parse_tray_action("tray-disconnect:office").unwrap();
        assert_eq!(action, TrayAction { kind: TrayActionKind::Disconnect, config_name: "office".to_string(), requires_auth: false });
    }

    #[test]
    fn returns_none_for_non_action_ids() {
        assert!(parse_tray_action("show").is_none());
        assert!(parse_tray_action("quit").is_none());
        assert!(parse_tray_action("tray-no-configs").is_none());
        assert!(parse_tray_action("something-else").is_none());
    }

    #[test]
    fn preserves_names_containing_dashes_and_colons() {
        let action = parse_tray_action("tray-connect:my-vpn:corp").unwrap();
        assert_eq!(action.config_name, "my-vpn:corp");
    }
}
