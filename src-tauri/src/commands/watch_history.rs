use crate::models::WatchItem;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_NAME: &str = "watch-history.json";
const STORE_KEY: &str = "history";

#[tauri::command]
pub async fn get_watch_history(app: AppHandle) -> Result<Vec<WatchItem>, String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    let value = store.get(STORE_KEY);
    match value {
        Some(val) => serde_json::from_value(val.clone()).map_err(|e| e.to_string()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn save_watch_history(
    app: AppHandle,
    items: Vec<WatchItem>,
) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(items).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, value);
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_watch_history(app: AppHandle) -> Result<(), String> {
    let store = app.store(STORE_NAME).map_err(|e| e.to_string())?;
    store.delete(STORE_KEY);
    store.save().map_err(|e| e.to_string())
}
