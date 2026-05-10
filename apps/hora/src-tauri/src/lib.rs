// ============================================================================
// AEGIS Empire — Tauri desktop shell
// ============================================================================
// The app itself is the Vite-built React bundle loaded from `frontendDist`.
// This crate's job is narrow:
//   * Create the main window with the AEGIS chrome (size, background, title bar)
//   * Restore the window's last position/size via tauri-plugin-window-state
//   * Expose a handful of `#[tauri::command]` bridges for things the web app
//     can't do itself (platform info, quit hook). Keep this surface small —
//     anything network-related belongs in the web layer.
// ============================================================================

use tauri::Manager;

#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        family: std::env::consts::FAMILY.to_string(),
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[derive(serde::Serialize)]
struct PlatformInfo {
    os: String,
    arch: String,
    family: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // On macOS we want the app to feel native — apply vibrancy once
            // the main window exists. We silently ignore failure (non-macOS,
            // older OS) rather than crashing the whole app on startup.
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_decorations(true);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_platform_info, quit_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
