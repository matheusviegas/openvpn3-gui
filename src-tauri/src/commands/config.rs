use serde::Serialize;
use super::run_cmd;

#[derive(Serialize)]
pub struct VpnConfig {
    pub name: String,
}

#[tauri::command]
pub fn list_configs() -> Result<Vec<VpnConfig>, String> {
    let output = run_cmd(&["configs-list"])?;
    let mut configs = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("Configuration Name")
            || trimmed.starts_with("---")
        {
            continue;
        }
        if let Some(name) = trimmed.split_whitespace().next() {
            if !name.is_empty() {
                configs.push(VpnConfig { name: name.to_string() });
            }
        }
    }

    configs.dedup_by(|a, b| a.name == b.name);
    Ok(configs)
}

#[tauri::command]
pub fn import_config(file_path: String, name: String) -> Result<String, String> {
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
    run_cmd(&["config-import", "--config", &file_path, "--name", &name, "--persistent"])
}

#[tauri::command]
pub fn remove_config(name: String) -> Result<String, String> {
    run_cmd(&["config-remove", "--config", &name, "--force"])
}
