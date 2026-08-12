use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};

/// Stored auth data for a configuration.
///
/// Only the username is persisted: the password is a MFA/TOTP factor, so it is
/// asked for on every connect and never written to disk.
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct CredentialEntry {
    pub username: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct CredentialStore {
    #[serde(default)]
    pub entries: HashMap<String, CredentialEntry>,
}

fn store_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve config dir: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(dir.join("credentials.json"))
}

fn load_from(path: &Path) -> CredentialStore {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_to(path: &Path, store: &CredentialStore) -> Result<(), String> {
    let json = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| format!("Failed to write credentials: {}", e))?;
    restrict_permissions(path);
    Ok(())
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) {}

fn username_in(store: &CredentialStore, config_name: &str) -> Option<String> {
    store
        .entries
        .get(config_name)
        .map(|e| e.username.clone())
        .filter(|u| !u.is_empty())
}

fn set_username_in(store: &mut CredentialStore, config_name: &str, username: &str) {
    if username.trim().is_empty() {
        store.entries.remove(config_name);
    } else {
        store.entries.insert(
            config_name.to_string(),
            CredentialEntry { username: username.trim().to_string() },
        );
    }
}

pub fn get_username<R: Runtime>(app: &AppHandle<R>, config_name: &str) -> Option<String> {
    let path = store_path(app).ok()?;
    username_in(&load_from(&path), config_name)
}

pub fn set_username<R: Runtime>(app: &AppHandle<R>, config_name: &str, username: &str) -> Result<(), String> {
    let path = store_path(app)?;
    let mut store = load_from(&path);
    set_username_in(&mut store, config_name, username);
    save_to(&path, &store)
}

pub fn forget<R: Runtime>(app: &AppHandle<R>, config_name: &str) {
    if let Ok(path) = store_path(app) {
        let mut store = load_from(&path);
        if store.entries.remove(config_name).is_some() {
            let _ = save_to(&path, &store);
        }
    }
}

#[tauri::command]
pub fn set_config_username<R: Runtime>(app: AppHandle<R>, config_name: String, username: String) -> Result<(), String> {
    set_username(&app, &config_name, &username)
}

#[tauri::command]
pub fn get_config_username<R: Runtime>(app: AppHandle<R>, config_name: String) -> Result<Option<String>, String> {
    Ok(get_username(&app, &config_name))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_store() -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "ovpn3gui-creds-{}-{:?}.json",
            std::process::id(),
            std::thread::current().id()
        ));
        let _ = fs::remove_file(&path);
        path
    }

    #[test]
    fn round_trips_username() {
        let path = temp_store();
        let mut store = load_from(&path);
        assert!(username_in(&store, "vpn-mfa").is_none());

        set_username_in(&mut store, "vpn-mfa", "  matheus-souza  ");
        save_to(&path, &store).unwrap();

        let reloaded = load_from(&path);
        assert_eq!(username_in(&reloaded, "vpn-mfa").as_deref(), Some("matheus-souza"));
        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn empty_username_clears_entry_and_no_password_field_is_persisted() {
        let path = temp_store();
        let mut store = CredentialStore::default();
        set_username_in(&mut store, "vpn-mfa", "user");
        save_to(&path, &store).unwrap();

        let raw = fs::read_to_string(&path).unwrap();
        assert!(!raw.to_lowercase().contains("password"));

        set_username_in(&mut store, "vpn-mfa", "   ");
        save_to(&path, &store).unwrap();
        assert!(username_in(&load_from(&path), "vpn-mfa").is_none());
        fs::remove_file(&path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn store_file_is_owner_only() {
        use std::os::unix::fs::PermissionsExt;
        let path = temp_store();
        save_to(&path, &CredentialStore::default()).unwrap();
        let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
        fs::remove_file(&path).unwrap();
    }

    /// Opt-in: exercises the real Tauri commands, writing to the app config dir.
    ///   cargo test --lib -- --ignored --nocapture credential_commands
    #[test]
    #[ignore = "writes to the app config dir"]
    fn credential_commands_round_trip() {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        println!("app_config_dir: {:?}", handle.path().app_config_dir());

        set_config_username(handle.clone(), "ovpn3gui-selftest".into(), " test.user ".into()).unwrap();
        assert_eq!(
            get_config_username(handle.clone(), "ovpn3gui-selftest".into())
                .unwrap()
                .as_deref(),
            Some("test.user")
        );

        forget(&handle, "ovpn3gui-selftest");
        assert!(get_config_username(handle, "ovpn3gui-selftest".into()).unwrap().is_none());
    }
}
