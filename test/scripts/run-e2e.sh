#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$(cd "$SCRIPT_DIR/.." && pwd)/.env}"
# shellcheck source=test/scripts/env.sh
. "$SCRIPT_DIR/env.sh"
load_env_file

DEVICE_ID="${1:-${DEVICE_ID:-}}"
APP_PACKAGE="${APP_PACKAGE:-}"
RUN_TO_DEVICE="${RUN_TO_DEVICE:-0}"
REPORT_ROOT="${REPORT_ROOT:-test/reports}"
FLOW_TARGETS="${FLOW_TARGETS:-test/flows/smoke test/flows/device test/flows/agent test/flows/profile}"
TEST_EMAIL="${TEST_EMAIL:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"
TEST_USER_NAME="${TEST_USER_NAME:-}"
TEST_DEVICE_NAME_REGEX="${TEST_DEVICE_NAME_REGEX:-__MISSING_TEST_DEVICE__}"
HAS_TEST_DEVICE="${HAS_TEST_DEVICE:-0}"
HAS_TEST_AGENT="${HAS_TEST_AGENT:-0}"
BLOCKED_IS_FAILURE="${BLOCKED_IS_FAILURE:-0}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="${REPORT_ROOT}/${RUN_ID}"
REPORT_MD="${REPORT_DIR}/report.md"
REPORT_DATA_JSON="${REPORT_DIR}/report-data.json"
FLOW_RESULTS_JSONL="${REPORT_DIR}/flow-results.jsonl"

mkdir -p "$REPORT_DIR"

log() {
  printf '[e2e] %s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf '[e2e] missing command: %s\n' "$1" >&2
    exit 1
  }
}

copy_latest_maestro_artifacts() {
  local flow_slug="$1"
  local latest
  local copied=""

  latest="$(ls -td "$HOME"/.maestro/tests/* 2>/dev/null | head -1 || true)"
  if [ -n "$latest" ] && [ -d "$latest" ]; then
    mkdir -p "$REPORT_DIR/maestro"
    copied="$REPORT_DIR/maestro/${flow_slug}-$(basename "$latest")"
    rm -rf "$copied"
    cp -R "$latest" "$copied"
  fi

  printf '%s\n' "$copied"
}

collect_flow_files() {
  local target
  for target in $FLOW_TARGETS; do
    if [ -d "$target" ]; then
      find "$target" -type f -name '*.yaml' | sort
    elif [ -f "$target" ]; then
      printf '%s\n' "$target"
    else
      printf '[e2e] missing flow target: %s\n' "$target" >&2
      return 1
    fi
  done
}

render_flow_file() {
  local flow_file="$1"
  local rendered_file="$REPORT_DIR/rendered/$flow_file"

  mkdir -p "$(dirname "$rendered_file")"
  perl -pe 's/\$\{([A-Z_][A-Z0-9_]*)\}/exists $ENV{$1} ? $ENV{$1} : $&/ge' \
    "$flow_file" > "$rendered_file"
  printf '%s\n' "$rendered_file"
}

flow_slug() {
  printf '%s\n' "$1" | sed 's#[/.]#-#g; s#[^A-Za-z0-9_-]#-#g'
}

flow_has_tag() {
  local flow_file="$1"
  local tag="$2"

  grep -Eq "^[[:space:]]*-[[:space:]]*${tag}[[:space:]]*$" "$flow_file"
}

flow_block_reason() {
  local flow_file="$1"
  local reasons=()

  if flow_has_tag "$flow_file" "requires-device" && [ "$HAS_TEST_DEVICE" != "1" ]; then
    reasons+=("requires HAS_TEST_DEVICE=1")
  fi
  if flow_has_tag "$flow_file" "requires-agent" && [ "$HAS_TEST_AGENT" != "1" ]; then
    reasons+=("requires HAS_TEST_AGENT=1")
  fi

  if [ "${#reasons[@]}" -gt 0 ]; then
    local IFS=", "
    printf '%s\n' "${reasons[*]}"
  fi
}

write_run_metadata() {
  local started_at="$1"
  local git_commit
  git_commit="$(git rev-parse --short HEAD 2>/dev/null || printf unknown)"

  STARTED_AT="$started_at" GIT_COMMIT="$git_commit" python3 - "$REPORT_DATA_JSON" <<'PY'
import json
import os
import sys

path = sys.argv[1]
data = {
    "run": {
        "id": os.environ["RUN_ID"],
        "started_at": os.environ["STARTED_AT"],
        "finished_at": "",
        "status": "running",
        "git_commit": os.environ["GIT_COMMIT"],
    },
    "environment": {
        "device_id": os.environ["DEVICE_ID"],
        "app_package": os.environ["APP_PACKAGE"],
        "run_to_device": os.environ["RUN_TO_DEVICE"],
        "flow_targets": os.environ["FLOW_TARGETS"],
        "test_email": os.environ["TEST_EMAIL"],
        "has_test_device": os.environ["HAS_TEST_DEVICE"],
        "has_test_agent": os.environ["HAS_TEST_AGENT"],
        "hbuilderx_run_log": "",
        "adb_forward_log": os.environ["REPORT_DIR"] + "/adb-forward.log",
        "maestro_log": os.environ["REPORT_DIR"] + "/maestro.log",
        "flows_list": os.environ["REPORT_DIR"] + "/flows.txt",
    },
    "flows": [],
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
PY
}

append_flow_result() {
  local flow_file="$1"
  local rendered_flow_file="$2"
  local flow_name="$3"
  local domain="$4"
  local status="$5"
  local started_at="$6"
  local finished_at="$7"
  local duration_seconds="$8"
  local exit_code="$9"
  local flow_log="${10}"
  local artifact_dir="${11}"
  local block_reason="${12:-}"

  FLOW_FILE="$flow_file" \
    RENDERED_FLOW_FILE="$rendered_flow_file" \
    FLOW_NAME="$flow_name" \
    FLOW_DOMAIN="$domain" \
    FLOW_RESULT_STATUS="$status" \
    FLOW_STARTED_AT="$started_at" \
    FLOW_FINISHED_AT="$finished_at" \
    FLOW_DURATION_SECONDS="$duration_seconds" \
    FLOW_EXIT_CODE="$exit_code" \
    FLOW_LOG="$flow_log" \
    ARTIFACT_DIR="$artifact_dir" \
    BLOCK_REASON="$block_reason" \
    python3 - "$FLOW_RESULTS_JSONL" <<'PY'
import json
import sys
import os
from pathlib import Path

jsonl_path = Path(sys.argv[1])
log_path = Path(os.environ["FLOW_LOG"])
artifact_dir_text = os.environ["ARTIFACT_DIR"]
artifact_dir = Path(artifact_dir_text) if artifact_dir_text else None

error_patterns = [
    "Assertion is false:",
    "No visible element found:",
    "Unknown Property:",
    "Failed to run flow:",
    "Command failed",
    "Exception",
]

error_summary = ""
if os.environ["BLOCK_REASON"]:
    error_summary = os.environ["BLOCK_REASON"]
elif log_path.exists():
    for line in log_path.read_text(encoding="utf-8", errors="replace").splitlines():
        text = line.strip()
        if any(pattern in text for pattern in error_patterns):
            error_summary = text
            break

screenshots = []
commands_json = ""
ai_report = ""
if artifact_dir and artifact_dir.exists():
    for item in sorted(artifact_dir.iterdir()):
        name = item.name
        if name.endswith(".png"):
            screenshots.append(str(item))
        elif name.startswith("commands-") and name.endswith(".json"):
            commands_json = str(item)
        elif name.startswith("ai-report-") and name.endswith(".html"):
            ai_report = str(item)

record = {
    "file": os.environ["FLOW_FILE"],
    "rendered_file": os.environ["RENDERED_FLOW_FILE"],
    "name": os.environ["FLOW_NAME"],
    "domain": os.environ["FLOW_DOMAIN"],
    "status": os.environ["FLOW_RESULT_STATUS"],
    "started_at": os.environ["FLOW_STARTED_AT"],
    "finished_at": os.environ["FLOW_FINISHED_AT"],
    "duration_seconds": int(os.environ["FLOW_DURATION_SECONDS"]),
    "exit_code": int(os.environ["FLOW_EXIT_CODE"]),
    "log": os.environ["FLOW_LOG"],
    "artifact_dir": artifact_dir_text,
    "commands_json": commands_json,
    "ai_report": ai_report,
    "screenshots": screenshots,
    "error_summary": error_summary,
    "block_reason": os.environ["BLOCK_REASON"],
}
with jsonl_path.open("a", encoding="utf-8") as f:
    f.write(json.dumps(record, ensure_ascii=False) + "\n")
PY
}

flow_name_from_file() {
  local flow_file="$1"
  local name
  name="$(sed -n 's/^name:[[:space:]]*//p' "$flow_file" | head -1 | sed 's/^"//; s/"$//')"
  if [ -n "$name" ]; then
    printf '%s\n' "$name"
  else
    basename "$flow_file" .yaml
  fi
}

flow_domain_from_file() {
  local flow_file="$1"
  case "$flow_file" in
    test/flows/*/*) printf '%s\n' "$(printf '%s\n' "$flow_file" | cut -d / -f 3)" ;;
    flows/*/*) printf '%s\n' "$(printf '%s\n' "$flow_file" | cut -d / -f 2)" ;;
    *) printf 'other\n' ;;
  esac
}

generate_report() {
  local final_status="$1"
  local finished_at="$2"
  local hbuilderx_log=""

  if [ -f "$REPORT_DIR/hbuilderx-run.log" ]; then
    hbuilderx_log="$REPORT_DIR/hbuilderx-run.log"
  fi

  python3 - "$REPORT_DATA_JSON" "$FLOW_RESULTS_JSONL" "$final_status" "$finished_at" "$hbuilderx_log" <<PY
import json
import sys
from pathlib import Path

data_path = Path(sys.argv[1])
jsonl_path = Path(sys.argv[2])
status = sys.argv[3]
finished_at = sys.argv[4]
hbuilderx_log = sys.argv[5]

data = json.loads(data_path.read_text(encoding="utf-8"))
flows = []
if jsonl_path.exists():
    flows = [
        json.loads(line)
        for line in jsonl_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

data["run"]["finished_at"] = finished_at
data["run"]["status"] = status
data["environment"]["hbuilderx_run_log"] = hbuilderx_log
data["flows"] = flows
data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

  python3 "$SCRIPT_DIR/generate-report.py" "$REPORT_DATA_JSON" > "$REPORT_MD"
}

require_cmd adb
require_cmd maestro
require_cmd python3
require_env DEVICE_ID
require_env APP_PACKAGE
require_env TEST_EMAIL
require_env TEST_PASSWORD
require_env TEST_USER_NAME

if [ "$RUN_TO_DEVICE" != "0" ]; then
  log "ignore RUN_TO_DEVICE=$RUN_TO_DEVICE; run app to device manually before this script"
  RUN_TO_DEVICE=0
fi

export RUN_ID REPORT_DIR DEVICE_ID APP_PACKAGE RUN_TO_DEVICE FLOW_TARGETS TEST_EMAIL
export HAS_TEST_DEVICE HAS_TEST_AGENT
STARTED_AT="$(date '+%Y-%m-%d %H:%M:%S')"
write_run_metadata "$STARTED_AT"
: > "$FLOW_RESULTS_JSONL"

log "check device"
adb -s "$DEVICE_ID" get-state >/dev/null

log "use current device app state"

log "forward maestro android driver"
"$SCRIPT_DIR/forward-maestro-android.sh" "$DEVICE_ID" > "$REPORT_DIR/adb-forward.log"

log "run maestro flows"
FLOW_FILES="$(collect_flow_files)"
printf '%s\n' "$FLOW_FILES" > "$REPORT_DIR/flows.txt"
: > "$REPORT_DIR/maestro.log"

MAESTRO_FAILED=0
MAESTRO_BLOCKED=0
while IFS= read -r flow_file; do
  [ -n "$flow_file" ] || continue
  flow_start_epoch="$SECONDS"
  flow_started_at="$(date '+%Y-%m-%d %H:%M:%S')"
  rendered_flow_file="$(render_flow_file "$flow_file")"
  slug="$(flow_slug "$flow_file")"
  flow_log="$REPORT_DIR/flows/${slug}.log"
  mkdir -p "$(dirname "$flow_log")"
  flow_name="$(flow_name_from_file "$flow_file")"
  flow_domain="$(flow_domain_from_file "$flow_file")"
  block_reason="$(flow_block_reason "$flow_file")"

  if [ -n "$block_reason" ]; then
    flow_finished_at="$(date '+%Y-%m-%d %H:%M:%S')"
    flow_duration="$((SECONDS - flow_start_epoch))"
    mkdir -p "$(dirname "$flow_log")"
    {
      printf 'Blocked: %s\n' "$flow_name"
      printf 'Reason: %s\n' "$block_reason"
      printf 'Set fixture env in test/.env to run this flow.\n'
    } > "$flow_log"
    log "blocked flow: $flow_file ($block_reason)"
    MAESTRO_BLOCKED=1

    append_flow_result \
      "$flow_file" \
      "$rendered_flow_file" \
      "$flow_name" \
      "$flow_domain" \
      "blocked" \
      "$flow_started_at" \
      "$flow_finished_at" \
      "$flow_duration" \
      "0" \
      "$flow_log" \
      "" \
      "$block_reason"
    continue
  fi

  log "run flow: $flow_file"
  {
    printf '\n===== %s =====\n' "$flow_file"
  } >> "$REPORT_DIR/maestro.log"

  set +e
  maestro --device "$DEVICE_ID" test \
    -e APP_PACKAGE="$APP_PACKAGE" \
    -e TEST_EMAIL="$TEST_EMAIL" \
    -e TEST_PASSWORD="$TEST_PASSWORD" \
    -e TEST_USER_NAME="$TEST_USER_NAME" \
    -e TEST_DEVICE_NAME_REGEX="$TEST_DEVICE_NAME_REGEX" \
    "$rendered_flow_file" 2>&1 | tee "$flow_log" | tee -a "$REPORT_DIR/maestro.log"
  FLOW_STATUS="${PIPESTATUS[0]}"
  set -e

  flow_finished_at="$(date '+%Y-%m-%d %H:%M:%S')"
  flow_duration="$((SECONDS - flow_start_epoch))"
  artifact_dir="$(copy_latest_maestro_artifacts "$slug")"

  if [ "$FLOW_STATUS" -ne 0 ]; then
    MAESTRO_FAILED=1
    flow_status="failed"
  else
    flow_status="passed"
  fi

  append_flow_result \
    "$flow_file" \
    "$rendered_flow_file" \
    "$flow_name" \
    "$flow_domain" \
    "$flow_status" \
    "$flow_started_at" \
    "$flow_finished_at" \
    "$flow_duration" \
    "$FLOW_STATUS" \
    "$flow_log" \
    "$artifact_dir" \
    ""
done <<EOF
$FLOW_FILES
EOF

if [ "$MAESTRO_FAILED" -ne 0 ]; then
  FINAL_STATUS="failed"
elif [ "$MAESTRO_BLOCKED" -ne 0 ]; then
  FINAL_STATUS="blocked"
else
  FINAL_STATUS="passed"
fi

generate_report "$FINAL_STATUS" "$(date '+%Y-%m-%d %H:%M:%S')"

log "report: $REPORT_MD"
if [ "$MAESTRO_FAILED" -ne 0 ]; then
  exit 1
fi
if [ "$MAESTRO_BLOCKED" -ne 0 ] && [ "$BLOCKED_IS_FAILURE" = "1" ]; then
  exit 1
fi
exit 0
