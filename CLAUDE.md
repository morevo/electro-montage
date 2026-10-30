# CLAUDE.md — ElectroMontage Project Documentation

This file provides guidance for working with the ElectroMontage project (React SPA + NestJS API + MySQL 8).

**Стек:** без Docker. MySQL 8 установлен нативно, API — обычный Node-процесс,
фронтенд — статика за nginx.

---

## 📁 Project Structure

```
electro-montage/
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind
│   ├── src/                  # React components, pages, hooks, context
│   ├── public/               # Static assets
│   ├── vite.config.ts        # dev-proxy /api → localhost:3001
│   └── package.json
│
├── backend/                  # NestJS 10 + Prisma + MySQL 8
│   ├── src/                  # Modules: auth, categories, photos, upload, public
│   ├── prisma/schema.prisma  # User, Category, Photo, RefreshToken
│   ├── scripts/
│   │   ├── server-start.sh   # запуск API без Docker (PID-файл + health-check)
│   │   ├── server-stop.sh
│   │   └── create-admin.js
│   ├── uploads/              # загруженные фото (в git не попадают)
│   └── .env.example
│
├── deploy/
│   └── nginx.conf            # серверный конфиг: статика + /api + /uploads
│
├── .github/workflows/deploy.yml   # автодеплой на reg.ru
├── AUTODEPLOY.md                  # инструкция по автодеплою (VPS, без Docker)
├── STEP_BY_STEP_GUIDE.md          # полная инструкция по деплою
└── CLAUDE.md
```

Корневого `package.json` нет: зависимости ставятся отдельно в `frontend/` и `backend/`.

---

## 🚀 Local Development

Сначала — MySQL 8 и база (один раз), см. `STEP_BY_STEP_GUIDE.md` §1.2.

```bash
# backend
cd backend && npm install
npx prisma generate && npx prisma db push && npm run prisma:seed
npm run start:dev            # http://localhost:3001, Swagger /api/docs

# frontend (второй терминал)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

### Backend Commands
```bash
npm run build           # nest build → dist/
npm run start:dev       # hot reload
npm run start:prod      # node dist/main
npm run prisma:studio   # DB GUI
npm run prisma:seed     # админ + демо-фото (идемпотентно)
npm run serve:start     # запуск как на сервере (PID-файл, logs/api.log)
npm run serve:stop
npm run test            # Jest
npm run lint            # ESLint --fix
```

### Frontend Commands
```bash
npm run dev             # vite (5173)
npm run build           # production build → dist/
npm run preview
```

---

## 🗄️ Database (MySQL 8)

```sql
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'пароль';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
```

`backend/.env`: `DATABASE_URL="mysql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@127.0.0.1:3306/ИМЯ_БАЗЫ"` —
подставьте доступы **уже существующей** базы. Создавать базу и пользователя
заново не нужно: SQL выше — только для чистой установки.

Миграций в проекте нет — схема применяется через `npx prisma db push`. На базе
с данными он только добавляет недостающее; если расхождение схем серьёзное,
Prisma предложит `--accept-data-loss` — сначала снимите `mysqldump`.

---

## 🔐 Auto-Deploy to reg.ru (GitHub Actions)

`.github/workflows/deploy.yml`, триггер — push в `main`/`master`:

1. **deploy-frontend** — `npm ci` → `npm run build` → `rsync` собранного `dist`
   на VPS по SSH (или FTPS, если `REG_RU_FRONTEND_MODE=ftp`).
2. **deploy-backend** — SSH на сервер: сохранить `backend/.env` → `git reset --hard`
   → `npm ci` → `prisma generate` → `prisma db push` → `npm run build`
   → `bash scripts/server-start.sh` (перезапуск + health-check). Без Docker.
3. **notify** — сводка.

### Required GitHub Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `REG_RU_FRONTEND_PATH` | Куда выкладывать `dist` (папка nginx `root`) | `/var/www/abcn77.ru` |
| `REG_RU_FRONTEND_MODE` | `ssh` (по умолчанию) или `ftp` | `ssh` |
| `REG_RU_SSH_HOST` | SSH host | `server266.reg.ru` |
| `REG_RU_SSH_USER` | SSH user | `u3596867` |
| `REG_RU_SSH_KEY` | Private key (без пароля) | `-----BEGIN OPENSSH PRIVATE KEY-----…` |
| `REG_RU_SSH_PORT` | SSH port | `22` |
| `REG_RU_BACKEND_PATH` | Путь к клону репо | `/home/u3596867/apps/electromontage` |
| `REG_RU_DOMAIN` | Domain | `abcn77.ru` |
| `REG_RU_HOST` / `REG_RU_USER` / `REG_RU_PASSWORD` | FTP, только для `REG_RU_FRONTEND_MODE=ftp` | `ftp.abcn77.ru` |

Ключ: `ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy" -N ""`,
публичная часть — в `~/.ssh/authorized_keys` на сервере (без `sudo`), приватная — в секрет.

---

## 🏭 Production (VPS reg.ru, без Docker)

```bash
# 1. Код
git clone https://github.com/morevo/electro-montage.git ~/apps/electromontage
cd ~/apps/electromontage
cp backend/.env.production.example backend/.env
nano backend/.env          # DATABASE_URL, JWT_*, FRONTEND_URL, SEED_*

# 2. Сборка и запуск API
cd backend
npm ci && npx prisma generate && npx prisma db push --skip-generate
npm run build && bash scripts/server-start.sh

# 3. nginx (нужен root)
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/abcn77.ru
sudo ln -s /etc/nginx/sites-available/abcn77.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

- API слушает `127.0.0.1:3001`, наружу отдаёт nginx (`/api/`, `/uploads/`).
- Статика: `frontend/dist` → `/var/www/abcn77.ru`.
- Автозапуск с `systemd` (если есть root) — unit в `STEP_BY_STEP_GUIDE.md` §4.6.
- HTTPS: `sudo certbot --nginx -d abcn77.ru -d www.abcn77.ru`.

### Environment Variables (Production)
```env
DATABASE_URL="mysql://electromontage:пароль@127.0.0.1:3306/electromontage"
JWT_ACCESS_SECRET=32+_char_base64
JWT_REFRESH_SECRET=32+_char_base64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://abcn77.ru
UPLOAD_DIR=./uploads
SEED_ADMIN_LOGIN=логин_без_@
SEED_ADMIN_PASSWORD=пароль_16+
```

---

## ✅ Local Testing Checklist

```bash
cd frontend && npx tsc --noEmit && npm run build
cd backend  && npx tsc --noEmit && npm run build
```

Полный прогон локально:

```bash
curl http://localhost:3001/api/public/categories
# браузер: http://localhost:5173 и http://localhost:5173/admin/login
```

### Admin Panel Test
1. Вход (логин, не e-mail) → сразу `Инструкция`
2. Категории: создать / переименовать / удалить (диалог подтверждения)
3. Фото: загрузить пачкой, удалить чекбоксами, перетащить порядок

---

## 🛠️ Troubleshooting

```bash
lsof -i :5173     # frontend
lsof -i :3001     # backend (или: bash scripts/server-stop.sh)
```

### Database Issues
```bash
npx prisma db push       # привести схему в соответствие
npx prisma generate      # перегенерировать клиент
npx prisma studio        # визуальный доступ
mysql -u electromontage -p electromontage
```

### Deploy Issues
```bash
gh run list --workflow=deploy.yml
gh run view --log <run-id>
# на сервере:
tail -n 50 ~/apps/electromontage/backend/logs/api.log
```

---

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite config, aliases, /api proxy |
| `frontend/tailwind.config.js` | Tailwind theme, dark mode |
| `backend/prisma/schema.prisma` | DB models (MySQL), enums, relations |
| `backend/src/main.ts` | Bootstrap, CORS, static /uploads, Swagger |
| `deploy/nginx.conf` | Статика + прокси /api и /uploads |
| `backend/scripts/server-start.sh` | Запуск API без Docker и без root |
| `.github/workflows/deploy.yml` | CI/CD |
| `STEP_BY_STEP_GUIDE.md` | Полная инструкция по деплою |
| `AUTODEPLOY.md` | Автодеплой на VPS: секреты, проверка, откат |

---

## 🔑 Default Admin Credentials

```
Login:    <SEED_ADMIN_LOGIN из backend/.env>
Password: <SEED_ADMIN_PASSWORD из backend/.env>
```

Пароль в доках и чате не хранится. Сменить: `node scripts/create-admin.js` (обновит пароль).

---

## 📦 Deployment Summary

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local Dev   | `npm run dev` (5173) | `npm run start:dev` (3001) | MySQL 8 нативно |
| Production  | `dist` за nginx (или FTPS) | нода на 127.0.0.1:3001, автодеплой по SSH | MySQL 8 на VPS |

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
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
