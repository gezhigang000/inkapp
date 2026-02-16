use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::path::PathBuf;

/// Cross-platform INK_HOME: Windows → %APPDATA%/Ink, macOS/Linux → ~/.ink
fn ink_home() -> PathBuf {
    if cfg!(target_os = "windows") {
        let appdata = std::env::var("APPDATA")
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().to_string_lossy().to_string());
        PathBuf::from(appdata).join("Ink")
    } else {
        dirs::home_dir().unwrap_or_default().join(".ink")
    }
}

/// Sidecar event struct — kept for reference; event forwarding uses serde_json::Value
/// to transparently pass all fields (including Agent-specific ones).
#[allow(dead_code)]
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
    // 如果 sidecar 不可用（找不到或启动失败），回退到 python3 直接执行。
    // 开发模式下始终使用 python3，确保运行最新的 Python 源码。
    let sidecar_result = if cfg!(dev) {
        None
    } else {
        shell
            .sidecar("python-sidecar")
            .ok()
            .and_then(|cmd| {
                cmd.env("PYTHONIOENCODING", "utf-8")
                    .env("PYTHONUTF8", "1")
                    .spawn()
                    .ok()
            })
    };

    let (mut rx, mut child) = match sidecar_result {
        Some(spawned) => spawned,
        None => {
            let script_path = resolve_script_path(&app)
                .unwrap_or_else(|| "scripts/sidecar_main.py".to_string());
            shell
                .command("python-sidecar")
                .args(&[&script_path])
                .env("PYTHONIOENCODING", "utf-8")
                .env("PYTHONUTF8", "1")
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
                // Use serde_json::Value for transparent forwarding of all fields
                // (Agent mode sends extra fields like turn, tool, detail)
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line_str) {
                    let _ = app.emit("sidecar-event", &value);
                } else if !line_str.trim().is_empty() {
                    // Forward non-JSON stdout as log events
                    let log_event = serde_json::json!({
                        "type": "progress",
                        "stage": "log",
                        "message": line_str.clone(),
                    });
                    let _ = app.emit("sidecar-event", &log_event);
                }
                output_lines.push(line_str);
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line).to_string();
                eprintln!("Sidecar stderr: {}", line_str);
                if !line_str.trim().is_empty() {
                    let log_event = serde_json::json!({
                        "type": "progress",
                        "stage": "log",
                        "message": format!("[stderr] {}", line_str),
                    });
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
    let file_path = temp_dir.join("ink-preview.html");
    std::fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_logs(lines: Option<usize>) -> Result<serde_json::Value, String> {
    let max_lines = lines.unwrap_or(200);
    let log_dir = ink_home().join("logs");
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let log_file = log_dir.join(format!("{}.log", today));

    if !log_file.exists() {
        return Ok(serde_json::json!({
            "content": "暂无日志",
            "log_dir": log_dir.to_string_lossy()
        }));
    }

    let content = std::fs::read_to_string(&log_file)
        .map_err(|e| format!("Failed to read log: {}", e))?;
    let all_lines: Vec<&str> = content.lines().collect();
    let start = if all_lines.len() > max_lines { all_lines.len() - max_lines } else { 0 };
    let tail = all_lines[start..].join("\n");

    Ok(serde_json::json!({
        "content": tail,
        "log_dir": log_dir.to_string_lossy()
    }))
}

#[tauri::command]
pub async fn list_articles_native(output_dir: Option<String>) -> Result<serde_json::Value, String> {
    let dir = output_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| ink_home().join("articles"));

    let mut articles = Vec::new();

    if !dir.exists() {
        return Ok(serde_json::json!({ "articles": articles }));
    }

    let mut entries: Vec<_> = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read dir: {}", e))?
        .filter_map(|e| e.ok())
        .collect();
    entries.sort_by(|a, b| b.file_name().cmp(&a.file_name()));

    for entry in entries {
        let path = entry.path();
        // Look for metadata JSON in subdirectories
        if path.is_dir() {
            if let Some(meta) = find_metadata_in_dir(&path) {
                let mut meta = meta;
                meta["id"] = serde_json::Value::String(
                    path.file_name().unwrap_or_default().to_string_lossy().to_string()
                );
                articles.push(meta);
            }
        } else if path.extension().map_or(false, |e| e == "json")
            && path.to_string_lossy().contains("-metadata")
        {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(mut meta) = serde_json::from_str::<serde_json::Value>(&content) {
                    let stem = path.file_stem().unwrap_or_default().to_string_lossy()
                        .replace("-metadata", "");
                    meta["id"] = serde_json::Value::String(stem);
                    articles.push(meta);
                }
            }
        }
    }

    Ok(serde_json::json!({ "articles": articles }))
}

fn find_metadata_in_dir(dir: &std::path::Path) -> Option<serde_json::Value> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with("-metadata.json") || name == "metadata.json" {
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&content) {
                        return Some(meta);
                    }
                }
            }
        }
    }
    None
}
