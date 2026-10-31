#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Страховка для API на shared-хостинге (запускается из cron раз в минуту).
#
# Основную работу делает scripts/supervise.sh: он держит node живым и
# перезапускает его через 2 секунды после падения. Этот скрипт лишь
# проверяет, что API отвечает, и при необходимости поднимает супервизор
# (например после перезагрузки сервера, когда cron стартует без сессии).
# ─────────────────────────────────────────────────────────────
set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3001}"
SUP_LOG="$APP_DIR/logs/supervise.log"
export HOME="${HOME:-$APP_DIR/../..}"

mkdir -p "$APP_DIR/logs" "$APP_DIR/.run"

# Любой HTTP-ответ (даже 401/404) значит, что сервер жив — не трогаем.
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 \
  "http://127.0.0.1:$PORT/api/public/categories" 2>/dev/null || echo 000)"
case "$code" in
  2*|3*|4*) exit 0 ;;
esac

echo "$(date '+%F %T') keep-alive: API не отвечает (код $code) — проверяю супервизор" >> "$SUP_LOG"
setsid nohup bash "$APP_DIR/scripts/supervise.sh" >> "$SUP_LOG" 2>&1 &
