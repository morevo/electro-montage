# Локальный запуск ElectroMontage — простыми словами

Этот файл — пошаговая инструкция, как поднять проект на своей машине для
разработки и тестов. Технические детали — в [CLAUDE.md](CLAUDE.md), здесь —
только то, что нужно реально сделать руками.

## Что вообще нужно установить

| Что | Зачем | Проверить |
|-----|-------|-----------|
| Node.js 18+ | фронтенд | `node -v` |
| PHP 8.1+ (CLI) | бэкенд | `php -v` |
| Composer | зависимости PHP | `composer -V` |
| Расширения PHP `pdo_mysql` и `gd` (или `imagick`) | MySQL и WebP-конвертация фото | `php -m` |
| MySQL 8 (сервис `MySQL80`) | база данных | служба запущена |

Docker не используется — всё нативно. Бэкенд — обычный PHP: на проде его
запускает Apache по запросу, локально `npm run dev` поднимает `php -S` на
порту 3001, чтобы Vite-прокси работал как раньше.

> На Windows расширения `pdo_mysql`/`gd` часто выключены в `php.ini`.
> `scripts/dev.js` включает их сам флагами `-d extension=...` — править
> системный `php.ini` не нужно.

---

## Самая быстрая проверка: одна команда

```bash
npm run dev          # из корня репозитория
```

Команда:
1. пробует запустить службу `MySQL80` (если она остановлена);
2. выполняет `api/bin/setup.php` — создаёт таблицы, первого админа (если его
   нет) и демо-портфолио (если в базе нет фото);
3. поднимает PHP-API на `http://localhost:3001`;
4. поднимает Vite на `http://localhost:5173`.

Остановить всё: `npm run dev:stop`.

---

## Шаг 0. Почему иногда 500 ошибки и "не создаются файлы"

Бэкенд подключается к MySQL пользователем `electromontage` / `apppass`
(см. `api/.env`). Если MySQL отвечает "Access denied", ни один запрос к базе
не проходит, и API отдаёт 500 на всё подряд (логин, категории, фото).

Служба `MySQL80` в Windows должна быть запущена. Если пароль пользователя
`electromontage` неизвестен, его можно пересоздать через root-доступ к MySQL
(нужна консоль PowerShell от имени администратора):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "
DROP USER IF EXISTS 'electromontage'@'localhost';
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'apppass';
CREATE DATABASE IF NOT EXISTS electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
"
```

Проверить подключение:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u electromontage -papppass -e "SHOW DATABASES;"
```

Должна появиться строка `electromontage`.

---

## Шаг 1. Бэкенд (PHP)

```bash
cd api
composer install        # ставит firebase/php-jwt и генерирует autoload
php bin/setup.php       # схема БД + админ + демо-портфолио (идемпотентно)
php -S 127.0.0.1:3001 -t . index.php
```

Если `php` не находит `pdo_mysql`, добавьте флаги:

```bash
php -d extension_dir="D:/php/ext" -d extension=pdo_mysql -d extension=gd \
    -S 127.0.0.1:3001 -t . index.php
```

Проверка: `http://localhost:3001/api/public/categories` должен вернуть JSON
со списком категорий. Диагностика окружения — `php bin/healthcheck.php`.

### Полезные CLI-команды (из каталога `api/`)

| Команда | Что делает |
|---------|------------|
| `php bin/migrate.php` | создаёт/проверяет таблицы (идемпотентно) |
| `php bin/seed-admin.php` | создаёт админа из `SEED_ADMIN_LOGIN/PASSWORD` или обновляет пароль |
| `php bin/seed-portfolio.php` | переносит портфолио из `frontend/src/assets` по манифесту |
| `php bin/healthcheck.php` | проверяет PHP-расширения, права на uploads и подключение к БД |

---

## Шаг 2. Запуск фронтенда

Второй терминал, не закрывая первый:

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Фронтенд дергает `/api/...` и картинки `/uploads/...` — Vite сам проксирует
эти запросы на `localhost:3001` (см. `frontend/vite.config.ts`), поэтому
отдельно настраивать CORS руками не нужно.

---

## Шаг 3. Проверка, что всё работает

1. Открой `http://localhost:5173` — должен открыться сайт.
2. Открой `http://localhost:5173/admin/login` — форма входа в админку.
3. Залогинься:
   - **Логин:** `admin` (это логин, не e-mail!)
   - **Пароль:** значение `SEED_ADMIN_PASSWORD` из `api/.env`
     (сейчас это `IdONUJuW8XU9O_AgUR6xQb6o`)
4. Если после логина `401 Unauthorized` на `/api/auth/me` — почисти
   куки сайта `localhost:5173` в браузере и попробуй снова (старый
   access/refresh токен мог остаться от другого состояния базы).

---

## Все локальные доступы (после настройки по этой инструкции)

| Что | Значение |
|-----|----------|
| Фронтенд (dev) | http://localhost:5173 |
| Бэкенд API (PHP) | http://localhost:3001 |
| Админка | http://localhost:5173/admin/login |
| Логин админки | `admin` |
| Пароль админки | см. `SEED_ADMIN_PASSWORD` в `api/.env` |
| MySQL host | `127.0.0.1:3306` |
| MySQL база | `electromontage` |
| MySQL пользователь приложения | `electromontage` / `apppass` |

---

## Продакшн-доступы (хостинг reg.ru, домен abcn77.ru)

Эти доступы **не для повседневной разработки** — только для деплоя/
диагностики сервера. Не коммить их никуда в открытом виде.

| Что | Значение |
|-----|----------|
| Панель хостинга (ISPmanager) | https://server266.hosting.reg.ru:1500/ |
| SSH/SFTP логин | `u3596867` |
| SSH host | `server266.reg.ru` (или IP `31.31.196.50`) |
| Каталог сайта (веб-корень) | `~/www/abcn77.ru` |
| PHP-бэкенд | `~/www/abcn77.ru/api` |
| Фото портфолио | `~/www/abcn77.ru/uploads/portfolio` |
| MySQL на сервере | база `u3596867_default`, пользователь `u3596867_default`, host `localhost` |

Пароли от этих доступов — только у тебя, в сообщении с паролями от
хостинга (ISPmanager/FTP/MySQL). Agent их не сохраняет и не публикует.

Автодеплой на прод настроен через GitHub Actions (`.github/workflows/deploy.yml`)
при пуше в `main` — см. раздел "Auto-Deploy" в [CLAUDE.md](CLAUDE.md#-auto-deploy-to-regru-github-actions)
для списка нужных GitHub Secrets.

---

## Частые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| 500 на все запросы (`/api/auth/login`, `/api/photos`...) | MySQL не принимает пользователя `electromontage` | Шаг 0 выше |
| `could not find driver` | не загружен `pdo_mysql` | запустить PHP с `-d extension=pdo_mysql` (см. Шаг 1) |
| `Не найден PHP CLI` при `npm run dev` | PHP не в PATH | установить PHP 8.1+ и перезапустить терминал |
| Фото загружается, но не создаётся `.webp` | нет `gd`/`imagick` с WebP | `php bin/healthcheck.php`, включить расширение |
| `net start MySQL80` → "Отказано в доступе" (код 5) | PowerShell не от администратора | Перезапусти PowerShell как администратор |
| 401 на `/api/auth/me` сразу после логина | Устаревшие куки с токенами от другого состояния базы | Очисти куки `localhost:5173` в браузере |
