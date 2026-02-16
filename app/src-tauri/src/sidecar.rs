use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

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
fn resolve_script_path(app: &tauri::AppHandle) -> Option<String> {
    if let Ok(res) = app.path().resource_dir() {
        let candidate = res.join("../../scripts/sidecar_main.py");
        if candidate.exists() {
            return Some(candidate.to_string_lossy().to_string());
        }
    }
    // Fallback: relative to CWD (works during `cargo tauri dev`)
    let fallback = std::path::Path::new("scripts/sidecar_main.py");
    if fallback.exists() {
        return Some(fallback.to_string_lossy().to_string());
    }
    None
}

#[tauri::command]
pub async fn run_sidecar(
    app: tauri::AppHandle,
    command_json: String,
) -> Result<String, String> {
    let shell = app.shell();

    // 优先使用 PyInstaller 打包的 sidecar 二进制（不依赖本地 Python）；
    // 如果 sidecar 不可用，回退到 python3 直接执行。
    let (mut rx, mut child) = match shell.sidecar("python-sidecar") {
        Ok(cmd) => cmd.spawn().map_err(|e| {
            format!("Failed to spawn sidecar binary: {}", e)
        })?,
        Err(_) => {
            let script_path = resolve_script_path(&app)
                .unwrap_or_else(|| "scripts/sidecar_main.py".to_string());
            shell
                .command("python-sidecar")
                .args(&[&script_path])
                .spawn()
                .map_err(|e| format!("Failed to spawn python sidecar: {}", e))?
        }
    };

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
                } else if !line_str.trim().is_empty() {
                    // Forward non-JSON stdout as log events
                    let log_event = SidecarEvent {
                        r#type: "progress".to_string(),
                        stage: Some("log".to_string()),
                        message: Some(line_str.clone()),
                        percent: None,
                        status: None,
                        article_path: None,
                        title: None,
                        code: None,
                    };
                    let _ = app.emit("sidecar-event", &log_event);
                }
                output_lines.push(line_str);
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                eprintln!("Sidecar stderr: {}", line_str);
                if !line_str.trim().is_empty() {
                    let log_event = SidecarEvent {
                        r#type: "progress".to_string(),
                        stage: Some("log".to_string()),
                        message: Some(format!("[stderr] {}", line_str)),
                        percent: None,
                        status: None,
                        article_path: None,
                        title: None,
                        code: None,
                    };
                    let _ = app.emit("sidecar-event", &log_event);
                }
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

#[tauri::command]
pub async fn write_temp_html(content: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("zhiqu-preview.html");
    std::fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}
