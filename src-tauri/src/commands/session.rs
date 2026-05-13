use serde::Serialize;
use std::process::Command;
use super::run_cmd;

#[derive(Serialize)]
pub struct VpnStatus {
    pub connected: bool,
    pub config_name: Option<String>,
    pub virtual_ip: Option<String>,
    pub connected_since: Option<String>,
}

#[tauri::command]
pub async fn connect(config_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_cmd(&["session-start", "--config", &config_name])
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn disconnect(config_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_cmd(&["session-manage", "--disconnect", "--config", &config_name])
    })
    .await
    .map_err(|e| e.to_string())?
}

fn get_tun_ip(device: &str) -> Option<String> {
    let output = Command::new("ip")
        .args(["addr", "show", device])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("inet ") {
            return trimmed
                .split_whitespace()
                .nth(1)
                .map(|s| s.split('/').next().unwrap_or(s).to_string());
        }
    }
    None
}

#[tauri::command]
pub fn get_status() -> Result<VpnStatus, String> {
    let output = match run_cmd(&["sessions-list"]) {
        Ok(o) => o,
        Err(_) => {
            return Ok(VpnStatus {
                connected: false,
                config_name: None,
                virtual_ip: None,
                connected_since: None,
            });
        }
    };

    if output.contains("No sessions available") || output.trim().is_empty() {
        return Ok(VpnStatus {
            connected: false,
            config_name: None,
            virtual_ip: None,
            connected_since: None,
        });
    }

    let mut config_name = None;
    let mut device = None;
    let mut connected_since = None;

    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(val) = trimmed.strip_prefix("Config name:") {
            config_name = Some(val.trim().to_string());
        } else if let Some(val) = trimmed.strip_prefix("Device:") {
            device = Some(val.trim().to_string());
        } else if trimmed.starts_with("Created:") {
            let val = trimmed.strip_prefix("Created:").unwrap_or(trimmed);
            let date_part = val.split("PID:").next().unwrap_or(val).trim();
            connected_since = Some(date_part.to_string());
        }
        if let Some(pos) = trimmed.find("Device:") {
            let val = &trimmed[pos + 7..];
            device = Some(val.trim().to_string());
        }
    }

    let virtual_ip = device.as_deref().and_then(get_tun_ip);

    Ok(VpnStatus {
        connected: config_name.is_some(),
        config_name,
        virtual_ip,
        connected_since,
    })
}
