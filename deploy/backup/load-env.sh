#!/usr/bin/env bash
# Charge un fichier .env façon Compose sans `source` bash
# (évite « 15: command not found » sur les valeurs non quotées avec espaces,
#  ex. MONGO_BACKUP_CRON=0 15 3 * * *).
#
# Usage : source "$(dirname "$0")/load-env.sh" && load_dotenv /path/.env.production

load_dotenv() {
  local file="${1:-}"
  local line key val

  [[ -n "$file" && -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == export[[:space:]]* ]] && line="${line#export}"
    line="${line#"${line%%[![:space:]]*}"}"
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue

    key="${line%%=*}"
    val="${line#*=}"

    if [[ "$val" =~ ^\".*\"$ ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" =~ ^\'.*\'$ ]]; then
      val="${val:1:${#val}-2}"
    fi

    printf -v "$key" '%s' "$val"
    export "$key"
  done <"$file"
}
