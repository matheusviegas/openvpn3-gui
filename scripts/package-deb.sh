#!/bin/bash
# Build and package as .deb for Ubuntu/Mint
set -e
cd "$(dirname "$0")/.."

echo "==> Installing system dependencies..."
sudo apt-get install -y libdbus-1-dev pkg-config libwebkit2gtk-4.1-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev

echo "==> Building..."
npm run tauri build -- --bundles deb

echo "==> Done! .deb package available at:"
find src-tauri/target/release/bundle/deb -name "*.deb" -print
