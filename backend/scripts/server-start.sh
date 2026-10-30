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

# Порт мог остаться за старым экземпляром API — например, если его когда-то
# запустили вручную и PID-файла нет. Останавливаем ТОЛЬКО node с dist/main.js
# этого проекта; любой другой процесс на порту не трогаем.
port_busy() {
  command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN
}

if port_busy; then
  echo "⚠️  Порт $PORT занят — проверяю, чей это процесс"

  if command -v ss >/dev/null 2>&1 && command -v ps >/dev/null 2>&1; then
    for pid in $(ss -ltnp "sport = :$PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u); do
      args=$(ps -p "$pid" -o args= 2>/dev/null || true)
      case "$args" in
        *node*dist/main.js*|*node*dist/main*)
          echo "   останавливаю старый API (PID $pid)"
          kill "$pid" 2>/dev/null || true
          ;;
        *)
          echo "❌ Порт $PORT занят посторонним процессом (PID $pid): $args"
          echo "   Остановите его вручную и повторите запуск"
          exit 1
          ;;
      esac
    done
  fi

  for _ in $(seq 1 20); do
    port_busy || break
    sleep 0.5
  done

  if port_busy; then
    echo "❌ Порт $PORT всё ещё занят — освободите его вручную"
    exit 1
  fi
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
