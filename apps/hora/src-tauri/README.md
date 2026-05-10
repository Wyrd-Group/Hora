# AEGIS Empire — Desktop (Tauri)

Tauri 2.x native shell that wraps the AEGIS web app as a desktop binary for
macOS (universal), Windows (x64), and Linux (x64).

Tauri was chosen over Electron because:

| Dimension    | Tauri (used here)                 | Electron                        |
| ------------ | --------------------------------- | ------------------------------- |
| Bundle size  | ~3–10 MB                          | ~80–150 MB                      |
| Memory       | Native WebView (~50 MB idle)      | Bundled Chromium (~250 MB idle) |
| Security     | Capability allow-list, no Node    | Full Node per process           |
| Startup      | 200–400 ms                        | 800–1500 ms                     |

## First-time setup

1. Install the Rust toolchain (needed to compile the native shell):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **macOS** — install Xcode command-line tools: `xcode-select --install`
3. **Windows** — install Microsoft Visual Studio C++ Build Tools and WebView2.
4. **Linux** — install WebKitGTK 4.1 (`libwebkit2gtk-4.1-dev` on Debian/Ubuntu).
5. From the repo root:

   ```bash
   cd apps/hora
   npm install
   # Generate all icon sizes from our master 512px icon
   npx tauri icon public/icon-512.png
   ```

## Development

```bash
npm run tauri:dev
```

Starts Vite on `http://localhost:9999` (defined in `vite.config.js`), then
launches the Tauri window pointing at that dev server. HMR works end-to-end.

## Production builds

```bash
# Current platform
npm run tauri:build

# Explicit targets (after running `rustup target add <triple>` first)
npm run desktop:mac    # macOS universal (Apple silicon + Intel)
npm run desktop:win    # Windows x64
npm run desktop:linux  # Linux x64
```

Output lands in `src-tauri/target/release/bundle/`:

- `.dmg` / `.app` (macOS)
- `.msi` / `.exe` (Windows)
- `.deb` / `.AppImage` (Linux)

## Code-signing (release)

Set the following env vars before `tauri:build`:

- **macOS** — `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`
- **Windows** — `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Notarization for macOS requires `APPLE_ID`, `APPLE_PASSWORD` (app-specific),
and `APPLE_TEAM_ID`.

## What lives in `src-tauri/`

- `Cargo.toml` — Rust deps (`tauri`, `tauri-plugin-window-state`, `tauri-plugin-os`)
- `src/main.rs` — Binary entry, hides console on Windows release
- `src/lib.rs` — `run()` function that builds the Tauri runtime and registers
  the two `#[tauri::command]` IPC bridges (`get_platform_info`, `quit_app`)
- `tauri.conf.json` — Window geometry, bundle metadata, CSP, icon paths
- `capabilities/default.json` — IPC permission allow-list (keep small)
- `build.rs` — Invokes `tauri-build` to emit macOS `Info.plist`, Windows
  resource files, etc.

## What we intentionally did NOT wire

- Auto-updater (`tauri-plugin-updater`) — defer until we have a signing
  certificate and release-distribution host
- Deep-link handling (`tauri-plugin-deep-link`) — not needed pre-launch
- Native notifications — the app already uses Web Notifications via the PWA
  registration, which Tauri passes through
