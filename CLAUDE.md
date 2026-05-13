# CLAUDE.md — AI Context for OpenVPN3 GUI

## What is this project?

A desktop GUI for managing OpenVPN3 VPN connections on Linux. Built with Tauri 2 (Rust backend) + React (TypeScript frontend).

## Tech Stack

- **Backend**: Rust, Tauri 2.x, serde, serde_json
- **Frontend**: React 19, TypeScript 6, Vite 8, Tailwind CSS, shadcn/ui (Radix primitives), Lucide icons, Sonner (toasts)
- **Target**: Linux desktop (Ubuntu, Mint, etc.)

## Build Commands

```bash
# Frontend only
npm run build

# Full app (frontend + Rust)
source ~/.cargo/env && npx tauri build

# Dev mode
npm run tauri dev

# Rust check only
source ~/.cargo/env && cd src-tauri && cargo build
```

## Project Layout

```
locales/                    # Shared i18n (JSON) — used by BOTH frontend and backend
  en.json, pt-BR.json, es.json

src/                        # Frontend
  App.tsx                   # Main component — orchestrates state and handlers
  main.tsx                  # Entry point with providers (ThemeProvider, I18nProvider)
  index.css                 # Tailwind + CSS variables for dark/light themes
  locales/index.ts          # Locale registry (imports JSONs, exports types)
  lib/
    i18n.tsx                # I18n context provider + useI18n hook
    theme.tsx               # Theme context provider + useTheme hook
    utils.ts                # cn() utility for class merging
  components/
    ui/                     # Generic shadcn/ui components (Button, Dialog, DropdownMenu, AlertDialog)
    app/                    # App-specific components
      StatusBar.tsx         # Header: connection status + language/theme/about controls
      ConfigItem.tsx        # Single config row with connect/disconnect/remove
      ImportDialog.tsx      # Modal for naming a config during import
      AboutDialog.tsx       # About modal with author info

src-tauri/src/              # Backend (Rust)
  lib.rs                    # Tauri app setup: plugins, system tray, window close intercept
  main.rs                   # Binary entry point (calls lib::run)
  commands/
    mod.rs                  # Shared run_cmd() helper for executing openvpn3
    config.rs               # list_configs, import_config, remove_config
    session.rs              # connect (async), disconnect (async), get_status
    tray.rs                 # set_tray_language — rebuilds tray menu from locale JSON
```

## Key Patterns

### Frontend
- All user-facing strings come from `locales/*.json` via `useI18n().t("key")`
- State lives in App.tsx; child components receive props + callbacks
- Actions (connect/disconnect) use `await new Promise(r => setTimeout(r, 0))` before `invoke()` to allow React to render loading state
- Tauri IPC via `invoke("command_name", { args })` from `@tauri-apps/api/core`

### Backend
- All openvpn3 interaction is via `std::process::Command` wrapping the CLI
- `connect` and `disconnect` are async using `tauri::async_runtime::spawn_blocking` to avoid blocking the main thread
- Tray menu is rebuilt dynamically when language changes (frontend calls `set_tray_language`)
- Window close is intercepted to hide (minimize to tray) instead of quit
- Translations embedded at compile time via `include_str!()`

### i18n
- Single source of truth: `locales/*.json`
- Frontend imports via `src/locales/index.ts` registry
- Backend reads via `include_str!()` in `commands/tray.rs`
- To add a language: create JSON, add to frontend registry, add match arm in tray.rs

## openvpn3 CLI Behavior

- `configs-list` output: table with "Configuration Name" header, dashes separator, then rows of "name    date_or_dash"
- `sessions-list` output: block with "Config name:", "Device:", "Created:" fields. Device may be on same line as Owner.
- `sessions-list` when empty: prints "No sessions available"
- Virtual IP is obtained from `ip addr show <tun_device>` (not from openvpn3 directly)
- Commands don't require sudo

## Configuration

- `src-tauri/tauri.conf.json`: app config (productName, window, bundle, identifier)
- `src-tauri/capabilities/default.json`: Tauri permissions (core, dialog, opener)
- `productName` = "OpenVPN3-GUI" (controls WM_CLASS for taskbar icon)
- `mainBinaryName` = "openvpn3-gui" (controls binary and package name)
