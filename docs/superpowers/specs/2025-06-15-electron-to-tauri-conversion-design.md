# O Phim: Electron → Tauri 2.0 Conversion Design

> **Goal:** Convert the existing Electron-based O Phim desktop app to Tauri 2.0, targeting Windows, macOS, Linux, Android TV, and Google TV.

## Architecture

Replace Electron's main process (Node.js) with a Tauri Rust backend. The existing React frontend is preserved with a bridge layer replacing Electron IPC calls. The Node.js HTTP server (`server.js`) is rewritten as Tauri Rust commands for cross-platform compatibility (including Android TV where Node.js cannot run).

```
WebView (React App)
    │ invoke() via @tauri-apps/api
    ▼
Tauri Rust Backend
  ├── Commands Layer (watch_history, navigation, updates)
  ├── Proxy Layer (API proxy, HLS stream via reqwest)
  ├── Download Manager (ffmpeg sidecar on desktop)
  └── Plugins (store, shell, updater, fs, dialog)
```

## Platform Targets

| Platform | Priority | Notes |
|----------|----------|-------|
| Windows (nsis/msi) | Primary | Desktop |
| macOS (dmg) | Primary | Desktop |
| Linux (AppImage/deb) | Primary | Desktop |
| Android TV | Secondary | Remote-control navigation |
| Google TV | Secondary | Same as Android TV |

## Frontend Changes

### New: `src/tauri-bridge/` (abstraction layer)

Replaces `window.ophim*` Electron globals with Tauri API calls.

| Electron API | Tauri Replacement | File |
|---|---|---|
| `window.ophimWatchHistoryStorage` | `tauri-plugin-store` via bridge | `tauri-bridge/watchHistory.js` |
| `window.ophimNavigation` | React Router + custom history stack | `tauri-bridge/navigation.js` |
| `window.ophimUpdates` | `tauri-plugin-updater` via bridge | `tauri-bridge/updates.js` |
| `fetch /api/*` (local server) | `invoke()` Tauri commands | `tauri-bridge/api.js` |

The bridge files detect Tauri availability (`window.__TAURI__`) and fall back to web behavior when running in a browser.

### Modified Components

| File | Change |
|------|--------|
| `src/utils/watchHistoryManager.js` | Replace `getElectronStorage()` with `watchHistoryBridge` |
| `src/components/header/Header.jsx` | Replace `window.ophimNavigation` with `navigationBridge` |
| `src/components/update-notification/UpdateNotification.jsx` | Replace `window.ophimUpdates` with `updatesBridge` |
| Tests for above files | Update mocks to use bridge objects |

### Navigation Strategy

Electron's `webContents.goBack()`/`goForward()` is not available in Tauri. Instead, use React Router's navigation + a custom history stack managed via `window.history.pushState`/`popstate` events. The bridge exposes `back()`, `forward()`, `reload()`, `getState()`, and `onStateChange()` mirroring the old API.

## Rust Backend

### Project Structure (`src-tauri/`)

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── capabilities/default.json
├── icons/
└── src/
    ├── main.rs              # Tauri entry point, plugin registration
    ├── lib.rs                # Command registration
    ├── models.rs             # Shared types (WatchItem, MovieResponse, etc.)
    ├── commands/
    │   ├── mod.rs
    │   ├── watch_history.rs  # Store-backed CRUD
    │   ├── navigation.rs     # Navigation state (simple pass-through)
    │   └── download.rs       # ffmpeg job manager
    └── proxy/
        ├── mod.rs
        ├── api.rs            # OPhim API proxy (movie detail, episode)
        ├── stream.rs         # HLS stream token management
        └── playlist.rs       # M3U8 master playlist parser
```

### Tauri Commands

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_watch_history` | — | `Vec<WatchItem>` | Read from tauri-plugin-store |
| `save_watch_history` | `items: Vec<WatchItem>` | — | Write to store |
| `clear_watch_history` | — | — | Delete from store |
| `get_navigation_state` | — | `NavigationState` | Current back/forward state |
| `fetch_movie_detail` | `id: String` | `MovieResponse` | Proxy to ophim1.com API |
| `fetch_episode` | `id, name, group` | `EpisodeResponse` | Find episode + create stream token |
| `create_stream_token` | `url: String` | `String` | Generate expiring stream token |
| `resolve_stream_token` | `token: String` | `Option<String>` | Validate & return URL |
| `start_download` | `slug, ep, quality` | `DownloadJob` | Launch ffmpeg sidecar |
| `get_download_status` | `job_id: String` | `DownloadStatus` | Poll job progress |
| `cancel_download` | `job_id: String` | — | Kill ffmpeg + cleanup |
| `download_file` | `job_id: String` | `Vec<u8>` | Return file bytes (via save dialog) |

### Proxy Architecture

The Node.js server's HTTP routing is replaced by direct Tauri commands:

1. **Movie Detail & Episode**: Invoke → Rust fetches from `ophim1.com` API → caches in memory with 5-min TTL → returns JSON
2. **HLS Streaming**: Create stream token via Rust → Frontend fetches upstream M3U8 directly (CORS permitting). If CORS blocked, use `tauri-plugin-http` for proxied requests.
3. **Stream Token**: In-memory `HashMap<String, TokenEntry>` with expiration (6h TTL), behind `Mutex` for thread safety

### ffmpeg Download (Desktop Only)

- ffmpeg binary bundled as Tauri sidecar via `tauri-plugin-shell`
- Job manager in `commands/download.rs` with progress parsing from ffmpeg stderr
- Download file served via `tauri-plugin-dialog` save dialog + `tauri-plugin-fs` write
- Hidden on Android TV (compile-time conditional)

## Plugin Dependencies (`Cargo.toml`)

```toml
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
chrono = "0.4"
```

## Build Configuration

### tauri.conf.json Key Settings

- `build.frontendDist`: `"../build"` (CRA output)
- `build.devUrl`: `"http://localhost:3000"` (React dev server)
- `build.beforeDevCommand`: `"npm run start:react"` (CSS-only: use `BROWSER=none` to skip opening browser)
- `build.beforeBuildCommand`: `"npm run build"`
- `app.windows[0]`: 1280x800, min 1024x640, black background
- `bundle.targets`: `["nsis", "msi", "dmg", "appimage", "deb"]`
- `plugins.updater`: GitHub releases with public key

### npm Script Changes (`package.json`)

Replace Electron scripts:
```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:android:init": "tauri android init",
    "tauri:android:dev": "tauri android dev",
    "tauri:android:build": "tauri android build",
    "remove": "electron/", "server.js", "scripts/electron-*",
    "removeDeps": "electron, electron-builder, electron-updater"
  }
}
```

## Android TV / Google TV

### Setup
- `npm run tauri:android:init` to create Android project
- Configure `AndroidManifest.xml` for TV (LEANBACK_LAUNCHER)
- TV-optimized icon (320x192 banner)

### Focus Navigation
- CSS `:focus-visible` with high-contrast outline
- TabIndex management for TV remote D-pad
- Event handlers for `ArrowUp/Down/Left/Right/Enter/Back`
- No ffmpeg download feature on TV builds (compile-time feature flag)

### UI Adaptation
- Minimum font-size 16px for TV readability
- Touch interactions hidden on TV (no drag-to-scroll)
- Video player fullscreen by default on TV

## Files to Delete

| File | Reason |
|------|--------|
| `electron/` | Entire Electron main process + preload |
| `server.js` | Replaced by Rust proxy commands |
| `scripts/generate-electron-icon.js` | Electron-specific |
| `scripts/set-electron-icon.js` | Electron-specific |
| `scripts/clear-*-xattrs.js` | Electron-specific |
| `scripts/check-mac-signing.js` | Electron-specific |
| `scripts/check-gh-token.js` | GitHub token check (not needed) |
| `scripts/check-font-loading.js` | Font check (not needed) |
| `scripts/check-vercel-routing.js` | Vercel-specific |
| `scripts/generate-nsis-favicon.js` | NSIS-specific |

## Files to Keep

- `src/` — React frontend (modified)
- `public/` — Static assets
- `package.json` — Modified (remove Electron deps, add Tauri scripts)
- `build/` and `dist-electron/` — Build output (gitignored)

## Non-Goals

- Complete UI redesign (keep existing React components)
- Changing the movie API integration (still uses ophim1.com)
- Rewriting the React frontend in another framework
