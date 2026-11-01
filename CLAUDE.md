# CLAUDE.md — ElectroMontage Project Documentation

This file provides guidance for working with the ElectroMontage project (React SPA + PHP API + MySQL 8).

**Стек:** без Docker и без постоянного Node-процесса. MySQL 8 установлен
нативно, API — PHP 8.1+ (Apache/FastCGI на проде, `php -S` локально),
фронтенд — статика за Apache.

> Бэкенд переехал с NestJS на PHP: shared-хостинг reg.ru запрещает держать
> собственный процесс на порту >1024 (за это блокировали исходящий трафик).
> Подробности и чек-лист — `docs/PHP_MIGRATION.md`. Старый NestJS-код удалён,
> при необходимости он остаётся в git-истории.

---

## 📁 Project Structure

```
electro-montage/
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind
│   ├── src/                  # React components, pages, hooks, context
│   ├── public/.htaccess      # SPA-роутинг + проксирование /api на PHP
│   ├── vite.config.ts        # dev-proxy /api и /uploads → localhost:3001
│   └── package.json
│
├── api/                      # PHP 8.1+ бэкенд (PSR-4, Composer, PDO)
│   ├── index.php             # front controller: /api/* → сюда
│   ├── src/
│   │   ├── Auth/             # login/logout/refresh/me, JWT, Guard
│   │   ├── Users/            # CRUD пользователей (SUPER_ADMIN)
│   │   ├── Categories/       # CRUD + reorder категорий
│   │   ├── Photos/           # CRUD + bulk upload + reorder фото
│   │   ├── Upload/           # WebP-конвертация (Imagick/GD)
│   │   ├── PublicApi/        # /api/public/*
│   │   ├── Console/          # миграции и сиды (bin/*.php)
│   │   ├── Http/             # Request/Response/Router/Validator
│   │   └── Support/          # Config, Env, Str, Dates
│   ├── bin/                  # migrate, seed-admin, seed-portfolio, setup, healthcheck
│   ├── storage/              # манифест портфолио на проде
│   ├── uploads/              # локальные загруженные фото (в git не попадают)
│   ├── .htaccess             # закрывает src/, vendor/, .env от прямого доступа
│   └── composer.json
│
├── deploy/                   # вспомогательные конфиги (nginx — не применяется)
├── .github/workflows/deploy.yml   # автодеплой на reg.ru
├── docs/PHP_MIGRATION.md          # инструкция по переезду с NestJS
├── AUTODEPLOY.md                  # инструкция по автодеплою
├── STEP_BY_STEP_GUIDE.md          # полная инструкция по деплою
├── LOCAL_DEV.md                   # запуск на своей машине
└── CLAUDE.md
```

Корневой `package.json` не содержит зависимостей: `npm run dev` поднимает
MySQL + PHP-API + frontend через `scripts/dev.js`, `npm run dev:stop` гасит.

---

## 🚀 Local Development

### 1. MySQL 8 и база (один раз)
```sql
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'apppass';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend (PHP)
```bash
cd api
composer install
php bin/setup.php            # схема + админ + демо-портфолио (идемпотентно)
php -S 127.0.0.1:3001 -t . index.php
```
На Windows расширения включаются флагами
`-d extension_dir=D:/php/ext -d extension=pdo_mysql -d extension=gd`
(это уже делает `scripts/dev.js`).

### 3. Frontend
```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Одной командой всё сразу (из корня): `npm run dev`, остановить — `npm run dev:stop`.

### Важные переменные окружения (api/.env) — всегда такие:
```env
DATABASE_URL="mysql://electromontage:apppass@127.0.0.1:3306/electromontage"
JWT_ACCESS_SECRET=zHHGpdvIfUs8aQXa4/tLSjdCQX2ba0YfLgDyxGrrMQc=
JWT_REFRESH_SECRET=Y7NZvCmxf5+7MdXmqFzeSYM/74fQAZ/Wm/w8YCRcUWQ=
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
APP_ENV=development
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=10485760
SEED_ADMIN_LOGIN=admin
SEED_ADMIN_PASSWORD=IdONUJuW8XU9O_AgUR6xQb6o
```

**Админ для входа:** `admin` / `IdONUJuW8XU9O_AgUR6xQb6o` (логин, не email)

### Backend Commands (из каталога `api/`)
```bash
composer install             # зависимости (firebase/php-jwt) + autoload
php bin/migrate.php          # создать/проверить схему (идемпотентно)
php bin/seed-admin.php       # создать админа или обновить пароль
php bin/seed-portfolio.php   # перенести портфолио по манифесту
php bin/setup.php            # migrate + админ + демо-фото (для npm run dev)
php bin/healthcheck.php      # расширения PHP, права на uploads, доступ к БД
php -S 127.0.0.1:3001 -t . index.php   # локальный сервер
```

### Frontend Commands
```bash
npm run dev             # vite (5173)
npm run build           # production build → dist/
npm run preview
```

---

## 🗄️ Database (MySQL 8)

Схема описана в `api/src/Console/Migrator.php` и повторяет то, что раньше
создавала Prisma: `users`, `categories`, `photos`, `refresh_tokens`
(String = VARCHAR(191), DateTime = DATETIME(3) в UTC, каскадные внешние ключи).
Применяется идемпотентно (`CREATE TABLE IF NOT EXISTS`) командой
`php bin/migrate.php` — на проде она выполняется каждым деплоем и ничего не
меняет в существующей базе.

`api/.env`: `DATABASE_URL="mysql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@127.0.0.1:3306/ИМЯ_БАЗЫ"` —
подставьте доступы **уже существующей** базы.

---

## 🔐 Auto-Deploy to reg.ru (GitHub Actions)

`.github/workflows/deploy.yml`, триггер — push в `main`/`master`:

1. **deploy-frontend** — `npm ci` → `npm run build` → `rsync` собранного `dist`
   в веб-корень (или FTPS, если `REG_RU_FRONTEND_MODE=ftp`). Каталоги `api/`
   и `uploads/` из веб-корня при этом не трогаются.
2. **deploy-backend** — `composer install --no-dev` **в CI**, затем rsync
   готового `api/` в `<веб-корень>/api`. На сервере по SSH: создание `.env`
   (один раз, JWT-секреты переносятся из старого конфига), `php bin/migrate.php`,
   `php bin/seed-portfolio.php`, создание админа по маркеру `.admin-seeded`,
   диагностика и уборка остатков Node (PID, cron `keep-alive.sh`, `api.php`,
   `dist`, `node_modules`, скрипты). Постоянный процесс не запускается.
3. **notify** — сводка.

### Required GitHub Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `REG_RU_FRONTEND_PATH` | Куда выкладывать `dist` (веб-корень) | `/var/www/abcn77.ru` |
| `REG_RU_FRONTEND_MODE` | `ssh` (по умолчанию) или `ftp` | `ssh` |
| `REG_RU_SSH_HOST` | SSH host | `server266.reg.ru` |
| `REG_RU_SSH_USER` | SSH user | `u3596867` |
| `REG_RU_SSH_KEY` | Private key (без пароля) | `-----BEGIN OPENSSH PRIVATE KEY-----…` |
| `REG_RU_SSH_PORT` | SSH port | `22` |
| `REG_RU_BACKEND_PATH` | Старый каталог Node-бэкенда (используется только для переноса `.env`/маркера и уборки) | `/home/u3596867/apps/electromontage` |
| `REG_RU_DOMAIN` | Domain | `abcn77.ru` |
| `PROD_DATABASE_URL` | Строка подключения MySQL (нужна при первом деплое) | `mysql://user:pass@127.0.0.1:3306/db` |
| `SEED_ADMIN_LOGIN` / `SEED_ADMIN_PASSWORD` | Первый администратор (создаётся один раз) | `admin` / `…` |
| `REG_RU_HOST` / `REG_RU_USER` / `REG_RU_PASSWORD` | FTP, только для `REG_RU_FRONTEND_MODE=ftp` | `ftp.abcn77.ru` |

Ключ: `ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy" -N ""`,
публичная часть — в `~/.ssh/authorized_keys` на сервере (без `sudo`), приватная — в секрет.

---

## 🏭 Production (reg.ru, без Docker)

```
~/www/abcn77.ru/           # веб-корень: статика + uploads + api
├── index.html, assets/    # frontend/dist
├── .htaccess              # SPA-роутинг + /api → /api/index.php
├── uploads/portfolio/     # фото (статика, PHP их не отдаёт)
└── api/                   # PHP-бэкенд (index.php, src, vendor, .env)
```

- Apache сам запускает PHP через FastCGI — отдельного процесса, PID-файла и
  cron-watchdog'а нет.
- API-адрес: `https://abcn77.ru/api/...`, фото: `/uploads/portfolio/<filename>`.
- `.env` создаётся деплоем один раз и живёт на сервере; секреты JWT между
  деплоями не меняются (иначе всех разлогинит).
- HTTPS — стандартный сертификат хостинга / `certbot`, если есть root.

### Environment Variables (Production)
```env
DATABASE_URL="mysql://пользователь:пароль@127.0.0.1:3306/база"
JWT_ACCESS_SECRET=32+_char_base64
JWT_REFRESH_SECRET=32+_char_base64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
APP_ENV=production
FRONTEND_URL=https://abcn77.ru
UPLOAD_DIR=/home/uXXXXXXX/www/abcn77.ru/uploads
MAX_FILE_SIZE=10485760
PORTFOLIO_MANIFEST=storage/portfolio-manifest.json
```

---

## ✅ Local Testing Checklist

```bash
cd frontend && npx tsc --noEmit && npm run build

# PHP: синтаксис + работоспособность
find api/src api/bin api/index.php -name '*.php' -print0 | xargs -0 -n1 php -l
php api/bin/healthcheck.php

# быстрый smoke-тест API (curl из PHP)
php api/bin/healthcheck.php
```

Полный прогон локально:

```bash
# браузер: http://localhost:5173 и http://localhost:5173/admin/login
# API:     http://localhost:3001/api/public/categories
```

### Admin Panel Test
1. Вход (логин, не e-mail) → сразу `Инструкция`
2. Категории: создать / переименовать / удалить (диалог подтверждения)
3. Фото: загрузить пачкой, удалить чекбоксами, перетащить порядок

---

## 🛠️ Troubleshooting

```bash
# порты
lsof -i :5173     # frontend
lsof -i :3001     # локальный PHP-сервер (или: npm run dev:stop)

# диагностика PHP-окружения на сервере (через SSH/ISPmanager Shell)
cd ~/www/abcn77.ru/api && php bin/healthcheck.php
```

### Database Issues
```bash
php api/bin/migrate.php          # привести схему в соответствие
mysql -u electromontage -p electromontage
```

### Deploy Issues
```bash
gh run list --workflow=deploy.yml
gh run view --log <run-id>
```

---

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite config, aliases, /api и /uploads proxy |
| `frontend/public/.htaccess` | SPA-роутинг и переписывание /api на PHP |
| `frontend/src/api/base.ts` | axios-инстанс, refresh на 401 |
| `api/index.php` | front controller |
| `api/src/App.php` | сборка зависимостей и маршруты |
| `api/src/Console/Migrator.php` | схема БД (замена `prisma db push`) |
| `api/.htaccess` | доступ только к index.php |
| `.github/workflows/deploy.yml` | CI/CD |
| `STEP_BY_STEP_GUIDE.md` | Полная инструкция по деплою |
| `AUTODEPLOY.md` | Автодеплой: секреты, проверка, откат |

---

## 🔑 Default Admin Credentials

```
Login:    <SEED_ADMIN_LOGIN из api/.env>
Password: <SEED_ADMIN_PASSWORD из api/.env>
```

Пароль в доках и чате не хранится. Сменить: `php api/bin/seed-admin.php`
(обновит пароль) или через раздел «Администраторы» в админке.

---

## 📦 Deployment Summary

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local Dev   | `npm run dev` (5173) | `php -S` (3001) | MySQL 8 нативно |
| Production  | `dist` в веб-корне | `api/` + Apache/PHP-FastCGI | MySQL 8 на хостинге |

---

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — query indexed content.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)`.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)`.
5. **INDEX**: `ctx_index(content, source)`.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text.
- When indexing content, use descriptive source labels.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
