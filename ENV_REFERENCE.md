# 🔐 Полный справочник переменных окружения и серверных данных

---

## 1️⃣ GitHub Actions Secrets (Settings → Secrets → Actions)

> **Обязательны для автодеплоя** при пуше в `main`/`master`

| Secret | Где используется | Пример | Где взять |
|--------|------------------|--------|-----------|
| **REG_RU_HOST** | FTP-хост shared-хостинга | `ftp.electromontage.ru` | Панель reg.ru → Хостинг → FTP доступ |
| **REG_RU_USER** | FTP-логин | `u1234567` | Тот же раздел |
| **REG_RU_PASSWORD** | FTP-пароль | `••••••••` | Тот же раздел (или сменить в панели) |
| **REG_RU_FRONTEND_PATH** | Путь к корню сайта на хостинге | `/public_html` или `/www` | Обычно `/public_html` для ISPmanager, `/www` для cPanel |
| **REG_RU_SSH_HOST** | IP/хост VPS для бэкенда | `123.45.67.89` | Панель reg.ru → VPS/VDS → IP-адрес |
| **REG_RU_SSH_USER** | SSH-пользователь на VPS | `root` или `deploy` | Создайте пользователя `deploy` с sudo |
| **REG_RU_SSH_KEY** | **Приватный SSH-ключ** (без passphrase!) | `-----BEGIN OPENSSH PRIVATE KEY-----...` | См. генерацию ниже |
| **REG_RU_SSH_PORT** | SSH-порт (опционально) | `22` | Обычно 22, если меняли — свой |
| **REG_RU_BACKEND_PATH** | Путь на VPS для кода бэкенда | `/opt/electromontage` | Куда клонируется репо на VPS |
| **REG_RU_DOMAIN** | Ваш домен | `electromontage.ru` | Ваш домен в reg.ru |

---

## 🔑 Генерация SSH-ключа для деплоя

```bash
# На локальной машине
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "github-actions-deploy"
# Enter passphrase: (оставьте ПУСТЫМ — просто Enter)

# Публичный ключ → на VPS
cat ~/.ssh/deploy_key.pub
# Скопируйте вывод → на VPS:
#   sudo mkdir -p /home/deploy/.ssh
#   echo "ВСТАВЬТЕ_КЛЮЧ" >> /home/deploy/.ssh/authorized_keys
#   chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
#   chown -R deploy:deploy /home/deploy/.ssh

# Приватный ключ → GitHub Secret REG_RU_SSH_KEY
cat ~/.ssh/deploy_key
# Скопируйте ВЕСЬ вывод (с BEGIN/END) → GitHub Secret REG_RU_SSH_KEY
```

---

## 2️⃣ Файлы `.env` в проекте

### `frontend/.env.example` (не коммитится, копируйте в `.env.local`)
```bash
# API URL для локальной разработки
VITE_API_URL=http://localhost:3001/api
# Или для Docker-локального:
# VITE_API_URL=http://localhost/api
```

### `backend/.env.example` (для локальной разработки)
```bash
# Database (Docker Compose local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/electromontage?schema=public

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

# Database (внутренняя сеть Docker)
POSTGRES_PASSWORD=your_very_secure_postgres_password_here

# JWT (генерация: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars_base64
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_base64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# App
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.ru

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 3️⃣ Настройка VPS (reg.ru VPS/VDS) — разово

### 1. Создайте пользователя для деплоя
```bash
# На VPS под root
adduser deploy
usermod -aG sudo deploy
su - deploy
ssh-keygen -t ed25519  # Enter ×3 (без пароля)
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit

# Под root: разрешите deploy sudo без пароля
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
```

### 2. Установите Docker + Compose
```bash
curl -fsSL https://get.docker.com | sh
apt-get update && apt-get install -y docker-compose-plugin git
usermod -aG docker deploy
```

### 3. Настройте папку проекта
```bash
# Под deploy
mkdir -p /opt/electromontage
cd /opt/electromontage
git clone https://github.com/YOUR_LOGIN/YOUR_REPO.git .
# или если приватный — настройте deploy key в GitHub Settings → Deploy keys
```

### 4. Настройте `.env` на VPS
```bash
cd /opt/electromontage
cp backend/.env.production.example backend/.env
nano backend/.env
# Заполните ВСЕ поля:
# POSTGRES_PASSWORD=super_secure_pass
# JWT_ACCESS_SECRET=... (openssl rand -base64 32)
# JWT_REFRESH_SECRET=... (openssl rand -base64 32)
# FRONTEND_URL=https://your-domain.ru
```

### 4.1 (Опционально) Nginx + SSL для прод-фронтенда
```bash
# На VPS под root
apt-get install nginx certbot python3-certbot-nginx
# Настройте /etc/nginx/sites-available/electromontage:
# server { listen 80; server_name your-domain.ru; root /var/www/html; ... }
# ln -s /etc/nginx/sites-available/electromontage /etc/nginx/sites-enabled/
# certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

---

## 4️⃣ Настройка shared-хостинга reg.ru (для фронтенда)

1. **Панель reg.ru** → Хостинг → **FTP доступ**
   - Запишите: хост, логин, пароль
   - Путь к корню: обычно `/public_html` (ISPmanager) или `/www` (cPanel)

2. **Домен** → привяжите к папке `/public_html` (или где лежит `index.html` после деплоя)

3. **SSL** → включите Let's Encrypt в панели хостинга

---

## 5️⃣ Чек-лист перед первым деплоем

| ✅ | Действие |
|---|---|
| 1 | Добавлены все 10 **GitHub Secrets** |
| 2 | SSH-ключ сгенерирован, публичный на VPS, приватный в Secrets |
| 3 | VPS: Docker, Compose, пользователь `deploy`, папка `/opt/electromontage` |
| 4 | На VPS: `backend/.env` заполнен (Postgres, JWT, FRONTEND_URL) |
| 5 | Shared-хостинг: FTP доступен, путь `/public_html` известен |
| 6 | Домен привязан к хостингу, SSL включен |
| 5 | `git push origin main` → проверьте Actions → Deploy to reg.ru |

---

## 6️⃣ Полезные команды генерации секретов

```bash
# JWT секреты (32+ байт base64)
openssl rand -base64 32

# Postgres пароль
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
| `docker-compose.yml` | Локальный фулл-стек | В репо |
| `backend/docker-compose.prod.yml` | Продакшн стек на VPS | В репо |
| `.github/workflows/deploy.yml` | CI/CD пайплайн | В репо |
| **GitHub Secrets** | FTP, SSH, пути, домен | Только в GitHub Settings |

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