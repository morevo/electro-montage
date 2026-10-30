#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Запуск/перезапуск API без Docker и без root.
#
# Работает на любом SSH-аккаунте (в том числе без sudo): процесс node
# поднимается в фоне, PID пишется в .run/api.pid, логи — в logs/api.log.
# Повторный запуск сначала аккуратно останавливает прошлый процесс по PID,
# поэтому скрипт безопасно вызывать из автодеплоя.
#
# Использование:
#   bash scripts/server-start.sh          # перезапустить
#   bash scripts/server-stop.sh           # остановить
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$APP_DIR/.run/api.pid"
LOG_FILE="$APP_DIR/logs/api.log"
PORT="${PORT:-3001}"

mkdir -p "$APP_DIR/.run" "$APP_DIR/logs"

stop_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      for _ in $(seq 1 20); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
}

stop_running

cd "$APP_DIR"

if [ ! -f dist/main.js ]; then
  echo "❌ dist/main.js не найден — сначала выполните npm run build"
  exit 1
fi

# Порт занят посторонним процессом — честно скажем об этом
if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
  echo "⚠️  Порт $PORT уже слушает другой процесс — остановите его вручную"
  exit 1
fi

# nohup + redirect: процесс переживает выход из SSH-сессии
nohup node dist/main.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "▶ API запущен, PID $(cat "$PID_FILE"), лог: $LOG_FILE"

# Ждём, пока порт начнёт отвечать (максимум ~20 секунд)
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/api/public/categories" >/dev/null 2>&1; then
    echo "✅ API отвечает на 127.0.0.1:$PORT"
    exit 0
  fi
  sleep 1
done

echo "❌ API не ответил за 20 секунд — последние строки лога:"
tail -n 30 "$LOG_FILE" || true
exit 1
