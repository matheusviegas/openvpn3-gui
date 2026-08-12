use serde::Serialize;
use std::process::Command;
use super::{run_cmd, run_cmd_with_input};

#[derive(Serialize, Clone)]
pub struct SessionInfo {
    pub config_name: String,
    pub device: String,
    pub virtual_ip: Option<String>,
    pub connected_since: Option<String>,
}

#[derive(Serialize)]
pub struct SessionStats {
    pub tun_bytes_in: u64,
    pub tun_bytes_out: u64,
    pub ping_ms: Option<f64>,
}

/// Starts a session, optionally answering the interactive auth prompts.
///
/// Reproduces the manual flow:
///   $ openvpn3 session-start --config <name>
///   Auth User name: <username>
///   Auth Password: <password/TOTP>
/// by writing both answers, in that order, to the process stdin.
#[tauri::command]
pub async fn connect(
    config_name: String,
    username: Option<String>,
    password: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let user = username.unwrap_or_default();
        let pass = password.unwrap_or_default();

        if user.trim().is_empty() {
            return run_cmd(&["session-start", "--config", &config_name]);
        }

        let input = format!("{}\n{}\n", user.trim(), pass);
        let result = run_cmd_with_input(
            &["session-start", "--config", &config_name],
            &input,
            &[pass.as_str()],
        );

        // A rejected credential can leave the session registered in openvpn3, which
        // would block the next attempt — drop it (best effort, it usually is already gone).
        if let Err(ref e) = result {
            if e.contains("AUTH_FAILED") {
                let _ = run_cmd(&["session-manage", "--disconnect", "--config", &config_name]);
            }
        }

        result
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

fn get_peer_ip(device: &str) -> Option<String> {
    let output = Command::new("ip")
        .args(["addr", "show", device])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("inet ") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if let Some(pos) = parts.iter().position(|&p| p == "peer") {
                return parts.get(pos + 1).map(|s| s.split('/').next().unwrap_or(s).to_string());
            }
        }
    }
    None
}

fn parse_sessions(output: &str) -> Vec<SessionInfo> {
    if output.contains("No sessions available") || output.trim().is_empty() {
        return vec![];
    }

    let mut sessions = Vec::new();
    let mut config_name: Option<String> = None;
    let mut device: Option<String> = None;
    let mut connected_since: Option<String> = None;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("---") || trimmed.is_empty() {
            // Block separator — push previous session if complete
            if let (Some(cn), Some(dev)) = (config_name.take(), device.take()) {
                let virtual_ip = get_tun_ip(&dev);
                sessions.push(SessionInfo { config_name: cn, device: dev, virtual_ip, connected_since: connected_since.take() });
            }
            config_name = None;
            device = None;
            connected_since = None;
        } else if let Some(val) = trimmed.strip_prefix("Config name:") {
            config_name = Some(val.trim().to_string());
        } else if trimmed.contains("Device:") {
            if let Some(pos) = trimmed.find("Device:") {
                device = Some(trimmed[pos + 7..].trim().to_string());
            }
        } else if trimmed.starts_with("Created:") {
            let val = trimmed.strip_prefix("Created:").unwrap_or(trimmed);
            let date_part = val.split("PID:").next().unwrap_or(val).trim();
            connected_since = Some(date_part.to_string());
        }
    }

    // Push last session
    if let (Some(cn), Some(dev)) = (config_name, device) {
        let virtual_ip = get_tun_ip(&dev);
        sessions.push(SessionInfo { config_name: cn, device: dev, virtual_ip, connected_since });
    }

    sessions
}

#[tauri::command]
pub fn get_openvpn_version() -> Result<String, String> {
    let output = run_cmd(&["version"])?;
    Ok(output.lines().next().unwrap_or("").trim().to_string())
}

#[tauri::command]
pub fn get_status() -> Result<Vec<SessionInfo>, String> {
    let output = match run_cmd(&["sessions-list"]) {
        Ok(o) => o,
        Err(_) => return Ok(vec![]),
    };
    Ok(parse_sessions(&output))
}

fn get_device_for_config(config_name: &str) -> Option<String> {
    let output = run_cmd(&["sessions-list"]).ok()?;
    let sessions = parse_sessions(&output);
    sessions.into_iter().find(|s| s.config_name == config_name).map(|s| s.device)
}

fn parse_stat_value(output: &str, key: &str) -> u64 {
    for line in output.lines() {
        if line.contains(key) {
            if let Some(val) = line.split(key).last() {
                return val.trim().trim_start_matches('.').trim().parse().unwrap_or(0);
            }
        }
    }
    0
}

fn measure_ping(device: &str, peer_ip: &str) -> Option<f64> {
    let output = Command::new("ping")
        .args(["-c", "1", "-W", "2", "-I", device, peer_ip])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        if let Some(pos) = line.find("time=") {
            let after = &line[pos + 5..];
            let num_str: String = after.chars().take_while(|c| *c == '.' || c.is_ascii_digit()).collect();
            return num_str.parse().ok();
        }
    }
    None
}

#[tauri::command]
pub async fn get_session_stats(config_name: String) -> Result<SessionStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stats_output = run_cmd(&["session-stats", "-c", &config_name])
            .map_err(|e| format!("Failed to get stats: {}", e))?;

        let tun_bytes_in = parse_stat_value(&stats_output, "TUN_BYTES_IN");
        let tun_bytes_out = parse_stat_value(&stats_output, "TUN_BYTES_OUT");

        let ping_ms = get_device_for_config(&config_name)
            .and_then(|dev| get_peer_ip(&dev).map(|ip| (dev, ip)))
            .and_then(|(dev, ip)| measure_ping(&dev, &ip));

        Ok(SessionStats { tun_bytes_in, tun_bytes_out, ping_ms })
    })
    .await
    .map_err(|e| e.to_string())?
}
