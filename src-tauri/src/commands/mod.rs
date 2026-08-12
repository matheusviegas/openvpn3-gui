pub mod config;
pub mod credentials;
pub mod session;
pub mod tray;

use std::io::Write;
use std::process::{Command, Stdio};

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

/// Runs openvpn3 writing `input` to its stdin and then closing it (EOF).
///
/// openvpn3 asks for interactive credentials by printing the prompt and reading a
/// line from stdin (`Auth User name:` then `Auth Password:`). Its stdout is fully
/// buffered when not attached to a TTY, so the prompts are only visible after the
/// process flushes — reacting to them would deadlock. Writing every answer upfront
/// (one per line, in prompt order) is what the CLI consumes anyway, and needs no PTY.
///
/// Any string in `redact` is masked in the returned output/error so secrets never
/// reach the frontend or logs.
pub fn run_cmd_with_input(args: &[&str], input: &str, redact: &[&str]) -> Result<String, String> {
    let mut child = Command::new("openvpn3")
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to execute openvpn3: {}", e))?;

    {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to open openvpn3 stdin".to_string())?;
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| format!("Failed to send credentials to openvpn3: {}", e))?;
        let _ = stdin.flush();
        // dropped here -> stdin closed, so openvpn3 aborts instead of hanging if it
        // asks for more input than we provided
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for openvpn3: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = redact_all(&format!("{}{}", stderr, stdout), redact);

    if !output.status.success() {
        return Err(combined);
    }
    if is_auth_failure(&combined) {
        return Err(format!("AUTH_FAILED{}", if combined.trim().is_empty() { String::new() } else { format!(": {}", combined.trim()) }));
    }
    Ok(combined)
}

fn redact_all(text: &str, redact: &[&str]) -> String {
    let mut out = text.to_string();
    for secret in redact {
        if secret.len() >= 3 {
            out = out.replace(secret, "***");
        }
    }
    out
}

/// openvpn3 can exit successfully while the session was torn down by a rejected
/// credential, so the output is inspected for the known auth-failure markers.
pub fn is_auth_failure(output: &str) -> bool {
    let lower = output.to_lowercase();
    [
        "auth failed",
        "auth_failed",
        "authentication failed",
        "authentication failure",
        "auth-failure",
        "credentials verification failed",
        "incorrect user",
        "wrong username",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_auth_failure_markers() {
        assert!(is_auth_failure("Client exception: AUTH_FAILED"));
        assert!(is_auth_failure("Authentication failed, please retry"));
        assert!(!is_auth_failure("Connected to 52.32.47.186 (52.32.47.186)"));
    }

    #[test]
    fn redacts_secrets_from_output() {
        let out = redact_all("Auth Password: s3cr3t-otp", &["s3cr3t-otp"]);
        assert_eq!(out, "Auth Password: ***");
    }

    #[test]
    fn keeps_very_short_values_untouched_to_avoid_mangling_output() {
        let out = redact_all("Connected to 52.32.47.186", &["a"]);
        assert_eq!(out, "Connected to 52.32.47.186");
    }

    /// Opt-in end-to-end check of the interactive prompt flow. Starts a real session:
    ///   OVPN3_TEST_CONFIG=my-config OVPN3_TEST_USER=me OVPN3_TEST_PASS=pass+otp \
    ///     cargo test --lib -- --ignored --nocapture interactive_session_start
    #[test]
    #[ignore = "starts a real VPN session"]
    fn interactive_session_start_answers_prompts() {
        let config = std::env::var("OVPN3_TEST_CONFIG").expect("OVPN3_TEST_CONFIG not set");
        let user = std::env::var("OVPN3_TEST_USER").expect("OVPN3_TEST_USER not set");
        let pass = std::env::var("OVPN3_TEST_PASS").unwrap_or_default();

        let result = run_cmd_with_input(
            &["session-start", "--config", &config],
            &format!("{}\n{}\n", user, pass),
            &[pass.as_str()],
        );
        println!("result: {:#?}", result);

        let output = result.expect("session-start failed");
        assert!(output.contains("Auth User name"), "no auth prompt in output: {}", output);
        assert!(!output.contains(&pass), "password leaked into output");
    }
}
