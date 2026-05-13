#!/bin/bash
# Install all dependencies needed to develop and build the project
set -e
cd "$(dirname "$0")/.."

echo "==> Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y libdbus-1-dev pkg-config libwebkit2gtk-4.1-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev

echo "==> Installing Rust (if not present)..."
if ! command -v cargo &> /dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

echo "==> Installing Node dependencies..."
npm install

echo "==> Done!"
