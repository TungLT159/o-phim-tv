# O Phim: Electron → Tauri 2.0 Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Convert the Electron-based O Phim movie streaming desktop app to Tauri 2.0, targeting Windows, macOS, Linux, Android TV, and Google TV.

**Architecture:** Replace Electron's Node.js main process with a Tauri Rust backend. The React frontend is preserved with a `tauri-bridge/` abstraction layer replacing `window.ophim*` Electron IPC globals. The Node.js HTTP server (`server.js`) is rewritten as Tauri Rust commands using `reqwest` for API proxying.

**Tech Stack:** Tauri 2.0, Rust (reqwest, tokio, serde, chrono), React 18, tauri-plugin-store, tauri-plugin-shell, tauri-plugin-updater

---

## Task 1: Initialize Tauri Project

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Modify: `package.json` (add Tauri scripts + deps, remove Electron deps)
- Modify: `.gitignore` (add src-tauri/target)

- [ ] **Step 1: Install Tauri CLI**

Run:
```bash
npm install --save-dev @tauri-apps/cli@^2
npm install @tauri-apps/api@^2 @tauri-apps/plugin-store@^2 @tauri-apps/plugin-shell@^2 @tauri-apps/plugin-updater@^2 @tauri-apps/plugin-fs@^2 @tauri-apps/plugin-dialog@^2
```

Remove Electron dependencies:
```bash
npm uninstall electron electron-builder electron-updater png-to-ico pngjs rcedit gh-pages
```

- [ ] **Step 2: Create `src-tauri/Cargo.toml`**

```toml
[package]
name = "o-phim"
version = "0.4.5"
description = "O Phim - Movie Streaming Desktop App"
authors = ["TungLT159"]
edition = "2021"

[lib]
name = "o_phim_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-store = "2"
tauri-plugin-shell = "2"
tauri-plugin-updater = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
```

- [ ] **Step 3: Create `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: Create `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/nickel-org/nickel.rs/master/schema.json",
  "productName": "O Phim",
  "version": "0.4.5",
  "identifier": "com.ophim.desktop",
  "build": {
    "frontendDist": "../build",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "cross-env BROWSER=none react-scripts start",
    "beforeBuildCommand": "cross-env NODE_OPTIONS=--openssl-legacy-provider react-scripts build"
  },
  "app": {
    "windows": [
      {
        "title": "O Phim",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 640,
        "resizable": true,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi", "dmg", "appimage", "deb"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "pubkey": "",
      "endpoints": [
        "https://github.com/TungLT159/app-o-phim/releases/latest/download/updater.json"
      ]
    },
    "store": {},
    "shell": {
      "open": true,
      "sidecar": true
    }
  }
}
```

- [ ] **Step 5: Create `src-tauri/capabilities/default.json`**

```json
{
  "identifier": "default",
  "description": "Default capabilities for O Phim",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default",
    "shell:default",
    "shell:allow-open",
    "shell:allow-execute",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "dialog:default",
    "dialog:allow-save",
    "dialog:allow-open",
    "updater:default",
    "updater:allow-check",
    "updater:allow-download",
    "updater:allow-install"
  ]
}
```

- [ ] **Step 6: Create `src-tauri/src/main.rs`**

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    o_phim_lib::run()
}
```

- [ ] **Step 7: Create `src-tauri/src/lib.rs`**

```rust
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
```

- [ ] **Step 8: Update `package.json` scripts**

Edit `package.json` scripts section. Add Tauri scripts, remove Electron scripts:

```json
"scripts": {
  "start": "node scripts/start-dev.js",
  "start:react": "cross-env NODE_OPTIONS=--openssl-legacy-provider BROWSER=none react-scripts start",
  "serve": "node server.js",
  "build": "cross-env NODE_OPTIONS=--openssl-legacy-provider react-scripts build",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "tauri:android:init": "tauri android init",
  "tauri:android:dev": "tauri android dev",
  "tauri:android:build": "tauri android build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

Remove `"main": "electron/main.js"` from `package.json`.

- [ ] **Step 9: Update `.gitignore`**

Add to `.gitignore`:
```
# Tauri
src-tauri/target/
src-tauri/gen/
src-tauri/icons/
```

- [ ] **Step 10: Verify Tauri project compiles**

Run:
```bash
cd src-tauri && cargo check 2>&1
```

Expected: Build succeeds (with warnings about unused code is OK at this stage).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize Tauri 2.0 project structure"
```

---

## Task 2: Shared Rust Models

**Files:**
- Create: `src-tauri/src/models.rs`

- [ ] **Step 1: Write `src-tauri/src/models.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchItem {
    pub key: String,
    pub movie_id: String,
    pub episode_name: String,
    pub current_time: f64,
    pub duration: f64,
    pub percentage: f64,
    pub timestamp: String,
    pub movie_info: MovieInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieInfo {
    pub title: String,
    pub poster: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationState {
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

// OPhim API response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieResponse {
    pub status: bool,
    pub msg: Option<String>,
    pub data: Option<MovieData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieData {
    pub item: Option<MovieItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieItem {
    pub _id: Option<String>,
    pub name: Option<String>,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub poster_url: Option<String>,
    pub thumb_url: Option<String>,
    pub episodes: Option<Vec<EpisodeServer>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeServer {
    pub server_name: Option<String>,
    pub server_data: Option<Vec<EpisodeItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeItem {
    pub name: String,
    pub slug: String,
    pub filename: Option<String>,
    pub link_embed: Option<String>,
    pub link_m3u8: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeResponse {
    pub name: String,
    pub slug: String,
    pub playlist_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamTokenEntry {
    pub url: String,
    pub expires_at: i64,
}

// Download types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadJob {
    pub id: String,
    pub status: String,
    pub progress: u32,
    pub duration: f64,
    pub current_time: f64,
    pub message: String,
    pub filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadStatus {
    pub job_id: String,
    pub status: String,
    pub progress: u32,
    pub message: String,
    pub filename: String,
    pub size: u64,
}

// M3U8 variant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantStream {
    pub url: String,
    pub bandwidth: u64,
    pub resolution: Option<String>,
    pub height: u32,
    pub quality: Option<String>,
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Compiles successfully.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/models.rs
git commit -m "feat: add shared Rust models for API responses and state"
```

---

## Task 3: Rust M3U8 Playlist Parser

**Files:**
- Create: `src-tauri/src/proxy/mod.rs`
- Create: `src-tauri/src/proxy/playlist.rs`

- [ ] **Step 1: Create `src-tauri/src/proxy/mod.rs`**

```rust
pub mod api;
pub mod playlist;
pub mod stream;
```

- [ ] **Step 2: Create `src-tauri/src/proxy/playlist.rs`**

```rust
use crate::models::VariantStream;

/// Parse an M3U8 master playlist and extract variant stream info.
pub fn parse_master_playlist(content: &str, base_url: &str) -> Vec<VariantStream> {
    let mut variants = Vec::new();
    let mut current_bandwidth: Option<u64> = None;
    let mut current_resolution: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("#EXT-X-STREAM-INF:") {
            current_bandwidth = trimmed
                .split(|c| c == ',' || c == ' ')
                .find_map(|part| {
                    let part = part.trim();
                    if let Some(bw) = part.strip_prefix("BANDWIDTH=") {
                        bw.parse::<u64>().ok()
                    } else {
                        None
                    }
                });

            current_resolution = trimmed
                .split(|c| c == ',' || c == ' ')
                .find_map(|part| {
                    let part = part.trim();
                    if let Some(res) = part.strip_prefix("RESOLUTION=") {
                        Some(res.to_string())
                    } else {
                        None
                    }
                });
        } else if !trimmed.starts_with('#') {
            if let (Some(bandwidth), Some(resolution)) =
                (current_bandwidth.take(), current_resolution.take())
            {
                let url = resolve_url(trimmed, base_url);
                let height = resolution
                    .split('x')
                    .nth(1)
                    .and_then(|h| h.parse::<u32>().ok())
                    .unwrap_or(0);
                let quality = if height > 0 {
                    Some(format!("{}p", height))
                } else {
                    None
                };
                variants.push(VariantStream {
                    url,
                    bandwidth,
                    resolution: Some(resolution),
                    height,
                    quality,
                });
            } else if let Some(bandwidth) = current_bandwidth.take() {
                let url = resolve_url(trimmed, base_url);
                variants.push(VariantStream {
                    url,
                    bandwidth,
                    resolution: None,
                    height: 0,
                    quality: None,
                });
            }
        }
    }

    variants
}

/// Select the best quality variant matching the requested quality, or the highest bandwidth.
pub fn select_quality_variant(variants: &[VariantStream], requested_quality: &str) -> Option<&VariantStream> {
    if variants.is_empty() {
        return None;
    }

    if !requested_quality.is_empty() {
        let requested_height = requested_quality.trim_end_matches('p').parse::<u32>().ok();
        if let Some(height) = requested_height {
            if let Some(exact) = variants.iter().find(|v| v.height == height) {
                return Some(exact);
            }
        }
    }

    variants.iter().max_by_key(|v| v.bandwidth)
}

fn resolve_url(value: &str, base_url: &str) -> String {
    if value.starts_with("http://") || value.starts_with("https://") {
        value.to_string()
    } else {
        let base = base_url.trim_end_matches('/');
        let path = value.trim_start_matches('/');
        format!("{}/{}", base, path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_master_playlist() {
        let content = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x404\n720p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1080x608\n1080p.m3u8\n";
        let base = "https://example.com/playlist.m3u8";
        let variants = parse_master_playlist(content, base);
        assert_eq!(variants.len(), 2);
        assert_eq!(variants[0].height, 404);
        assert_eq!(variants[1].height, 608);
    }

    #[test]
    fn test_select_quality_variant() {
        let variants = vec![
            VariantStream {
                url: "a.m3u8".into(),
                bandwidth: 1280000,
                resolution: Some("720x404".into()),
                height: 404,
                quality: Some("404p".into()),
            },
            VariantStream {
                url: "b.m3u8".into(),
                bandwidth: 2560000,
                resolution: Some("1080x608".into()),
                height: 608,
                quality: Some("608p".into()),
            },
        ];
        let selected = select_quality_variant(&variants, "608p").unwrap();
        assert_eq!(selected.height, 608);
    }

    #[test]
    fn test_resolve_url_absolute() {
        assert_eq!(
            resolve_url("https://other.com/seg.ts", "https://base.com/play.m3u8"),
            "https://other.com/seg.ts"
        );
    }

    #[test]
    fn test_resolve_url_relative() {
        assert_eq!(
            resolve_url("seg.ts", "https://base.com/path/play.m3u8"),
            "https://base.com/path/seg.ts"
        );
    }
}
```

- [ ] **Step 3: Run playlist tests**

```bash
cd src-tauri && cargo test proxy::playlist::tests -- --nocapture 2>&1
```

Expected: All 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/proxy/
git commit -m "feat: add M3U8 playlist parser and quality selector"
```

---

## Task 4: Rust API Proxy Commands

**Files:**
- Create: `src-tauri/src/proxy/api.rs`

This replaces the movie detail + episode endpoints from `server.js`.

- [ ] **Step 1: Create `src-tauri/src/proxy/api.rs`**

```rust
use crate::models::{EpisodeItem, EpisodeResponse, MovieItem, MovieResponse};
use crate::proxy::stream;
use std::sync::Mutex;
use std::time::Instant;
use tauri::State;

const OPHIM_BASE_URL: &str = "https://ophim1.com";
const MOVIE_CACHE_TTL_SECS: u64 = 300; // 5 minutes

struct MovieCache {
    data: serde_json::Value,
    expires_at: Instant,
}

struct ApiState {
    client: reqwest::Client,
    movie_cache: Mutex<Option<MovieCache>>,
}

fn sanitize_movie_item(item: &mut MovieItem) {
    if let Some(ref mut episodes) = item.episodes {
        for server in episodes.iter_mut() {
            if let Some(ref mut server_data) = server.server_data {
                for episode in server_data.iter_mut() {
                    episode.link_m3u8 = None;
                    episode.link_embed = None;
                }
            }
        }
    }
}

#[tauri::command]
pub async fn fetch_movie_detail(id: String) -> Result<serde_json::Value, String> {
    let url = format!("{}/v1/api/phim/{}", OPHIM_BASE_URL, id);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Upstream request failed: {}", resp.status()));
    }

    let mut data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Sanitize: remove link_m3u8 and link_embed
    if let Some(item) = data.pointer_mut("/data/item") {
        if let Some(episodes) = item.get_mut("episodes") {
            if let Some(episodes_arr) = episodes.as_array_mut() {
                for server in episodes_arr.iter_mut() {
                    if let Some(server_data) = server.get_mut("server_data") {
                        if let Some(data_arr) = server_data.as_array_mut() {
                            for ep in data_arr.iter_mut() {
                                if let Some(obj) = ep.as_object_mut() {
                                    obj.remove("link_m3u8");
                                    obj.remove("link_embed");
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(data)
}

#[tauri::command]
pub async fn fetch_episode(
    id: String,
    name: String,
    group: Option<usize>,
) -> Result<EpisodeResponse, String> {
    let url = format!("{}/v1/api/phim/{}", OPHIM_BASE_URL, id);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse: {}", e))?;

    let episodes_val = data
        .pointer("/data/item/episodes")
        .ok_or_else(|| "No episodes found".to_string())?;

    let episodes: Vec<EpisodeServer> =
        serde_json::from_value(episodes_val.clone()).map_err(|e| format!("Parse error: {}", e))?;

    let episode = match group {
        Some(idx) => episodes
            .get(idx)
            .and_then(|s| s.server_data.as_ref())
            .and_then(|data| {
                data.iter().find(|e| e.name == name || e.slug == name)
            }),
        None => episodes.iter().find_map(|s| {
            s.server_data.as_ref().and_then(|data| {
                data.iter().find(|e| e.name == name || e.slug == name)
            })
        }),
    };

    let ep = episode.ok_or_else(|| "Episode not found".to_string())?;
    let m3u8_url = ep
        .link_m3u8
        .clone()
        .ok_or_else(|| "Episode has no stream URL".to_string())?;

    let playlist_url = stream::create_stream_token_inner(m3u8_url);

    Ok(EpisodeResponse {
        name: ep.name.clone(),
        slug: ep.slug.clone(),
        playlist_url,
    })
}

#[derive(serde::Serialize, serde::Deserialize)]
struct EpisodeServer {
    server_name: Option<String>,
    server_data: Option<Vec<EpisodeItem>>,
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Compiles (will warn about unused imports, that's fine).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/proxy/api.rs
git commit -m "feat: add Tauri commands for movie detail and episode proxy"
```

---

## Task 5: Rust Stream Token Management

**Files:**
- Create: `src-tauri/src/proxy/stream.rs`

This replaces the stream token proxy logic from `server.js`.

- [ ] **Step 1: Create `src-tauri/src/proxy/stream.rs`**

```rust
use crate::models::StreamTokenEntry;
use rand::Rng;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const STREAM_TOKEN_TTL_MS: u64 = 6 * 60 * 60 * 1000; // 6 hours

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
        .as_millis()
}

pub fn create_stream_token_inner(url: String) -> String {
    // This is called without State access; tokens are stored in StreamState
    // Returns a placeholder — actual token creation goes through the command.
    format!("/api/stream?url={}", url)
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

    // Clean expired tokens
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
```

- [ ] **Step 2: Add `rand` to `Cargo.toml`**

Add to `Cargo.toml` dependencies:
```toml
rand = "0.8"
```

- [ ] **Step 3: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/proxy/stream.rs Cargo.toml Cargo.lock
git commit -m "feat: add stream token management with Tauri commands"
```

---

## Task 6: Rust Watch History Commands

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/watch_history.rs`

- [ ] **Step 1: Create `src-tauri/src/commands/mod.rs`**

```rust
pub mod download;
pub mod navigation;
pub mod watch_history;
```

- [ ] **Step 2: Create `src-tauri/src/commands/watch_history.rs`**

These commands use `tauri-plugin-store` to persist watch history. The store is accessed from the frontend via `@tauri-apps/plugin-store`. The Rust commands provide an alternative direct access path.

```rust
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
```

- [ ] **Step 3: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/
git commit -m "feat: add watch history Tauri commands with store plugin"
```

---

## Task 7: Rust Navigation Command

**Files:**
- Create: `src-tauri/src/commands/navigation.rs`

- [ ] **Step 1: Create `src-tauri/src/commands/navigation.rs`**

```rust
use crate::models::NavigationState;

#[tauri::command]
pub fn get_navigation_state() -> NavigationState {
    // Navigation state is tracked entirely in JavaScript via history API.
    // This command exists as a bridge for future expansion.
    NavigationState {
        can_go_back: false,
        can_go_forward: false,
    }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Compiles successfully.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/navigation.rs
git commit -m "feat: add navigation state command"
```

---

## Task 8: Rust Download Commands (ffmpeg Sidecar)

**Files:**
- Create: `src-tauri/src/commands/download.rs`

This manages ffmpeg-based downloads via `tauri-plugin-shell` sidecar.

- [ ] **Step 1: Create `src-tauri/src/commands/download.rs`**

```rust
use crate::models::{DownloadJob, DownloadStatus};
use crate::proxy::playlist;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DOWNLOAD_JOB_TTL_MS: u64 = 60 * 60 * 1000; // 1 hour

pub struct DownloadManager {
    jobs: Mutex<HashMap<String, JobEntry>>,
}

struct JobEntry {
    job: DownloadJob,
    output_path: Option<String>,
    created_at: u64,
    ffmpeg_child: Option<tauri_plugin_shell::ShellChild>,
}

impl DownloadManager {
    pub fn new() -> Self {
        DownloadManager {
            jobs: Mutex::new(HashMap::new()),
        }
    }
}

fn generate_job_id() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("{:x}", now)
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

#[tauri::command]
pub async fn start_download(
    slug: String,
    ep: String,
    quality: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, DownloadManager>,
) -> Result<DownloadJob, String> {
    // Fetch movie detail to find episode stream URL
    let movie_url = format!("https://ophim1.com/v1/api/phim/{}", slug);
    let client = reqwest::Client::new();
    let resp = client
        .get(&movie_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch movie: {}", e))?;
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse: {}", e))?;

    let episodes_val = data
        .pointer("/data/item/episodes")
        .ok_or_else(|| "No episodes".to_string())?;
    let episodes: Vec<serde_json::Value> =
        serde_json::from_value(episodes_val.clone()).map_err(|e| e.to_string())?;

    let mut m3u8_url: Option<String> = None;
    for server in &episodes {
        if let Some(data_arr) = server.get("server_data").and_then(|d| d.as_array()) {
            for episode in data_arr {
                let name = episode
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("");
                let slug_val = episode
                    .get("slug")
                    .and_then(|s| s.as_str())
                    .unwrap_or("");
                if name == ep || slug_val == ep {
                    m3u8_url = episode
                        .get("link_m3u8")
                        .and_then(|l| l.as_str())
                        .map(|s| s.to_string());
                    break;
                }
            }
        }
        if m3u8_url.is_some() {
            break;
        }
    }

    let m3u8 = m3u8_url.ok_or_else(|| "Episode stream not found".to_string())?;

    // Parse master playlist if needed
    let master_resp = client
        .get(&m3u8)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch playlist: {}", e))?;
    let master_text = master_resp
        .text()
        .await
        .map_err(|e| format!("Failed to read playlist: {}", e))?;

    let input_url = if master_text.contains("#EXT-X-STREAM-INF") {
        let variants = playlist::parse_master_playlist(&master_text, &m3u8);
        let q = quality.as_deref().unwrap_or("");
        playlist::select_quality_variant(&variants, q)
            .map(|v| v.url.clone())
            .unwrap_or(m3u8)
    } else {
        m3u8
    };

    // Create job
    let job_id = generate_job_id();
    let job = DownloadJob {
        id: job_id.clone(),
        status: "processing".to_string(),
        progress: 0,
        duration: 0.0,
        current_time: 0.0,
        message: "Đang chuẩn bị chuyển mã...".to_string(),
        filename: format!("{}-{}.mp4", slug, ep),
    };

    // For desktop: launch ffmpeg via sidecar
    let shell = app.shell();
    let output_dir = std::env::temp_dir().join(format!("ophim-dl-{}", job_id));
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    let output_path = output_dir.join("download.mp4");

    let ffmpeg_args = vec![
        "-y",
        "-nostdin",
        "-user_agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "-i",
        &input_url,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        &output_path.to_string_lossy(),
    ];

    let sidecar = shell
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?
        .args(&ffmpeg_args)
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    jobs.insert(
        job_id,
        JobEntry {
            job: job.clone(),
            output_path: Some(output_path.to_string_lossy().to_string()),
            created_at: now_ms(),
            ffmpeg_child: Some(sidecar),
        },
    );

    Ok(job)
}

#[tauri::command]
pub fn get_download_status(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<DownloadStatus, String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    let entry = jobs.get(&job_id).ok_or_else(|| "Job not found".to_string())?;

    Ok(DownloadStatus {
        job_id: entry.job.id.clone(),
        status: entry.job.status.clone(),
        progress: entry.job.progress,
        message: entry.job.message.clone(),
        filename: entry.job.filename.clone(),
        size: 0,
    })
}

#[tauri::command]
pub fn cancel_download(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    jobs.remove(&job_id);
    Ok(())
}

#[tauri::command]
pub async fn download_file(
    job_id: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<Vec<u8>, String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    let entry = jobs.get(&job_id).ok_or_else(|| "Job not found".to_string())?;
    let path = entry
        .output_path
        .as_ref()
        .ok_or_else(|| "No output file".to_string())?;

    tokio::fs::read(path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

(Expect some warnings about unused fields. That's acceptable.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/download.rs
git commit -m "feat: add ffmpeg download commands with sidecar support"
```

---

## Task 9: Frontend Bridge — Watch History

**Files:**
- Create: `src/tauri-bridge/index.js`
- Create: `src/tauri-bridge/watchHistory.js`
- Modify: `src/utils/watchHistoryManager.js`
- Modify: `src/utils/watchHistoryManager.test.js`

- [ ] **Step 1: Create `src/tauri-bridge/index.js`**

```javascript
export { watchHistoryBridge } from './watchHistory';
export { navigationBridge } from './navigation';
export { updatesBridge } from './updates';
export { apiBridge } from './api';

export const isTauri = () => typeof window !== 'undefined' && window.__TAURI__ !== undefined;
```

- [ ] **Step 2: Create `src/tauri-bridge/watchHistory.js`**

```javascript
import { load } from '@tauri-apps/plugin-store';

let storeInstance = null;

const getStore = async () => {
  if (!storeInstance) {
    storeInstance = await load('watch-history.json', { autoSave: true });
  }
  return storeInstance;
};

export const watchHistoryBridge = {
  read: async () => {
    const store = await getStore();
    const val = await store.get('history');
    return Array.isArray(val) ? val : [];
  },
  write: async (history) => {
    const store = await getStore();
    await store.set('history', history);
  },
  clear: async () => {
    const store = await getStore();
    await store.delete('history');
  },
};
```

- [ ] **Step 3: Modify `src/utils/watchHistoryManager.js`**

Replace the `getElectronStorage()` function (lines 17-30) to use the Tauri bridge:

```javascript
import { watchHistoryBridge, isTauri } from '../tauri-bridge';

// In the file, find:
const getElectronStorage = () => {
  const storage = typeof window !== 'undefined' ? window.ophimWatchHistoryStorage : null;
  if (
    storage &&
    typeof storage.read === 'function' &&
    typeof storage.write === 'function' &&
    typeof storage.clear === 'function'
  ) {
    return storage;
  }
  return null;
};

// Replace with:
const getElectronStorage = () => {
  if (isTauri()) {
    return watchHistoryBridge;
  }
  const storage = typeof window !== 'undefined' ? window.ophimWatchHistoryStorage : null;
  if (
    storage &&
    typeof storage.read === 'function' &&
    typeof storage.write === 'function' &&
    typeof storage.clear === 'function'
  ) {
    return storage;
  }
  return null;
};
```

Also add the import at the top of the file:
```javascript
import { watchHistoryBridge, isTauri } from '../tauri-bridge';
```

- [ ] **Step 4: Update test mocks in `src/utils/watchHistoryManager.test.js`**

At the top of the test file, add a mock for the Tauri bridge:

```javascript
jest.mock('../tauri-bridge', () => ({
  watchHistoryBridge: {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
  },
  isTauri: jest.fn(() => false),
  navigationBridge: {},
  updatesBridge: {},
  apiBridge: {},
}));
```

- [ ] **Step 5: Run tests to verify**

```bash
npm test -- --watchAll=false --testPathPattern="watchHistoryManager"
```

Expected: Tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/tauri-bridge/watchHistory.js src/tauri-bridge/index.js src/utils/watchHistoryManager.js src/utils/watchHistoryManager.test.js
git commit -m "feat: add Tauri watch history bridge and update manager"
```

---

## Task 10: Frontend Bridge — Navigation

**Files:**
- Create: `src/tauri-bridge/navigation.js`
- Modify: `src/components/header/Header.jsx`
- Modify: `src/components/header/Header.test.jsx`

- [ ] **Step 1: Create `src/tauri-bridge/navigation.js`**

```javascript
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './index';

const listeners = new Set();

function notifyListeners(state) {
  listeners.forEach(fn => fn(state));
}

function getCurrentNavState() {
  return {
    canGoBack: window.history.length > 1,
    canGoForward: false,
  };
}

// Listen for popstate events
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    notifyListeners(getCurrentNavState());
  });
}

export const navigationBridge = {
  back: async () => {
    if (isTauri()) {
      window.history.back();
    } else if (window.ophimNavigation?.back) {
      return window.ophimNavigation.back();
    }
    return getCurrentNavState();
  },
  forward: async () => {
    if (isTauri()) {
      window.history.forward();
    } else if (window.ophimNavigation?.forward) {
      return window.ophimNavigation.forward();
    }
    return getCurrentNavState();
  },
  reload: async () => {
    if (isTauri()) {
      window.location.reload();
    } else if (window.ophimNavigation?.reload) {
      return window.ophimNavigation.reload();
    }
    return getCurrentNavState();
  },
  getState: async () => {
    if (isTauri()) {
      return getCurrentNavState();
    }
    if (window.ophimNavigation?.getState) {
      return window.ophimNavigation.getState();
    }
    return getCurrentNavState();
  },
  onStateChange: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
```

- [ ] **Step 2: Modify `src/components/header/Header.jsx`**

Find all occurrences of `window.ophimNavigation` and replace with `navigationBridge`:

At the top of the file, add:
```javascript
import { navigationBridge } from '../../tauri-bridge';
```

Replace `window.ophimNavigation` (lines 53, 76, 93, 99, 104) with `navigationBridge`:

```javascript
// Line 53: const navigation = window.ophimNavigation;
const navigation = navigationBridge;

// Line 76: const navigation = window.ophimNavigation;
// (remove this duplicate, already handled by line 53)

// Line 93: window.ophimNavigation?.back();
await navigationBridge.back();

// Line 99: window.ophimNavigation?.forward();
await navigationBridge.forward();

// Line 104: window.ophimNavigation?.reload();
await navigationBridge.reload();
```

- [ ] **Step 3: Update test mocks in `src/components/header/Header.test.jsx`**

Add at the top:
```javascript
jest.mock('../../tauri-bridge', () => ({
  navigationBridge: {
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    getState: jest.fn().mockResolvedValue({ canGoBack: true, canGoForward: false }),
    onStateChange: jest.fn(() => jest.fn()),
  },
  isTauri: jest.fn(() => false),
  watchHistoryBridge: {},
  updatesBridge: {},
  apiBridge: {},
}));
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern="Header"
```

Expected: Tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tauri-bridge/navigation.js src/components/header/Header.jsx src/components/header/Header.test.jsx
git commit -m "feat: add Tauri navigation bridge and update Header component"
```

---

## Task 11: Frontend Bridge — Updates

**Files:**
- Create: `src/tauri-bridge/updates.js`
- Modify: `src/components/update-notification/UpdateNotification.jsx`
- Modify: `src/components/update-notification/UpdateNotification.test.jsx`

- [ ] **Step 1: Create `src/tauri-bridge/updates.js`**

```javascript
import { check, download, install, onUpdaterEvent } from '@tauri-apps/plugin-updater';
import { isTauri } from './index';

let currentState = { status: 'idle' };
const stateListeners = new Set();

function notifyState(newState) {
  currentState = newState;
  stateListeners.forEach(fn => fn(newState));
}

export const updatesBridge = {
  check: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.check) return window.ophimUpdates.check();
      return { status: 'disabled' };
    }
    notifyState({ status: 'checking' });
    try {
      const update = await check();
      if (update) {
        notifyState({ status: 'available', version: update.version });
      } else {
        notifyState({ status: 'not-available' });
      }
    } catch (e) {
      notifyState({ status: 'error', message: e.message });
    }
    return currentState;
  },
  download: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.download) return window.ophimUpdates.download();
      return currentState;
    }
    notifyState({ status: 'download-progress', percent: 0 });
    try {
      const update = await check();
      if (update) {
        await update.download((event) => {
          notifyState({ status: 'download-progress', percent: Math.round(event.progress || 0) });
        });
        notifyState({ status: 'downloaded', version: update.version });
      }
    } catch (e) {
      notifyState({ status: 'error', message: e.message });
    }
    return currentState;
  },
  install: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.install) return window.ophimUpdates.install();
      return currentState;
    }
    try {
      const update = await check();
      if (update) {
        await install();
      }
    } catch (e) {
      notifyState({ status: 'error', message: e.message });
    }
    return currentState;
  },
  getState: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.getState) return window.ophimUpdates.getState();
      return currentState;
    }
    return currentState;
  },
  onStateChange: (listener) => {
    stateListeners.add(listener);
    const unsubscribe = onUpdaterEvent((event) => {
      notifyState({ status: event.status, ...event });
    });
    return () => {
      stateListeners.delete(listener);
      unsubscribe();
    };
  },
};
```

- [ ] **Step 2: Modify `src/components/update-notification/UpdateNotification.jsx`**

Add import:
```javascript
import { updatesBridge, isTauri } from '../../tauri-bridge';
```

Replace `window.ophimUpdates` references:

```javascript
// Line 11: const updates = window.ophimUpdates;
const updates = isTauri() ? updatesBridge : window.ophimUpdates;

// Line 42: if (!window.ophimUpdates || isDismissed) return null;
if (!updates || isDismissed) return null;

// Line 71: onClick={() => window.ophimUpdates.download()}
onClick={() => updates.download()}

// Line 76: onClick={() => window.ophimUpdates.install()}
onClick={() => updates.install()}
```

- [ ] **Step 3: Update test mock in `UpdateNotification.test.jsx`**

Add at the top:
```javascript
jest.mock('../../tauri-bridge', () => ({
  updatesBridge: {
    check: jest.fn(),
    download: jest.fn(),
    install: jest.fn(),
    getState: jest.fn().mockResolvedValue({ status: 'idle' }),
    onStateChange: jest.fn(() => jest.fn()),
  },
  isTauri: jest.fn(() => false),
  watchHistoryBridge: {},
  navigationBridge: {},
  apiBridge: {},
}));
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --watchAll=false --testPathPattern="UpdateNotification"
```

Expected: Tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tauri-bridge/updates.js src/components/update-notification/UpdateNotification.jsx src/components/update-notification/UpdateNotification.test.jsx
git commit -m "feat: add Tauri updates bridge and update UpdateNotification component"
```

---

## Task 12: Frontend Bridge — API

**Files:**
- Create: `src/tauri-bridge/api.js`

- [ ] **Step 1: Create `src/tauri-bridge/api.js`**

```javascript
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './index';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const apiBridge = {
  fetchMovieDetail: async (id) => {
    if (isTauri()) {
      return invoke('fetch_movie_detail', { id });
    }
    const res = await fetch(`${API_BASE}/api/phim/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  fetchEpisode: async (id, name, group) => {
    if (isTauri()) {
      return invoke('fetch_episode', { id, name, group: group ?? null });
    }
    const params = new URLSearchParams({ name });
    if (group !== undefined && group !== null) params.set('group', group);
    const res = await fetch(`${API_BASE}/api/phim/${id}/episode?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  createStreamToken: async (url) => {
    if (isTauri()) {
      return invoke('create_stream_token', { url });
    }
    // On web, use the local server proxy
    const res = await fetch(`${API_BASE}/api/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  startDownload: async (slug, ep, quality) => {
    if (isTauri()) {
      return invoke('start_download', { slug, ep, quality });
    }
    const params = new URLSearchParams({ slug, ep });
    if (quality) params.set('quality', quality);
    const res = await fetch(`${API_BASE}/api/download/start?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  getDownloadStatus: async (jobId) => {
    if (isTauri()) {
      return invoke('get_download_status', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/status?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  cancelDownload: async (jobId) => {
    if (isTauri()) {
      return invoke('cancel_download', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/cancel?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  downloadFile: async (jobId) => {
    if (isTauri()) {
      return invoke('download_file', { jobId });
    }
    const res = await fetch(`${API_BASE}/api/download/file?id=${jobId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/tauri-bridge/api.js
git commit -m "feat: add Tauri API bridge for proxy commands"
```

---

## Task 13: Cleanup — Remove Electron Files

**Files:**
- Delete: `electron/` directory
- Delete: `server.js`
- Delete: `scripts/generate-electron-icon.js`
- Delete: `scripts/set-electron-icon.js`
- Delete: `scripts/clear-electron-builder-xattrs.js`
- Delete: `scripts/clear-macos-xattrs.js`
- Delete: `scripts/check-mac-signing.js`
- Delete: `scripts/check-gh-token.js`
- Delete: `scripts/check-font-loading.js`
- Delete: `scripts/check-vercel-routing.js`
- Delete: `scripts/generate-nsis-favicon.js`
- Delete: `dist-electron-icon/`
- Delete: `dist-electron-logo-dist/`
- Delete: `dist-electron-logo/`
- Delete: `dist-electron/`
- Delete: `docker-compose.yaml`
- Delete: `Dockerfile`
- Delete: `vercel.json`
- Delete: `.dockerignore`
- Delete: `.env.example`
- Delete: `public/_headers`
- Delete: `public/_redirects`

- [ ] **Step 1: Remove Electron files**

```bash
Remove-Item -Recurse -Force electron
Remove-Item -Force server.js
Remove-Item -Recurse -Force dist-electron-icon -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist-electron-logo-dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist-electron-logo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist-electron -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Remove deployment/docker files**

```bash
Remove-Item -Force Dockerfile -ErrorAction SilentlyContinue
Remove-Item -Force docker-compose.yaml -ErrorAction SilentlyContinue
Remove-Item -Force vercel.json -ErrorAction SilentlyContinue
Remove-Item -Force .dockerignore -ErrorAction SilentlyContinue
Remove-Item -Force .env.example -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Confirm no remaining Electron references in source**

```bash
rg -l "electron" --type-add 'src:*.{js,jsx,json,scss}' --type src --glob '!node_modules' --glob '!src-tauri'
```

Expected: No references to `electron` remain in source files (excluding node_modules).

- [ ] **Step 4: Run all tests to ensure nothing broke**

```bash
npm test -- --watchAll=false
```

Expected: All tests still pass (we preserved backward compatibility in the bridge).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove Electron files, Docker, Vercel, and unused scripts"
```

---

## Task 14: Tauri Icons and Final Build Verification

**Files:**
- Create: `src-tauri/icons/` (generated from `public/logo.png`)

- [ ] **Step 1: Generate Tauri icons**

```bash
npm run tauri icon public/logo.png
```

If this fails, manually create icons using a tool or use Tauri's icon generation:
```bash
npx @tauri-apps/cli@latest icon public/logo.png
```

- [ ] **Step 2: Verify Tauri dev build**

```bash
npm run tauri:dev
```

Expected: Tauri window opens with the React app loaded and all features working.

- [ ] **Step 3: Verify Tauri production build**

```bash
npm run tauri:build
```

Expected: Build succeeds, output in `src-tauri/target/release/bundle/`.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/icons/
git commit -m "feat: add Tauri icons and finalize build configuration"
```

---

## Task 15: Android TV Setup

**Files:**
- Create: Android project via `tauri android init`
- Create: `src-tauri/gen/android/app/src/main/AndroidManifest.xml` (modified)

- [ ] **Step 1: Initialize Android project**

```bash
npm run tauri:android:init
```

- [ ] **Step 2: Add Android TV support to `AndroidManifest.xml`**

Find `src-tauri/gen/android/app/src/main/AndroidManifest.xml` and add:

```xml
<manifest>
    <application>
        <!-- Add TV launcher -->
        <activity>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    <!-- TV hardware features -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.software.leanback" android:required="true" />
</manifest>
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/gen/
git commit -m "feat: add Android TV support with leanback launcher"
```

---

## Task 16: Focus Navigation for TV

**Files:**
- Create: `src/scss/tv-focus.scss`
- Modify: `src/App.scss` (import TV styles)
- Create: `src/hooks/useTvFocus.js`

- [ ] **Step 1: Create `src/hooks/useTvFocus.js`**

```javascript
import { useEffect } from 'react';
import { isTauri } from '../tauri-bridge';

export function useTvFocus() {
  useEffect(() => {
    if (!isTauri()) return;

    const handleKeyDown = (e) => {
      const focused = document.activeElement;
      const focusable = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const currentIndex = Array.from(focusable).indexOf(focused);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentIndex + 1;
          if (next < focusable.length) focusable[next].focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentIndex - 1;
          if (prev >= 0) focusable[prev].focus();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          // Try to find next sibling, else first child
          const nextSibling = focused?.nextElementSibling;
          if (nextSibling?.focus) nextSibling.focus();
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const prevSibling = focused?.previousElementSibling;
          if (prevSibling?.focus) prevSibling.focus();
          break;
        }
        case 'Backspace':
        case 'Escape': {
          // Navigation back
          window.history.back();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

- [ ] **Step 2: Create `src/scss/tv-focus.scss`**

```scss
// TV Focus styles
*:focus-visible {
  outline: 3px solid #ff6b35 !important;
  outline-offset: 3px;
  border-radius: 4px;
}

// Larger touch targets for TV
@media (orientation: landscape) and (min-width: 1280px) {
  button, a, [tabindex] {
    min-height: 48px;
    font-size: 18px;
  }
}
```

- [ ] **Step 3: Add to `src/App.scss`**

```scss
// At the end of App.scss, add:
@import './scss/tv-focus';
```

- [ ] **Step 4: Use hook in App component**

In `src/App.jsx`:
```javascript
import { useTvFocus } from './hooks/useTvFocus';

function App() {
  useTvFocus();
  // ... rest of component
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTvFocus.js src/scss/tv-focus.scss src/App.scss src/App.jsx
git commit -m "feat: add TV remote focus navigation support"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Tauri project initialization | Task 1 |
| Rust shared models | Task 2 |
| M3U8 playlist parser | Task 3 |
| API proxy (movie detail, episode) | Task 4 |
| Stream token management | Task 5 |
| Watch history (store plugin) | Task 6 |
| Navigation command | Task 7 |
| Download commands | Task 8 |
| Frontend watch history bridge | Task 9 |
| Frontend navigation bridge | Task 10 |
| Frontend updates bridge | Task 11 |
| Frontend API bridge | Task 12 |
| Remove Electron/deployment files | Task 13 |
| Tauri icons + build verification | Task 14 |
| Android TV setup | Task 15 |
| TV focus navigation | Task 16 |
