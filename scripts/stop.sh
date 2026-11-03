#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/runtime.sh
"$LAB_NODE" scripts/control.mjs stop
