use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SidecarEvent {
    pub r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub article_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

/// Resolve the path to sidecar_main.py.
/// In development the project root is two levels above the resource dir.
fn resolve_script_path(app: &tauri::AppHandle) -> String {
    if let Ok(res) = app.path().resource_dir() {
        let candidate: PathBuf = res.join("../../scripts/sidecar_main.py");
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }
    // Fallback: relative to CWD (works during `cargo tauri dev`)
    "scripts/sidecar_main.py".to_string()
}

#[tauri::command]
pub async fn run_sidecar(
    app: tauri::AppHandle,
    command_json: String,
) -> Result<String, String> {
    let script_path = resolve_script_path(&app);

    let shell = app.shell();

    let (mut rx, mut child) = shell
        .command("python-sidecar")
        .args(&[&script_path])
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Write the full JSON payload to stdin.
    child
        .write(command_json.as_bytes())
        .map_err(|e| format!("Failed to write to stdin: {}", e))?;

    // Drop child to close the stdin pipe. This sends EOF to the Python
    // process so sys.stdin.read() returns. The rx receiver is
    // independent and will keep receiving stdout/stderr/terminated
    // events until the process exits.
    drop(child);

    let mut output_lines = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                if let Ok(sidecar_event) = serde_json::from_str::<SidecarEvent>(&line_str) {
                    let _ = app.emit("sidecar-event", &sidecar_event);
                }
                output_lines.push(line_str);
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                eprintln!("Sidecar stderr: {}", line_str);
            }
            CommandEvent::Terminated(status) => {
                if status.code.unwrap_or(-1) != 0 {
                    return Err(format!(
                        "Sidecar exited with code: {:?}",
                        status.code
                    ));
                }
                break;
            }
            _ => {}
        }
    }

    Ok(output_lines.join("\n"))
}
