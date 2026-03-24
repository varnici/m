#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_DIR="$ROOT_DIR/backend/services/core-banking"
VENV_DIR="$ROOT_DIR/.venv-core-banking"

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install -q --upgrade pip
"$VENV_DIR/bin/pip" -q install -r "$SERVICE_DIR/requirements.txt" -r "$SERVICE_DIR/requirements-dev.txt"

export PYTHONPATH="$SERVICE_DIR"

"$VENV_DIR/bin/python" -m pytest -q "$SERVICE_DIR/tests"

