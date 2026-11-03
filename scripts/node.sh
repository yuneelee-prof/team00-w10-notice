#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/runtime.sh"
exec "$LAB_NODE" "$@"
