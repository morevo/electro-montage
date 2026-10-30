# 🔐 Полный справочник переменных окружения и серверных данных

---

## 1️⃣ GitHub Actions Secrets (Settings → Secrets → Actions)

> **Обязательны для автодеплоя** при пуше в `main`/`master`

| Secret | Где используется | Пример | Где взять |
|--------|------------------|--------|-----------|
| **REG_RU_HOST** | FTP-хост shared-хостинга | `ftp.abcn77.ru` | Панель reg.ru → Хостинг → FTP доступ |
| **REG_RU_USER** | FTP-логин | `u1234567` | Тот же раздел |
| **REG_RU_PASSWORD** | FTP-пароль | `••••••••` | Тот же раздел (или сменить в панели) |
| **REG_RU_FRONTEND_PATH** | Куда выкладывается собранный фронтенд | `/var/www/abcn77.ru` | Папка, которую отдаёт nginx (`root` в `deploy/nginx.conf`) |
| **REG_RU_FRONTEND_MODE** | Как выкладывать статику: `ssh` (rsync на VPS) или `ftp` | `ssh` | Необязательный. Не задан → `ssh` при наличии `REG_RU_SSH_HOST`, иначе `ftp` |
| **REG_RU_SSH_HOST** | Хост сервера для бэкенда | `123.45.67.89` (VPS) или `server266.reg.ru` (хостинг) | Панель reg.ru → VPS/VDS → IP, либо письмо о хостинге |
| **REG_RU_SSH_USER** | SSH-пользователь | `root`/`deploy` на VPS; `u3596867` на виртуальном хостинге | VPS-пользователь создаётся руками; на хостинге выдаётся сразу |
| **REG_RU_SSH_KEY** | **Приватный SSH-ключ** (без passphrase!) | `-----BEGIN OPENSSH PRIVATE KEY-----...` | См. генерацию ниже |
| **REG_RU_SSH_PORT** | SSH-порт (опционально) | `22` | Обычно 22, если меняли — свой |
| **REG_RU_BACKEND_PATH** | Путь на VPS для кода бэкенда | `/opt/electromontage` | Куда клонируется репо на VPS |
| **REG_RU_DOMAIN** | Ваш домен | `abcn77.ru` | Ваш домен в reg.ru |

---

## 🔑 Генерация SSH-ключа для деплоя

```bash
# На локальной машине
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy"
# Enter passphrase: (оставьте ПУСТЫМ — просто Enter)

# Публичный ключ → на сервер
cat ~/.ssh/deploy_key.pub

# VPS (есть root):
#   sudo mkdir -p /home/deploy/.ssh
#   echo "ВСТАВЬТЕ_КЛЮЧ" >> /home/deploy/.ssh/authorized_keys
#   chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
#   chown -R deploy:deploy /home/deploy/.ssh

# Виртуальный хостинг reg.ru (sudo НЕТ, chown не нужен):
#   mkdir -p ~/.ssh && chmod 700 ~/.ssh
#   echo "ВСТАВЬТЕ_КЛЮЧ" >> ~/.ssh/authorized_keys
#   chmod 600 ~/.ssh/authorized_keys

# Приватный ключ → GitHub Secret REG_RU_SSH_KEY
cat ~/.ssh/deploy_key
# Скопируйте ВЕСЬ вывод (с BEGIN/END) → GitHub Secret REG_RU_SSH_KEY
```

---

## 2️⃣ Файлы `.env` в проекте

### `frontend` — переменных окружения нет

Сборка фронтенда не читает `.env`: все запросы идут на относительный `/api`, картинки — на
`/uploads/portfolio/<filename>`. Локально их проксирует Vite (`server.proxy` в `vite.config.ts`),
на проде — nginx (`deploy/nginx.conf`). Файл `frontend/.env` создавать не нужно.

### `backend/.env.example` (для локальной разработки)
```bash
# Database (MySQL 8 локально, нативно)
DATABASE_URL=mysql://electromontage:пароль@127.0.0.1:3306/electromontage

# JWT (можно оставить дефолтные для локалки)
JWT_ACCESS_SECRET=electro-montage-super-secret-access-key-2024-min-32-chars-long
JWT_REFRESH_SECRET=electro-montage-super-secret-refresh-key-2024-min-32-chars-long
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### `backend/.env.production.example` → копируйте в `.env` на VPS
```bash
# ⚠️ Заполните ВСЕ значения перед деплоем!

# Database (MySQL 8 на сервере)
DATABASE_URL=mysql://electromontage:пароль@127.0.0.1:3306/electromontage

# JWT (генерация: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars_base64
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_base64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# App
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://abcn77.ru

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 3️⃣ Настройка VPS (reg.ru VPS/VDS) — разово

### 1. Проверьте, что есть на сервере
```bash
node -v && npm -v     # нужен Node 20+
mysql --version       # MySQL 8
nginx -v              # веб-сервер
git --version
```

Если Node нет, а root есть:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Настройте папку проекта
```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/morevo/electro-montage.git electromontage
cd electromontage
```

### 4. Настройте `.env` на VPS
```bash
cd ~/apps/electromontage
cp backend/.env.production.example backend/.env
nano backend/.env
# Заполните ВСЕ поля:
# DATABASE_URL=mysql://electromontage:пароль@127.0.0.1:3306/electromontage
# JWT_ACCESS_SECRET=... (openssl rand -base64 32)
# JWT_REFRESH_SECRET=... (openssl rand -base64 32)
# FRONTEND_URL=https://abcn77.ru
```

Первый запуск API без Docker:
```bash
cd backend
npm ci && npx prisma generate && npx prisma db push --skip-generate
npm run build && bash scripts/server-start.sh
```

### 4.1 (Опционально) Nginx + SSL для прод-фронтенда
```bash
# На VPS под root
apt-get install nginx certbot python3-certbot-nginx
# Настройте /etc/nginx/sites-available/electromontage:
# server { listen 80; server_name abcn77.ru; root /var/www/html; ... }
# ln -s /etc/nginx/sites-available/electromontage /etc/nginx/sites-enabled/
# certbot --nginx -d abcn77.ru -d www.abcn77.ru
```

---

## 4️⃣ Статика на VPS (без Docker и без FTP)

nginx отдаёт `frontend/dist` прямо с диска VPS — отдельный shared-хостинг не нужен.
Всё выкладывается по тому же SSH, что и бэкенд (rsync).

1. **Папка сайта** (пользователь деплоя должен в неё писать):
```bash
sudo mkdir -p /var/www/abcn77.ru
sudo chown -R $USER:www-data /var/www/abcn77.ru
```

2. **nginx** — готовый конфиг в репо (`deploy/nginx.conf`):
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/abcn77.ru
sudo ln -s /etc/nginx/sites-available/abcn77.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

3. **SSL** — `sudo certbot --nginx -d abcn77.ru -d www.abcn77.ru`

> Если фронтенд всё-таки лежит на shared-хостинге — задайте `REG_RU_FRONTEND_MODE=ftp`
> и заполните `REG_RU_HOST` / `REG_RU_USER` / `REG_RU_PASSWORD`.

---

## 5️⃣ Чек-лист перед первым деплоем

| ✅ | Действие |
|---|---|
| 1 | Добавлены все 11 **GitHub Secrets** (10 обязательных + `REG_RU_FRONTEND_MODE`) |
| 2 | SSH-ключ сгенерирован, публичный на VPS, приватный в Secrets |
| 3 | VPS: Node 20, MySQL 8 нативно (база и пользователь созданы), git-клон в `~/apps/electromontage` |
| 4 | На VPS: `backend/.env` заполнен (MySQL, JWT, FRONTEND_URL) |
| 5 | VPS: папка `/var/www/abcn77.ru` создана, nginx отдаёт её |
| 6 | Домен привязан к VPS, SSL выпущен |
| 7 | `git push origin main` → проверьте Actions → Deploy to reg.ru |

---

## 6️⃣ Полезные команды генерации секретов

```bash
# JWT секреты (32+ байт base64)
openssl rand -base64 32

# Пароль MySQL-пользователя
openssl rand -base64 24

# Случайная строка
openssl rand -hex 32
```

---

## 📁 Итоговая карта файлов конфигурации

| Файл | Назначение | Куда деплоится |
|------|------------|----------------|
| `frontend/.env.local` | Локальный API URL | Только локально (gitignore) |
| `backend/.env` (local) | Локальная БД, JWT, порты | Только локально (gitignore) |
| `backend/.env` (на VPS) | Продакшн БД, JWT, FRONTEND_URL | **Только на VPS**, не в гите! |
| `backend/.env.production.example` | Шаблон для VPS | В репо (пример) |
| `deploy/nginx.conf` | Конфиг nginx: статика + /api + /uploads | В репо |
| `backend/scripts/server-start.sh` | Запуск API без Docker и без root | В репо |
| `.github/workflows/deploy.yml` | CI/CD пайплайн | В репо |
| **GitHub Secrets** | SSH, путь статики, домен | Только в GitHub Settings |
| `AUTODEPLOY.md` | Инструкция по автодеплою (VPS, без Docker) | В репо |

---

## ⚡ Быстрая проверка перед пушем

```bash
# 1. Локально всё собирается
cd frontend && npm run build
cd ../backend && npm run build

# 2. Тесты проходят
cd backend && npm run test

# 3. Линт чист
cd backend && npm run lint

# 4. Пуш
git add . && git commit -m "feat: ready for deploy" && git push origin main

# 5. Смотрим Actions → Deploy to reg.ru → ждём зелёную галочку
```