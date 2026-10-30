#!/usr/bin/env bash
# Останавливает API, запущенный через scripts/server-start.sh (по PID-файлу).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$APP_DIR/.run/api.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "ℹ️  PID-файл не найден — API, похоже, не запущен"
  exit 0
fi

pid="$(cat "$PID_FILE")"
if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  kill -9 "$pid" 2>/dev/null || true
  echo "⏹ API остановлен (PID $pid)"
else
  echo "ℹ️  Процесс $pid уже не работает"
fi

rm -f "$PID_FILE"
