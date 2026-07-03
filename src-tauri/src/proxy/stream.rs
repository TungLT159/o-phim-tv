use crate::models::StreamTokenEntry;
use rand::Rng;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const STREAM_TOKEN_TTL_MS: u64 = 6 * 60 * 60 * 1000;

pub struct StreamState {
    tokens: Mutex<HashMap<String, StreamTokenEntry>>,
}

impl StreamState {
    pub fn new() -> Self {
        StreamState {
            tokens: Mutex::new(HashMap::new()),
        }
    }
}

fn generate_token() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let random: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(12)
        .map(char::from)
        .collect();
    format!("{:x}-{}", now, random)
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub fn create_stream_token_inner(url: String) -> String {
    url
}

#[cfg(test)]
mod tests {
    use super::create_stream_token_inner;

    #[test]
    fn create_stream_token_inner_keeps_playable_url_for_tauri_player() {
        let url = "https://cdn.example.com/movie/master.m3u8".to_string();

        assert_eq!(create_stream_token_inner(url.clone()), url);
    }
}

#[tauri::command]
pub fn create_stream_token(
    url: String,
    state: tauri::State<'_, StreamState>,
) -> Result<String, String> {
    let token = generate_token();
    let entry = StreamTokenEntry {
        url: url.clone(),
        expires_at: (now_ms() + STREAM_TOKEN_TTL_MS) as i64,
    };

    let mut tokens = state.tokens.lock().map_err(|e| e.to_string())?;
    tokens.insert(token.clone(), entry);

    let now = now_ms() as i64;
    tokens.retain(|_, v| v.expires_at > now);

    Ok(format!("/api/stream?t={}", token))
}

#[tauri::command]
pub fn resolve_stream_token(
    token: String,
    state: tauri::State<'_, StreamState>,
) -> Result<Option<String>, String> {
    let mut tokens = state.tokens.lock().map_err(|e| e.to_string())?;
    let now = now_ms() as i64;

    match tokens.get(&token) {
        Some(entry) if entry.expires_at > now => Ok(Some(entry.url.clone())),
        _ => {
            tokens.remove(&token);
            Ok(None)
        }
    }
}
