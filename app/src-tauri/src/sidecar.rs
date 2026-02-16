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

    // 优先使用 PyInstaller 打包的 sidecar 二进制；
    // 如果 sidecar 不可用（开发模式），回退到 python3 直接执行。
    let (mut rx, mut child) = match shell.sidecar("python-sidecar") {
        Ok(cmd) => cmd.spawn().map_err(|e| {
            format!("Failed to spawn sidecar binary: {}", e)
        })?,
        Err(_) => {
            // 开发模式回退：通过 python3 执行脚本
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
