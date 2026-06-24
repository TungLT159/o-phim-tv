# Ổ Phim - O Phim TV

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust)](https://www.rust-lang.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android-4A90D9)](#build)

**Ổ Phim (O Phim TV)** is a cross-platform desktop & mobile movie streaming application built with Tauri v2 and React. It allows users to browse, search, stream, and download movies and TV shows from the **OPhim1.com** upstream API. The app features both a standard web-responsive UI and a **TV-optimized interface** with full remote-control / D-pad navigation for Android TV / Google TV.

---

## Features

- **Browse & Search** — Browse by category (new, series, single, theatrical, anime, TV shows...), country (Vietnam, Korea, US, Japan, China...), and genre (Action, Romance, Comedy, Horror...)
- **HLS Video Player** — Custom-built player with play/pause, seek, volume, fullscreen, Picture-in-Picture, seek acceleration (tap/hold ±10s), thumbnail preview, FPS debug overlay, auto-play next episode
- **Download Episodes** — Download via ffmpeg sidecar (M3U8 → MP4 transcoding with quality selection)
- **Watch History** — Persistent history with "Continue Watching" section, resume from last position
- **TV / Remote UI** — Dedicated TV mode with grid-based D-pad focus management (zones, rows, columns, acceleration, focus traps)
- **Auto Updates** — Automatic update checks and installation via GitHub Releases
- **Security** — Request encryption, token-protected stream URLs, episode link protection (URLs stripped from API responses, fetched on-demand)
- **SEO** — Open Graph, Twitter Cards, JSON-LD structured data, sitemap.xml

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Framework** | Tauri v2 (Rust backend + web frontend) |
| **Frontend** | React 18, React Router v6 |
| **Build Tool** | Create React App (react-scripts 5) |
| **Styling** | SCSS / SASS |
| **State / Navigation** | React Context (FocusContext for TV D-pad) |
| **HTTP Client** | Axios (frontend), reqwest (Rust) |
| **Video** | HTML5 Video + hls.js for HLS streaming |
| **Carousel** | Swiper 11 |
| **Icons** | Boxicons |
| **Packaging** | NSIS, MSI (Windows) / DMG (macOS) / AppImage, DEB (Linux) / APK (Android) |

---

## Requirements

- **Node.js** 18+
- **Rust toolchain** (for Tauri backend)
- **ffmpeg** (for download feature)
- **Android SDK** (for mobile/Android TV builds)

---

## Getting Started

```bash
# Install dependencies
npm install

# Run in browser mode (React dev server on port 3000)
npm start

# Run in Tauri dev mode (desktop app with hot reload)
npm run tauri:dev
```

---

## Build

```bash
# Build React frontend for production
npm run build

# Build Tauri desktop application (produces installers)
npm run tauri:build

# Android
npm run tauri:android:init    # Initialize Android project
npm run tauri:android:dev     # Run on device/emulator
npm run tauri:android:build   # Build APK

# Google TV (Android TV)
npm run tauri:android:build:google-tv
```

### Test

```bash
npm test
```

---

## Project Structure

```
├── public/                   # Static assets (HTML, icons, sitemap)
├── src/                      # React frontend source
│   ├── App.js                # Root component
│   ├── api/                  # API layer (OPhim + TMDB)
│   ├── components/           # UI components
│   │   ├── video-player/     # Custom HLS video player
│   │   ├── tv-hero/          # TV-mode hero banner
│   │   ├── content-row/      # TV horizontal scrolling rows
│   │   └── ...
│   ├── context/              # FocusContext (TV D-pad navigation)
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Home, Catalog, Detail, Search
│   ├── scss/                 # Global styles & TV theming
│   ├── tauri-bridge/         # Browser vs Tauri abstraction layer
│   └── utils/                # Utilities (watch history, SEO, throttling)
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs            # Tauri setup, plugin registration, commands
│   │   ├── commands/         # IPC commands (download, navigation, watch history)
│   │   └── proxy/            # Backend proxy (API proxy, stream tokens, playlist parsing)
│   ├── Cargo.toml
│   └── tauri.conf.json       # Tauri app configuration
├── scripts/                  # Build scripts (Google TV APK builder)
└── .env                      # Environment variables (TMDB key, encryption)
```

---

## Architecture Highlights

- **Dual-mode app**: Runs as a standard website (`npm start`) or as a Tauri desktop/mobile app. The `tauri-bridge/` module abstracts platform-specific APIs.
- **TV-first design**: All components have TV-optimized counterparts. `FocusContext` provides grid-based focus management mapped to D-pad remote controls.
- **Security-first streaming**: The Rust backend strips stream URLs from API responses and serves them via time-limited tokens to prevent scraping.
- **Two-stage episode loading**: Episode stream URLs are fetched on-demand when the user clicks play, not on page load.
- **ffmpeg-based downloads**: Uses Tauri's shell plugin to spawn ffmpeg as a sidecar process for HLS → MP4 transcoding.

---

## License

[MIT](LICENSE)

---

## Author

**TungLT159** — [GitHub](https://github.com/TungLT159/app-o-phim)
