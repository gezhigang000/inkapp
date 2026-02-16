mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            sidecar::run_sidecar,
            sidecar::write_temp_html,
            sidecar::read_logs,
            sidecar::list_articles_native,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
