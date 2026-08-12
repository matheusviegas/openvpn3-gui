use serde::Serialize;
use std::fs;
use tauri::{AppHandle, Runtime};
use super::credentials;
use super::run_cmd;

#[derive(Serialize)]
pub struct VpnConfig {
    pub name: String,
    /// Profile has a bare `auth-user-pass`, so openvpn3 will prompt for user/password.
    pub requires_auth: bool,
    /// Username previously saved by the user (never the password).
    pub username: Option<String>,
}

/// True when the profile contains a bare `auth-user-pass` directive.
///
/// `auth-user-pass <file>` is ignored on purpose: credentials come from the file,
/// so openvpn3 does not prompt. `auth-user-pass-optional` is also not a match.
pub fn text_requires_auth(text: &str) -> bool {
    text.lines().any(|line| {
        let line = line.trim();
        if line.starts_with('#') || line.starts_with(';') {
            return false;
        }
        match line.strip_prefix("auth-user-pass") {
            Some(rest) => rest.trim().is_empty(),
            None => false,
        }
    })
}

fn config_requires_auth(name: &str) -> bool {
    run_cmd(&["config-dump", "--config", name])
        .map(|dump| text_requires_auth(&dump))
        .unwrap_or(false)
}

fn parse_config_names(output: &str) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("Configuration Name")
            || trimmed.starts_with("---")
        {
            continue;
        }
        if let Some(name) = trimmed.split_whitespace().next() {
            if !name.is_empty() && names.last().map(|n| n != name).unwrap_or(true) {
                names.push(name.to_string());
            }
        }
    }
    names
}

#[tauri::command]
pub fn list_configs<R: Runtime>(app: AppHandle<R>) -> Result<Vec<VpnConfig>, String> {
    let output = run_cmd(&["configs-list"])?;

    Ok(parse_config_names(&output)
        .into_iter()
        .map(|name| {
            let requires_auth = config_requires_auth(&name);
            let username = if requires_auth {
                credentials::get_username(&app, &name)
            } else {
                None
            };
            VpnConfig { name, requires_auth, username }
        })
        .collect())
}

/// Checks a not-yet-imported .ovpn/.conf file, so the import dialog can ask for the
/// username right away.
#[tauri::command]
pub fn file_requires_auth(file_path: String) -> Result<bool, String> {
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;
    Ok(text_requires_auth(&content))
}

#[tauri::command]
pub fn import_config<R: Runtime>(
    app: AppHandle<R>,
    file_path: String,
    name: String,
    username: Option<String>,
) -> Result<String, String> {
    if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') || name.is_empty() {
        return Err("Invalid name: only letters, numbers, underscore and dash allowed".to_string());
    }
    let existing = run_cmd(&["configs-list"]).unwrap_or_default();
    for line in existing.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("---") || trimmed.starts_with("Configuration Name") || trimmed.is_empty() {
            continue;
        }
        if let Some(existing_name) = trimmed.split_whitespace().next() {
            if existing_name == name {
                return Err(format!("Configuration '{}' already exists", name));
            }
        }
    }
    let result = run_cmd(&["config-import", "--config", &file_path, "--name", &name, "--persistent"])?;

    if let Some(user) = username {
        if !user.trim().is_empty() {
            credentials::set_username(&app, &name, &user)?;
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn remove_config<R: Runtime>(app: AppHandle<R>, name: String) -> Result<String, String> {
    let result = run_cmd(&["config-remove", "--config", &name, "--force"])?;
    credentials::forget(&app, &name);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{parse_config_names, text_requires_auth};

    #[test]
    fn detects_bare_auth_user_pass() {
        assert!(text_requires_auth("client\nauth SHA512\nauth-user-pass\n"));
        // config-dump prints the directive with a trailing space
        assert!(text_requires_auth("auth SHA512\nauth-user-pass "));
        assert!(text_requires_auth("  auth-user-pass\r"));
    }

    #[test]
    fn ignores_file_based_and_commented_directives() {
        assert!(!text_requires_auth("auth-user-pass /etc/openvpn/creds.txt"));
        assert!(!text_requires_auth("# auth-user-pass"));
        assert!(!text_requires_auth(";auth-user-pass"));
        assert!(!text_requires_auth("auth-user-pass-optional"));
        assert!(!text_requires_auth("client\nauth SHA512\n"));
    }

    #[test]
    fn parses_names_from_configs_list_table() {
        let output = "\
Configuration Name                                        Last used
------------------------------------------------------------------------------
apple                                                     2026-07-23 10:46:34
dootax                                                    2026-08-12 09:44:35
matheus-souza-mfa                                         2026-08-12 11:19:58
------------------------------------------------------------------------------
";
        assert_eq!(parse_config_names(output), vec!["apple", "dootax", "matheus-souza-mfa"]);
    }

    /// Opt-in check against the openvpn3 installed on this machine:
    ///   OVPN3_TEST_CONFIG=<config with auth-user-pass> \
    ///     cargo test --lib -- --ignored --nocapture list_configs_flags
    #[test]
    #[ignore = "needs openvpn3 with imported profiles"]
    fn list_configs_flags_profiles_requiring_auth() {
        let expected = std::env::var("OVPN3_TEST_CONFIG").expect("OVPN3_TEST_CONFIG not set");
        let app = tauri::test::mock_app();
        let configs = super::list_configs(app.handle().clone()).expect("list_configs failed");

        for c in &configs {
            println!("{} requires_auth={} username={:?}", c.name, c.requires_auth, c.username);
        }
        let target = configs
            .iter()
            .find(|c| c.name == expected)
            .expect("configured profile not found");
        assert!(target.requires_auth, "{} should require auth", expected);
        assert!(
            configs.iter().any(|c| !c.requires_auth),
            "expected at least one profile without auth-user-pass"
        );
    }
}
