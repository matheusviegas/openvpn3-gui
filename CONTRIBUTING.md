# Contributing to OpenVPN3 GUI

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-user>/openvpn3-gui.git
   cd openvpn3-gui
   ```
3. Install dependencies:
   ```bash
   ./scripts/setup.sh
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/my-feature
   ```
5. Run in dev mode:
   ```bash
   ./scripts/dev.sh
   ```

## Project Structure

- `src/` — React frontend (TypeScript)
- `src-tauri/src/` — Rust backend (Tauri commands)
- `locales/` — Shared translation files (JSON)
- `scripts/` — Build and dev automation

## Development Guidelines

### Code Style

- **Frontend**: Follow existing patterns. Use shadcn/ui components from `src/components/ui/`.
- **Backend**: Keep commands in their respective module under `src-tauri/src/commands/`.
- **Translations**: All user-facing strings must be in the locale JSON files, never hardcoded.

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add auto-connect on startup`
- `fix: IP not showing when connected`
- `i18n: add French translation`
- `docs: update README with new screenshots`

### Pull Requests

1. Keep PRs focused — one feature or fix per PR
2. Ensure the project builds without errors:
   ```bash
   npm run build
   source ~/.cargo/env && cd src-tauri && cargo build
   ```
3. Test manually with openvpn3 if possible
4. Update translations if you add new user-facing strings
5. Describe what you changed and why in the PR description

## Adding a Translation

This is a great first contribution!

1. Copy `locales/en.json` to `locales/<language-code>.json`
2. Translate all values (keep keys in English)
3. In `src/locales/index.ts`: import your file and add an entry with label + flag emoji
4. In `src-tauri/src/commands/tray.rs`: add a match arm for your locale code
5. Submit a PR

## Reporting Bugs

Open an issue with:
- Your Linux distribution and version
- openvpn3 version (`openvpn3 --version`)
- Steps to reproduce
- Expected vs actual behavior
- Console errors if any (run with `./scripts/dev.sh` to see logs)

## Feature Requests

Open an issue describing:
- What you'd like to see
- Why it would be useful
- Any implementation ideas you have

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
