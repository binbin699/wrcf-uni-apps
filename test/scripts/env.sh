#!/usr/bin/env bash

load_env_file() {
  local env_file="${ENV_FILE:-}"
  local line name value

  if [ -z "$env_file" ]; then
    env_file=".env"
  fi

  if [ -f "$env_file" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in
        '' | \#*) continue ;;
      esac

      name="${line%%=*}"
      value="${line#*=}"
      case "$value" in
        \"*\")
          value="${value#\"}"
          value="${value%\"}"
          ;;
        \'*\')
          value="${value#\'}"
          value="${value%\'}"
          ;;
      esac
      case "$name" in
        [A-Za-z_][A-Za-z0-9_]*)
          if [ -z "${!name+x}" ]; then
            export "$name=$value"
          fi
          ;;
      esac
    done < "$env_file"
  fi
}

require_env() {
  local name="$1"
  local value="${!name:-}"

  if [ -z "$value" ]; then
    printf '[e2e] missing required env: %s\n' "$name" >&2
    printf '[e2e] copy test/.env.example to test/.env and fill local values\n' >&2
    exit 1
  fi
}
