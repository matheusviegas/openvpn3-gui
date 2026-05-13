pub mod config;
pub mod session;
pub mod tray;

use std::process::Command;

pub fn run_cmd(args: &[&str]) -> Result<String, String> {
    let output = Command::new("openvpn3")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute openvpn3: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(format!("{}{}", stderr, stdout))
    }
}
