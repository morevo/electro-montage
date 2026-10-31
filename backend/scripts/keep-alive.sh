#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Watchdog для API на shared-хостинге.
#
# Хостинг убивает процессы, запущенные из SSH-сессии, поэтому один
# `server-start.sh` не гарантирует, что API живёт между деплоями.
# Этот скрипт вешается в cron (раз в минуту): если /api/health не отвечает,
# процесс поднимается заново — уже из cron, то есть вне SSH-сессии.
#
# Устанавливается автоматически из .github/workflows/deploy.yml.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3001}"
LOG_FILE="$APP_DIR/logs/api.log"
PID_FILE="$APP_DIR/.run/api.pid"
export HOME="${HOME:-$APP_DIR/../..}"

# API живо — ничего не делаем
if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  exit 0
fi

mkdir -p "$APP_DIR/logs" "$APP_DIR/.run"

# Мёртвый PID-файл убираем, процесс при необходимости добиваем
if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

NODE_BIN=""
for cand in "$HOME"/runtime/node-*/bin/node; do
  [ -x "$cand" ] && { NODE_BIN="$cand"; break; }
done
if [ -z "$NODE_BIN" ] && command -v node >/dev/null 2>&1; then
  major="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
  [ "${major:-0}" -ge 18 ] 2>/dev/null && NODE_BIN="$(command -v node)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "$(date '+%F %T') watchdog: не найден Node 18+" >> "$LOG_FILE"
  exit 1
fi

cd "$APP_DIR" || exit 1
export PATH="$(dirname "$NODE_BIN"):$PATH"

echo "$(date '+%F %T') watchdog: API не отвечает — запускаю" >> "$LOG_FILE"
setsid nohup "$NODE_BIN" dist/main.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
