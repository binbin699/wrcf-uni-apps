#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/env.sh
. "$SCRIPT_DIR/env.sh"
load_env_file

DEVICE_ID="${1:-${DEVICE_ID:-}}"
require_env DEVICE_ID

adb -s "$DEVICE_ID" forward tcp:7001 tcp:7001
adb -s "$DEVICE_ID" forward --list
