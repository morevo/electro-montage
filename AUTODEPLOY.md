# 🚀 Автодеплой на VPS (MySQL 8 нативно, без Docker)

Инструкция под конкретную ситуацию: **есть VPS**, на нём **только MySQL 8,
установленный нативно**, и **Docker поставить нельзя** (нет прав / не нужен).
Деплой полностью работает по SSH: ни Docker, ни FTP-сервер на VPS не требуются.

Актуально на: октябрь 2026.

---

## 0. Что получится

```
git push origin main
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        ├─ deploy-frontend ─ npm ci → npm run build → rsync dist/ → VPS:/var/www/abcn77.ru
        └─ deploy-backend  ─ ssh → git reset --hard → npm ci → prisma db push
                                   → npm run build → scripts/server-start.sh
                                             │
                                             ▼
                        Node-процесс на 127.0.0.1:3001  ──►  MySQL 8 (localhost:3306)
                                             ▲
                                    nginx :80/:443 (статика + /api + /uploads)
```

| Часть | Где живёт | Как обновляется |
|-------|-----------|-----------------|
| `frontend/dist` | `/var/www/abcn77.ru` | `rsync` по SSH |
| `backend/` | `~/apps/electromontage/backend` | `git reset --hard` + пересборка |
| MySQL 8 | сам сервер, `127.0.0.1:3306` | `prisma db push` при деплое |
| Фото | `backend/uploads/` | остаются на диске |

> Docker не используется **вообще**: ни образов, ни compose-файлов, ни volumes.
> Ничего устанавливать и чистить на сервере не нужно.

---

## 1. Что должно быть на VPS (разово)

```bash
node -v            # 20+
npm -v
mysql --version    # 8.x
nginx -v
git --version
rsync --version    # нужен для выкладки статики
```

Если чего-то нет (нужен root):

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# nginx, rsync, certbot
sudo apt-get install -y nginx rsync certbot python3-certbot-nginx
```

MySQL 8 уже стоит — **переустанавливать не нужно**.

---

## 2. База и пользователь MySQL

> **На вашем VPS база уже есть** — ничего создавать не нужно. Возьмите готовые
> хост / имя базы / пользователя / пароль и впишите их в `DATABASE_URL`
> в `backend/.env` (шаг 3). Раздел ниже — только для чистой установки.

```bash
sudo mysql      # или mysql -u root -p
```

```sql
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'длинный_пароль';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Проверка:

```bash
mysql -u electromontage -p electromontage -e "SELECT DATABASE();"
```

> MySQL 8.0 по умолчанию — `caching_sha2_password`, Prisma его поддерживает.
> Если драйвер ругается на авторизацию: `IDENTIFIED WITH mysql_native_password BY 'пароль'`
> (в MySQL 8.4 этот плагин отключён по умолчанию).

---

## 3. Код и `.env` на сервере (разово)

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/morevo/electro-montage.git electromontage
cd electromontage

cp backend/.env.production.example backend/.env
nano backend/.env
```

Минимум в `backend/.env`:

```env
DATABASE_URL="mysql://electromontage:ПАРОЛЬ@127.0.0.1:3306/electromontage"
JWT_ACCESS_SECRET=...        # openssl rand -base64 32
JWT_REFRESH_SECRET=...       # другой вывод той же команды
FRONTEND_URL=https://abcn77.ru
PORT=3001
NODE_ENV=production
SEED_ADMIN_LOGIN=...
SEED_ADMIN_PASSWORD=...      # от 16 символов
```

**`backend/.env` не в git.** Workflow сохраняет его перед `git reset --hard` и
возвращает на место — перезаписывать руками при каждом деплое не нужно.

Первый запуск:

```bash
cd backend
npm ci
npx prisma generate
npx prisma db push --skip-generate
npm run build
bash scripts/server-start.sh     # PID в .run/api.pid, лог в logs/api.log
```

Скрипт сам ждёт ответа `/api/public/categories` — если API не поднялся, он
покажет последние строки лога и упадёт.

---

## 4. Папка статики и nginx (разово)

```bash
sudo mkdir -p /var/www/abcn77.ru
sudo chown -R $USER:www-data /var/www/abcn77.ru   # $USER = REG_RU_SSH_USER

cd ~/apps/electromontage
sudo cp deploy/nginx.conf /etc/nginx/sites-available/abcn77.ru
sudo ln -s /etc/nginx/sites-available/abcn77.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d abcn77.ru -d www.abcn77.ru
```

В `deploy/nginx.conf` уже есть всё нужное: статика из `/var/www/abcn77.ru`,
прокси `/api/` и `/uploads/` на `127.0.0.1:3001`, `client_max_body_size 220m`
(пакетная загрузка фото до 20 файлов).

---

## 5. GitHub Secrets

`Settings → Secrets and variables → Actions`. Обязательные для VPS:

| Secret | Пример | Назначение |
|--------|--------|-----------|
| `REG_RU_SSH_HOST` | `123.45.67.89` | IP или хост VPS |
| `REG_RU_SSH_USER` | `deploy` | SSH-пользователь (он же должен писать в `/var/www/abcn77.ru`) |
| `REG_RU_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----…` | приватный ключ целиком, **без passphrase** |
| `REG_RU_SSH_PORT` | `22` | если меняли порт |
| `REG_RU_BACKEND_PATH` | `/home/deploy/apps/electromontage` | путь к git-клону |
| `REG_RU_FRONTEND_PATH` | `/var/www/abcn77.ru` | папка `root` из nginx |
| `REG_RU_DOMAIN` | `abcn77.ru` | для сводки в логах |
| `REG_RU_FRONTEND_MODE` | `ssh` | можно не задавать: по умолчанию `ssh` |

Только если фронтенд на shared-хостинге: `REG_RU_FRONTEND_MODE=ftp` +
`REG_RU_HOST`, `REG_RU_USER`, `REG_RU_PASSWORD`.

### Ключ деплоя

```bash
# локально
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy" -N ""

# на сервере (без sudo)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ВСТАВЬТЕ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# приватный ключ целиком → секрет REG_RU_SSH_KEY
cat ~/.ssh/deploy_key
```

Проверка:

```bash
ssh -i ~/.ssh/deploy_key deploy@123.45.67.89 'echo ok'
```

---

## 6. Что делает пайплайн

Триггер: push в `main`/`master` или ручной запуск (`workflow_dispatch`).

### `deploy-frontend`

1. `npm ci` и `npm run build` в `frontend/`.
2. `rsync -az --delete` содержимого `dist/` в `REG_RU_FRONTEND_PATH` по SSH.
   `--delete` убирает старые хэшированные ассеты, чтобы папка не росла.

### `deploy-backend` (SSH, без root)

1. Сохраняет `backend/.env` вне репозитория.
2. `git fetch --all && git reset --hard origin/main`.
3. Возвращает `backend/.env`.
4. `npm ci` → `npx prisma generate` → `npx prisma db push --skip-generate`.
5. `npm run build` → `bash scripts/server-start.sh` (перезапуск + health-check).

### `notify`

Печатает итог обоих job'ов и валит сборку, если что-то упало.

> Workflow **не клонирует** репозиторий. Клон на сервере должен существовать
> (шаг 3) — иначе job упадёт с понятным сообщением.

---

## 7. Первый деплой и проверка

```bash
git push origin main
```

Дальше — `Actions → Deploy to reg.ru → последний run`.

Проверка на сервере:

```bash
cd ~/apps/electromontage && git log -1 --oneline
tail -n 50 backend/logs/api.log
curl -s https://abcn77.ru/api/public/categories | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" https://abcn77.ru/
ls -la /var/www/abcn77.ru | head
```

В браузере: `https://abcn77.ru/admin/login` → вход логином (не e-mail) →
сразу открывается **Инструкция** (`/admin/guide`).

Админ создаётся/обновляется на сервере:

```bash
cd ~/apps/electromontage/backend && node scripts/create-admin.js
```

---

## 8. Обновления и откат

Ручное обновление без Actions:

```bash
cd ~/apps/electromontage
git pull
cd backend
npm ci && npx prisma generate && npx prisma db push --skip-generate && npm run build
bash scripts/server-start.sh
```

Откат на предыдущий коммит:

```bash
cd ~/apps/electromontage
git reset --hard HEAD~1
cd backend && npm ci && npx prisma generate && npm run build
bash scripts/server-start.sh
```

`prisma db push` схему назад **не откатывает** — если меняли `schema.prisma`,
восстановите дамп базы.

Бэкап перед рискованным деплоем:

```bash
mysqldump -u electromontage -p --single-transaction electromontage > ~/backups/db-$(date +%F).sql
tar -czf ~/backups/uploads-$(date +%F).tar.gz -C ~/apps/electromontage/backend uploads
```

---

## 9. Траблшутинг

| Симптом | Причина и что делать |
|---------|----------------------|
| `Permission denied (publickey)` | публичный ключ не в `~/.ssh/authorized_keys`, или в секрет попал ключ с passphrase |
| `rsync: command not found` | на VPS нет rsync: `sudo apt-get install -y rsync` |
| `rsync: mkstemp … Permission denied` | пользователь из `REG_RU_SSH_USER` не может писать в `REG_RU_FRONTEND_PATH` |
| `❌ В … нет git-клона` | не выполнен шаг 3 — клон на сервере нужен заранее |
| `P1001: Can't reach database` | MySQL не запущен (`sudo systemctl status mysql`) или неверный `DATABASE_URL` |
| `P1000: Authentication failed` | неверный пароль MySQL, проверьте `mysql -u ПОВЗ -p ИМЯ_БАЗЫ` |
| `prisma db push` просит `--accept-data-loss` | схема в существующей базе расходится со `schema.prisma`: сначала `mysqldump`, потом решайте (флаг **удаляет** данные) |
| Пропала часть данных после деплоя | `git reset --hard` до кода не касается базы; проверьте, не запускался ли `prisma db push --accept-data-loss` или `prisma:seed` поверх реальных данных |
| `EADDRINUSE :3001` | второй экземпляр API: `bash scripts/server-stop.sh`, затем снова `server-start.sh` |
| 502 Bad Gateway | API не поднялся: `tail -n 50 backend/logs/api.log` |
| 413 на загрузке фото | в nginx не применён `client_max_body_size` (он в `deploy/nginx.conf`) |
| Фото 404 | nginx не проксирует `/uploads/` или файлов нет в `backend/uploads` |
| Старый фронтенд в браузере | `index.html` закэширован — `rsync --delete` уже отработал, обновите с `Ctrl+F5` |
| Пустая админка после входа | `prisma db push` не выполнялся — таблиц нет |

---

## 10. Шпаргалка

```bash
# сервер
cd ~/apps/electromontage/backend
bash scripts/server-start.sh      # перезапуск API
bash scripts/server-stop.sh       # остановить
tail -f logs/api.log              # логи

# база
mysql -u electromontage -p electromontage

# nginx
sudo nginx -t && sudo systemctl reload nginx

# статика
ls -la /var/www/abcn77.ru
```

---

## 11. Чего в проекте нет

- **Docker / docker-compose / Dockerfile** — удалены из репозитория, на сервере
  не нужны и не устанавливаются.
- **PostgreSQL** — проект полностью на MySQL 8 (и локально, и на проде).
- **Минаций/миграций Prisma** — схема применяется через `prisma db push`.

Если видите инструкцию с `docker compose up` — она устарела, актуальны только
этот файл и `STEP_BY_STEP_GUIDE.md`.
