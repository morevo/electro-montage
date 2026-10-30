# 📋 Пошаговый гайд: локально → прод на reg.ru

Актуально на: прод — VPS с **MySQL 8 (нативно)** и **Node.js**, без Docker.

---

## 0. Как устроено (и почему без Docker)

Три части, каждая живёт своей жизнью:

| Часть | Что это | Где работает |
|-------|---------|--------------|
| `frontend/` | React + Vite, после сборки — обычные статические файлы | nginx (или FTP-хостинг) |
| `backend/` | NestJS API, слушает `127.0.0.1:3001` | обычный Node-процесс на VPS |
| MySQL 8 | база данных | установлена на сервере нативно |

Docker в проекте **не используется вообще**: ни на сервере, ни в деплое.
Бэкенд запускается скриптом `backend/scripts/server-start.sh` (PID-файл,
`nohup`), поэтому root для запуска не нужен. Если на сервере есть root и вы
хотите `systemd` — готовый unit-файл есть в §4.6.

Схема на сервере:

```
браузер → nginx :80/:443 ─┬─ /            → /var/www/abcn77.ru (frontend/dist)
                          ├─ /api/        → 127.0.0.1:3001 (NestJS)
                          └─ /uploads/    → 127.0.0.1:3001 (фото из backend/uploads)
                                                   │
                                            MySQL 8 :3306 (localhost)
```

---

## 1. Локальный запуск

### 1.1 Что нужно установить

- **Node.js 20+** (`node -v`)
- **MySQL 8** — локально, обычным установщиком (MySQL Community Server).
  Docker не нужен и не используется.
- Git

Зависимости ставятся отдельно в `backend/` и `frontend/` (корневого
`package.json` в проекте нет).

### 1.2 База в MySQL (только для чистой установки)

> **База уже настроена?** Пропустите блок и впишите готовые доступы в
> `DATABASE_URL` (`backend/.env`). Создавать базу и пользователя заново не нужно —
> получите вторую пустую базу вместо рабочей.

```sql
-- в консоли mysql -u root -p
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'локальный_пароль';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
```

`backend/.env` (скопируйте из `backend/.env.example`):

```env
DATABASE_URL="mysql://electromontage:локальный_пароль@127.0.0.1:3306/electromontage"
JWT_ACCESS_SECRET="любая_строка_32+_символа"
JWT_REFRESH_SECRET="другая_строка_32+_символа"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
SEED_ADMIN_LOGIN=ваш_логин
SEED_ADMIN_PASSWORD=ваш_пароль_от_16_символов
```

### 1.3 Первый запуск

```bash
# 1. Зависимости
cd backend  && npm install
cd ../frontend && npm install

# 2. Схема БД + админ + демо-фото (идемпотентно, можно повторять)
cd ../backend
npx prisma generate
npx prisma db push
npm run prisma:seed        # логин/пароль берёт из SEED_ADMIN_* в .env

# 3. API (терминал 1)
npm run start:dev          # http://localhost:3001, Swagger: /api/docs

# 4. Фронтенд (терминал 2)
cd ../frontend && npm run dev   # http://localhost:5173, /api проксируется на 3001
```

### 1.4 Админка

- Вход: `http://localhost:5173/admin/login` — **логин**, не e-mail
  (латиница, цифры, точка, дефис, подчёркивание).
- После входа открывается **Инструкция** (`/admin/guide`), таб «Инструкция»
  прижат внизу меню, над кнопкой «Выйти».
- Разделы: «Категории» и «Фото». Фото загружаются пачкой (до 20 файлов за
  раз), удаляются по одному или чекбоксами с общим подтверждением.

### 1.5 Проверка перед коммитом

```bash
cd frontend && npx tsc --noEmit && npm run build
cd ../backend && npx tsc --noEmit && npm run build
```

---

## 2. Подключение к локальной БД

```bash
# консоль mysql
mysql -u electromontage -p electromontage

# внутри:
SHOW TABLES;
SELECT id, name, slug, sortOrder FROM categories ORDER BY sortOrder;
SELECT COUNT(*) FROM photos;

# визуальный редактор
cd backend && npx prisma studio
```

---

## 3. Переменные окружения backend (`backend/.env`)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | `mysql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@127.0.0.1:3306/electromontage` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | две разные случайные строки 32+ символа |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` |
| `PORT` | `3001` (его же проксирует nginx) |
| `NODE_ENV` | `development` локально, `production` на сервере |
| `FRONTEND_URL` | единственный разрешённый CORS-origin, без слэша на конце |
| `UPLOAD_DIR` | `./uploads` — относительно `backend/` |
| `MAX_FILE_SIZE` | `10485760` (10 МБ на файл) |
| `SEED_ADMIN_LOGIN` / `SEED_ADMIN_PASSWORD` | учётка админа для `create-admin.js` |

Секреты:

```bash
openssl rand -base64 32
```

---

## 4. VPS: разовая подготовка

### 4.1 Проверить, что уже есть

```bash
node -v && npm -v          # нужен Node 20+
mysql --version            # MySQL 8
nginx -v                   # веб-сервер
git --version
```

Если Node нет, а root есть:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Если root нет — попросите у хостера Node 20 и nginx, либо запускайте API на
отдельном порту (см. §4.7).

### 4.2 MySQL: база и пользователь (только если её ещё нет)

> **На вашем VPS база уже создана** — пересоздавать её не нужно. Возьмите
> существующие хост/базу/пользователя/пароль и впишите в `backend/.env`:
> `DATABASE_URL="mysql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@127.0.0.1:3306/ИМЯ_БАЗЫ"`.
> Дальше сразу переходите к §4.3.

```bash
sudo mysql          # или: mysql -u root -p
```

```sql
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'длинный_пароль';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Проверка входа именно этим пользователем:

```bash
mysql -u electromontage -p electromontage -e "SELECT DATABASE();"
```

> MySQL 8.0 по умолчанию использует `caching_sha2_password` — Prisma его
> поддерживает. Если драйвер всё же ругается на авторизацию, создайте
> пользователя так: `IDENTIFIED WITH mysql_native_password BY 'пароль'`
> (в MySQL 8.4 этот плагин отключён по умолчанию).

### 4.3 Код на сервере

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/morevo/electro-montage.git electromontage
cd electromontage

# продовый .env
cp backend/.env.production.example backend/.env
nano backend/.env      # DATABASE_URL, JWT_*, FRONTEND_URL, SEED_ADMIN_*
```

Установка:

```bash
cd backend
npm ci
npx prisma generate
npx prisma db push --skip-generate
npm run build
bash scripts/server-start.sh
```

`server-start.sh` поднимает `node dist/main.js` в фоне, пишет PID в
`backend/.run/api.pid`, лог — `backend/logs/api.log`, и сам ждёт, пока
`/api/public/categories` ответит 200. Остановить: `bash scripts/server-stop.sh`
(или `npm run serve:stop`).

### 4.4 nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/abcn77.ru
sudo ln -s /etc/nginx/sites-available/abcn77.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

В конфиге поменяйте `server_name` и `root` (куда выкладывается `frontend/dist`,
по умолчанию `/var/www/abcn77.ru`). Там уже есть прокси `/api/` и `/uploads/`
на `127.0.0.1:3001` и `client_max_body_size 220m` — без этого пакетная
загрузка фото упрётся в 413.

Права на статику:

```bash
sudo mkdir -p /var/www/abcn77.ru
sudo chown -R $USER:www-data /var/www/abcn77.ru
```

Сюда же GitHub Actions выкладывает `frontend/dist` по `rsync` — пользователь из
`REG_RU_SSH_USER` должен иметь право писать в эту папку.

### 4.5 HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d abcn77.ru -d www.abcn77.ru
```

После этого `FRONTEND_URL` в `backend/.env` должен быть `https://abcn77.ru`,
а в `deploy/nginx.conf` раскомментируйте `proxy_cookie_flags secure;`
(при необходимости) и перезапустите API: `bash scripts/server-start.sh`.

### 4.6 Автозапуск после перезагрузки (по желанию)

Без root процесс из §4.3 живёт до перезагрузки сервера. Если root есть —
надёжнее `systemd`:

```ini
# /etc/systemd/system/electromontage-api.service
[Unit]
Description=Electromontage API (NestJS)
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/USER/apps/electromontage/backend
EnvironmentFile=/home/USER/apps/electromontage/backend/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now electromontage-api
sudo systemctl status electromontage-api
```

Тогда автодеплой стоит переключить на `sudo systemctl restart electromontage-api`
вместо `scripts/server-start.sh` (одна строка в `.github/workflows/deploy.yml`).
Важно: файл `.env` должен быть читаем пользователю из `User=`.

### 4.7 Если root и nginx недоступны

Тогда проксировать `/api` на сервере нечем. Рабочий вариант — отдельный
поддомен API (`api.abcn77.ru`) на том же VPS за панелью хостера, а фронтенд
ходит на абсолютный адрес. Для этого фронтенду нужен `VITE_API_URL`
(в текущем коде базовый URL относительный — `/api`), то есть потребуется
правка `frontend/src/api/base.ts` и пересборка. Пока этот вариант в проекте
не включён.

### 4.8 Администратор на проде

```bash
cd ~/apps/electromontage/backend
node scripts/create-admin.js
```

Скрипт читает `SEED_ADMIN_LOGIN` и `SEED_ADMIN_PASSWORD` из `backend/.env`
(логин без `@`, пароль от 16 символов) и не печатает пароль в консоль.
Если админ уже есть — скрипт обновит пароль.

---

## 5. GitHub Secrets (Settings → Secrets and variables → Actions)

**11 repository secrets**: 8 обязательных для VPS + 3 FTP-секрета, нужные только
если фронтенд лежит на shared-хостинге (`REG_RU_FRONTEND_MODE=ftp`).

| # | Secret | Пример | Откуда |
|---|--------|--------|--------|
| 1 | `REG_RU_FRONTEND_PATH` | `/var/www/abcn77.ru` | папка, которую отдаёт nginx (`root` в `deploy/nginx.conf`) |
| 2 | `REG_RU_FRONTEND_MODE` | `ssh` | необязательный: `ssh` (по умолчанию) или `ftp` |
| 3 | `REG_RU_SSH_HOST` | `server266.reg.ru` или IP | панель VPS |
| 4 | `REG_RU_SSH_USER` | `u3596867` / `deploy` / `root` | ваш SSH-логин |
| 5 | `REG_RU_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----…` | приватный ключ целиком, без пароля |
| 6 | `REG_RU_SSH_PORT` | `22` | порт SSH |
| 7 | `REG_RU_BACKEND_PATH` | `/home/u3596867/apps/electromontage` | путь к клону репо |
| 8 | `REG_RU_DOMAIN` | `abcn77.ru` | домен без `https://` |
| 9 | `REG_RU_HOST` | `ftp.abcn77.ru` | **только для `ftp`**: reg.ru → Хостинг → FTP |
| 10 | `REG_RU_USER` | `u1234567` | только для `ftp` |
| 11 | `REG_RU_PASSWORD` | `S3cretPass` | только для `ftp` |

> **Режим выгрузки статики.** По умолчанию `frontend/dist` копируется на VPS по
> SSH через `rsync` — FTP-сервер на сервере не нужен. Фронтенд на shared-хостинге
> остаётся возможным: задайте `REG_RU_FRONTEND_MODE=ftp` и три FTP-секрета.

Ключ для деплоя (генерируется **локально**, на сервер попадает только `.pub`):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy" -N ""
cat ~/.ssh/deploy_key.pub
```

На сервере (без `sudo`, ключ в домашнюю папку пользователя):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Проверка с локальной машины:

```bash
ssh -i ~/.ssh/deploy_key u3596867@server266.reg.ru 'echo ok'
```

Приватный ключ целиком — в секрет `REG_RU_SSH_KEY`:

```bash
cat ~/.ssh/deploy_key
```

### Что делает `.github/workflows/deploy.yml`

- **deploy-frontend** — `npm ci` + `npm run build`, затем `rsync` собранного
  `dist` в `REG_RU_FRONTEND_PATH` по SSH (или FTPS, если `REG_RU_FRONTEND_MODE=ftp`).
- **deploy-backend** — по SSH, без Docker и без root:
  1. сохраняет `backend/.env` (он не в git),
  2. `git fetch && git reset --hard origin/main`,
  3. `npm ci` → `npx prisma generate` → `npx prisma db push` → `npm run build`,
  4. `bash scripts/server-start.sh` — перезапуск процесса и health-check.
- **notify** — сводка и падение job'а, если что-то сломалось.

Перед первым деплоем на сервере должен быть git-клон (§4.3): workflow сам
репозиторий не клонирует, он только обновляет существующий.

---

## 6. Автодеплой: проверка и откат

```bash
# что реально работает на сервере
cd ~/apps/electromontage && git log -1 --oneline
tail -n 50 backend/logs/api.log
curl -s https://abcn77.ru/api/public/categories | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" https://abcn77.ru/
```

Откат на предыдущий коммит:

```bash
cd ~/apps/electromontage
git reset --hard HEAD~1
cd backend && npm ci && npx prisma generate && npm run build
bash scripts/server-start.sh
```

`prisma db push` при откате кода не откатывает схему — если меняли
`schema.prisma`, вернитесь и по схеме (или восстановите дамп из §7.1).

---

## 7. Обслуживание

### 7.1 Бэкап и восстановление

```bash
# дамп базы (пароль спросит интерактивно)
mysqldump -u electromontage -p --single-transaction --routines \
  electromontage > ~/backups/electromontage-$(date +%F).sql

# восстановление
mysql -u electromontage -p electromontage < electromontage-2026-10-30.sql

# фото
tar -czf ~/backups/uploads-$(date +%F).tar.gz -C ~/apps/electromontage/backend uploads
```

### 7.2 Логи

```bash
tail -f ~/apps/electromontage/backend/logs/api.log   # API
sudo tail -f /var/log/nginx/error.log                # nginx (если есть root)
```

### 7.3 Ручное обновление (без GitHub Actions)

```bash
cd ~/apps/electromontage
git pull
cd backend
npm ci && npx prisma generate && npx prisma db push --skip-generate && npm run build
bash scripts/server-start.sh
```

### 7.4 Перенос локальных фото на сервер

```bash
# с локальной машины
scp -r backend/uploads/portfolio/* user@server:~/apps/electromontage/backend/uploads/portfolio/
```

База и файлы должны совпадать: если фото залито в базу, но файла нет —
на сайте будет битая картинка. Проще всего пересоздать данные сидом
(`npm run prisma:seed`) или загрузить фото заново через админку.

---

## 8. Траблшутинг

| Симптом | Причина и что делать |
|---------|----------------------|
| `P1001: Can't reach database server` | MySQL не запущен (`sudo systemctl status mysql`) или неверный хост/порт в `DATABASE_URL` |
| `prisma db push` требует `--accept-data-loss` | схема в существующей базе расходится со `schema.prisma`. Сначала `mysqldump` (бэкап), потом разбирайтесь: `--accept-data-loss` удаляет данные |
| `P1000: Authentication failed` | неверный пароль/пользователь; проверьте `mysql -u electromontage -p electromontage` |
| `EADDRINUSE :3001` | уже запущен другой экземпляр API: `bash scripts/server-stop.sh`, затем снова `server-start.sh` |
| 502 Bad Gateway | API не работает — смотрите `backend/logs/api.log` |
| 413 Request Entity Too Large | в nginx не поднят `client_max_body_size` (в `deploy/nginx.conf` он 220m) |
| Фото 404 на сайте | nginx не проксирует `/uploads/`, либо файлы лежат не в `backend/uploads` |
| CORS-ошибка в браузере | `FRONTEND_URL` не совпадает с доменом (без слэша на конце), после правки перезапустите API |
| Пустая админка после входа | `prisma db push` не выполнялся на сервере — таблиц нет |
| `npm: command not found` в SSH | Node поставлен через nvm: добавьте `source ~/.nvm/nvm.sh` в `~/.bashrc` |

---

## 9. Чек-лист первого деплоя

1. [ ] MySQL 8 работает, созданы база `electromontage` и пользователь
2. [ ] `backend/.env` на сервере заполнен (DATABASE_URL, JWT, FRONTEND_URL, SEED_*)
3. [ ] `git clone` в `~/apps/electromontage`, `npm ci` и `prisma db push` прошли
4. [ ] `npm run build` и `server-start.sh` — API отвечает на `127.0.0.1:3001`
5. [ ] nginx отдаёт сайт, проксирует `/api/` и `/uploads/`
6. [ ] HTTPS выпущен, `FRONTEND_URL=https://abcn77.ru`
7. [ ] Админ создан (`node scripts/create-admin.js`), вход в `/admin/login` работает
8. [ ] Секреты в GitHub (8 для VPS; `REG_RU_FRONTEND_MODE` можно не задавать), первый прогон workflow зелёный
9. [ ] Фото загружаются пачкой, удаляются чекбоксами, порядок сохраняется
10. [ ] Бэкап базы и `uploads` снят

---

## 10. Шпаргалка

```bash
# локально
cd backend && npm run start:dev
cd frontend && npm run dev

# сервер
cd ~/apps/electromontage/backend
bash scripts/server-start.sh     # перезапуск API
bash scripts/server-stop.sh      # остановить
tail -f logs/api.log             # логи

# база
mysql -u electromontage -p electromontage
npx prisma studio                # только локально

# nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Доступы: где хранить

Пароли, ключи и логины **не коммитятся**. `backend/.env` и файл вида
`ДОСТУПЫ.local.md` — в `.gitignore`. Копии держите в менеджере паролей.
