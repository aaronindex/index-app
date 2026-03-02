#!/bin/bash
# Build extension zip files for dev and prod.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

for ENV in dev prod; do
  case $ENV in
    dev)  SITE="https://index-dev-rho.vercel.app" ;;
    prod) SITE="https://indexapp.co" ;;
  esac
  BUILD_DIR="../.extension-build-$ENV"
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
  cp manifest.json README.md "$BUILD_DIR/"
  sed "s|const SITE_URL = .*|const SITE_URL = '$SITE';|" background.js > "$BUILD_DIR/background.js"
  (cd "$BUILD_DIR" && zip -r "../extension/extension-$ENV.zip" .)
  rm -rf "$BUILD_DIR"
done

echo "Created extension/extension-dev.zip and extension/extension-prod.zip"
