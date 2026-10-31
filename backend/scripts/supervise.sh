#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Супервизор API: держит процесс node живым.
#
# Зачем: на shared-хостинге процессы убиваются при завершении SSH-сессии,
# а внешние сбои (например паника движка БД, или сторонний процесс-ревизор
# хостинга, убивающий процесс SIGKILL примерно раз в минуту) роняют node.
# Супервизор перезапускает процесс почти мгновенно (0.3 сек), чтобы окно
# простоя было минимальным.
#
# Запускается в фоне (не блокирует вызывающего) из server-start.sh или
# keep-alive.sh. Один экземпляр на приложение — защищён lock-файлом.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3001}"
LOG_FILE="$APP_DIR/logs/api.log"
SUP_LOG="$APP_DIR/logs/supervise.log"
LOCK_FILE="$APP_DIR/.run/supervise.lock"
export HOME="${HOME:-$APP_DIR/../..}"

mkdir -p "$APP_DIR/logs" "$APP_DIR/.run"

if [ -f "$LOCK_FILE" ]; then
  lock_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  if [ -n "${lock_pid:-}" ] && kill -0 "$lock_pid" 2>/dev/null; then
    echo "ℹ️  супервизор уже работает (PID $lock_pid)"
    exit 0
  fi
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
  echo "❌ Не найден Node 18+" | tee -a "$SUP_LOG"
  exit 1
fi

cd "$APP_DIR" || exit 1
export PATH="$(dirname "$NODE_BIN"):$PATH"
echo $$ > "$LOCK_FILE"

cleanup() {
  rm -f "$LOCK_FILE"
  exit 0
}
trap cleanup TERM INT

echo "$(date '+%F %T') supervise: старт (PID $$, Node $("$NODE_BIN" -v))" >> "$SUP_LOG"

while true; do
  "$NODE_BIN" dist/main.js >> "$LOG_FILE" 2>&1
  code=$?
  echo "$(date '+%F %T') supervise: процесс завершился (код $code), перезапуск" >> "$SUP_LOG"
  sleep 0.3
done
