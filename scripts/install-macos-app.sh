#!/bin/bash
# Creates a double-clickable macOS app icon that launches the backend and
# frontend dev servers (in Terminal windows) and opens the app in the
# browser. Safe to re-run: it overwrites the previous version of the app.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_NAME="Orca Profile Manager"
APPS_DIR="$HOME/Applications"
APP_DIR="$APPS_DIR/$APP_NAME.app"

mkdir -p "$APPS_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Build AppIcon.icns from assets/icon.png (source of truth, versioned in the repo)
ICON_SRC="$REPO_ROOT/assets/icon.png"
if [ -f "$ICON_SRC" ]; then
  ICONSET_DIR="$(mktemp -d)/AppIcon.iconset"
  mkdir -p "$ICONSET_DIR"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$ICON_SRC" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
    double=$((size * 2))
    sips -z "$double" "$double" "$ICON_SRC" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET_DIR" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
  rm -rf "$(dirname "$ICONSET_DIR")"
fi

cat > "$APP_DIR/Contents/MacOS/launch.sh" <<LAUNCH_EOF
#!/bin/bash
set -e

PROJECT_DIR="$REPO_ROOT"
BACKEND_PORT=8000
FRONTEND_PORT=5173

port_up() {
  curl -s -o /dev/null "http://localhost:\$1"
}

if ! port_up "\$BACKEND_PORT/status"; then
  osascript -e "tell application \\"Terminal\\" to do script \\"cd '\$PROJECT_DIR/backend' && source .venv/bin/activate && uvicorn app.main:app --reload --port \$BACKEND_PORT\\""
fi

if ! port_up "\$FRONTEND_PORT"; then
  osascript -e "tell application \\"Terminal\\" to do script \\"cd '\$PROJECT_DIR/frontend' && npm run dev\\""
fi

for i in \$(seq 1 60); do
  if port_up "\$BACKEND_PORT/status" && port_up "\$FRONTEND_PORT"; then
    break
  fi
  sleep 1
done

open "http://localhost:\$FRONTEND_PORT"
LAUNCH_EOF

chmod +x "$APP_DIR/Contents/MacOS/launch.sh"

cat > "$APP_DIR/Contents/Info.plist" <<'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundleIdentifier</key>
    <string>com.orcaprofilemanager.app</string>
    <key>CFBundleName</key>
    <string>Orca Profile Manager</string>
    <key>CFBundleDisplayName</key>
    <string>Orca Profile Manager</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIconName</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST_EOF

echo "Icone d'app creee : $APP_DIR"
echo "Glisse-la dans ton Dock depuis ~/Applications si tu veux un acces rapide."
