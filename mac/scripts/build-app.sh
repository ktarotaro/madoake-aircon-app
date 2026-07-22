#!/bin/bash
# MadoakeAircon.app を組み立てて /Applications にインストールするビルドスクリプト。
# 「ログイン時に自動起動」機能（SMAppService）を正しく動かすため、/Applications配下への
# 配置を前提にしている。
set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="MadoakeAircon"
BUILD_DIR=".build/release"
APP_BUNDLE="$APP_NAME.app"

echo "Building release binary..."
swift build -c release

echo "Assembling $APP_BUNDLE ..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

cp "$BUILD_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"
cp scripts/Info.plist "$APP_BUNDLE/Contents/Info.plist"
if [ -f scripts/AppIcon.icns ]; then
  cp scripts/AppIcon.icns "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
fi

echo "Ad-hoc code signing..."
codesign --force --deep --sign - "$APP_BUNDLE"

echo "Installing to /Applications ..."
rm -rf "/Applications/$APP_BUNDLE"
cp -R "$APP_BUNDLE" /Applications/

echo "Done. /Applications/$APP_BUNDLE を開いて起動できます。"
