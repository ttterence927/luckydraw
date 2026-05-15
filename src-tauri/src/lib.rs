use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

/// Port the bundled Next.js server listens on.
const SERVER_PORT: u16 = 3977;

struct ServerProcess(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // ── Production only: spawn the bundled Node.js server ────────────
            #[cfg(not(debug_assertions))]
            {
                let resource_dir = app.path().resource_dir()?;
                let app_data_dir = app.path().app_data_dir()?;

                // Ensure the writable user-data directory exists.
                std::fs::create_dir_all(&app_data_dir)?;

                let node_exe = resource_dir.join("resources").join("node.exe");
                let server_dir = resource_dir.join("resources").join("server");

                let child = std::process::Command::new(&node_exe)
                    .current_dir(&server_dir)
                    .arg("server.js")
                    .env("PORT", SERVER_PORT.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("NODE_ENV", "production")
                    .env("USER_DATA_PATH", app_data_dir.to_str().unwrap_or(""))
                    .spawn()
                    .expect("Failed to start the Next.js server");

                app.manage(ServerProcess(Mutex::new(Some(child))));

                // Wait for the server to be ready, then navigate the window.
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    wait_for_port(SERVER_PORT).await;
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let url = format!("http://127.0.0.1:{SERVER_PORT}");
                        let _ = window.eval(&format!("window.location.href='{url}'"));
                    }
                });
            }

            Ok(())
        })
        // Kill the server when the main window is destroyed.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<ServerProcess>() {
                    if let Ok(mut lock) = state.0.lock() {
                        if let Some(mut child) = lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}

/// Poll `127.0.0.1:<port>` with a TCP connect until the server answers
/// (up to 60 seconds, with 500 ms between attempts).
async fn wait_for_port(port: u16) {
    let addr = format!("127.0.0.1:{port}");
    for _ in 0..120 {
        if tokio::net::TcpStream::connect(&addr).await.is_ok() {
            return;
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }
}
