mod commands;
mod models;
mod proxy;

use commands::{download, navigation, watch_history};
use proxy::api;
use proxy::stream;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(stream::StreamState::new())
        .manage(download::DownloadManager::new())
        .invoke_handler(tauri::generate_handler![
            api::fetch_movie_detail,
            api::fetch_episode,
            stream::create_stream_token,
            stream::resolve_stream_token,
            watch_history::get_watch_history,
            watch_history::save_watch_history,
            watch_history::clear_watch_history,
            navigation::get_navigation_state,
            download::start_download,
            download::get_download_status,
            download::cancel_download,
            download::download_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
