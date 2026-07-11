#!/bin/bash
# One-shot setup: backend venv + deps, frontend deps, macOS app icon.
# Safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Ce projet lit ~/Library/Application Support/OrcaSlicer, propre à macOS. Abandon." >&2
  exit 1
fi

if ! command -v python3 >/dev/null; then
  echo "python3 introuvable. Installe Python 3.11+ (ex: 'brew install python') puis relance ce script." >&2
  exit 1
fi

if ! command -v node >/dev/null; then
  if command -v brew >/dev/null; then
    echo "Node.js introuvable, installation via Homebrew..."
    brew install node
  else
    echo "Node.js introuvable et Homebrew absent. Installe Node.js (nodejs.org) puis relance ce script." >&2
    exit 1
  fi
fi

echo "== Backend =="
cd "$REPO_ROOT/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

echo "== Frontend =="
cd "$REPO_ROOT/frontend"
npm install

echo "== Icone d'app macOS =="
"$SCRIPT_DIR/install-macos-app.sh"

echo
echo "Installation terminee. Double-clique sur 'Orca Profile Manager' dans ~/Applications pour lancer l'appli."
echo "(Elle lit automatiquement ~/Library/Application Support/OrcaSlicer sur cette machine.)"
