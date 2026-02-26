#!/bin/bash
# 로컬 cron용 shift-manager 래퍼 (GitHub Actions 대체)
LOCKFILE="/tmp/onair-shift-manager.lock"
LOGFILE="/tmp/onair-shift-manager.log"

# 중복 실행 방지 (PID 파일)
if [ -f "$LOCKFILE" ]; then
  OLD_PID=$(cat "$LOCKFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "$(date): 이미 실행 중 (PID $OLD_PID), 스킵" >> "$LOGFILE"
    exit 0
  fi
fi
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

# .env.local에서 환경변수 로드
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line; do
    line="${line//[$'\r\n']}"
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}" && val="${val#\"}"
    val="${val%\'}" && val="${val#\'}"
    val="${val//\\n/}"
    export "$key=$val"
  done < "$ENV_FILE"
fi

export SUPABASE_URL="${SUPABASE_URL:-$VITE_SUPABASE_URL}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$VITE_SUPABASE_ANON_KEY}"

echo "$(date): shift-manager 시작" >> "$LOGFILE"
cd "$SCRIPT_DIR"
/opt/homebrew/bin/node scripts/onair-shift-manager.mjs >> "$LOGFILE" 2>&1
echo "$(date): shift-manager 완료" >> "$LOGFILE"
