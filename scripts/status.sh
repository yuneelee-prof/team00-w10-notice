#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/runtime.sh
"$LAB_NODE" scripts/control.mjs status
echo "최근 로그";tail -n 8 .runtime/app.log 2>/dev/null || true
