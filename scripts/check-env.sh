#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/runtime.sh
exec "$LAB_NODE" scripts/check-env.mjs "$@"
