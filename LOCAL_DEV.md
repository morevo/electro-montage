# Локальный запуск ElectroMontage — простыми словами

Этот файл — пошаговая инструкция, как поднять проект на своей машине для
разработки и тестов. Технические детали — в [CLAUDE.md](CLAUDE.md), здесь —
только то, что нужно реально сделать руками.

## Что вообще нужно установить

| Что | Зачем | Проверить |
|-----|-------|-----------|
| Node.js 18+ | фронтенд и бэкенд | `node -v` |
| MySQL 8 (сервис `MySQL80`) | база данных | уже установлен у тебя, служба запущена |
| npm | ставит зависимости | идёт вместе с Node |

Docker не используется — всё нативно.

---

## Шаг 0. Почему сейчас 500 ошибки и "не создаются файлы"

Диагностировал: бэкенд подключается к MySQL пользователем
`electromontage` / `apppass` (см. `backend/.env`), но этого пользователя в
локальной базе либо нет, либо у него не тот пароль — **MySQL отвечает
"Access denied"**. Из-за этого НИ ОДИН запрос к базе не проходит, и API
отдаёт 500 на всё подряд (логин, категории, фото, загрузку файлов — всё,
что лезет в базу).

Служба `MySQL80` в Windows **запущена и работает** — дело не в ней, а в
правах доступа пользователя `electromontage`. Починить это можно только
через root-доступ к MySQL, а пароль root для локальной установки — Agent
не знает (ты сказал, что тоже не задавал/не помнишь). Поэтому первый шаг —
сбросить root-пароль.

### Как сбросить root-пароль MySQL на Windows

Нужна **консоль PowerShell, запущенная от имени администратора**
(правый клик на PowerShell → "Запуск от имени администратора").

```powershell
# 1. Останавливаем службу MySQL
net stop MySQL80

# 2. Создаём временный файл с командой сброса пароля
'ALTER USER ''root''@''localhost'' IDENTIFIED BY ''NewRootPass123!'';' | Out-File -Encoding ascii C:\mysql-init.txt

# 3. Запускаем MySQL вручную с этим файлом (окно останется открытым - это нормально)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --init-file=C:\mysql-init.txt --console
```

Подожди, пока в выводе появится `ready for connections` — пароль уже
сброшен. Нажми `Ctrl+C`, чтобы остановить этот временный процесс, затем:

```powershell
# 4. Удаляем файл с паролем (в нём пароль открытым текстом)
Remove-Item C:\mysql-init.txt

# 5. Запускаем службу MySQL снова как обычно
net start MySQL80
```

Теперь root-пароль — `NewRootPass123!` (замени на свой, если хочешь).
Дальше — пересоздать пользователя приложения:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pNewRootPass123! -e "
DROP USER IF EXISTS 'electromontage'@'localhost';
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'apppass';
CREATE DATABASE IF NOT EXISTS electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
"
```

Если команда ничего не вывела и не упала с ошибкой — всё получилось.
Проверить можно так:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u electromontage -papppass -e "SHOW DATABASES;"
```

Должна появиться строка `electromontage` в списке баз.

> В проекте есть вспомогательный скрипт `backend/setup-mysql.js` — он делает
> то же самое, но предполагает, что у root вообще нет пароля. После сброса
> пароля выше он не нужен; можно удалить файл или оставить как есть — в
> git он не закоммичен (стоит в `.gitignore`/просто неотслеживаемый).

---

## Шаг 1. Запуск бэкенда

```bash
cd backend
npm install
npx prisma generate
npx prisma db push      # создаст таблицы в базе electromontage
npm run prisma:seed     # создаст админа и демо-фото
npm run start:dev       # http://localhost:3001, Swagger: /api/docs
```

Если `npx prisma db push` падает с ошибкой подключения — значит Шаг 0 не
выполнен до конца (проверь `backend/.env` → `DATABASE_URL`).

### Важно про `/api` в браузере

Если открыть просто `http://localhost:3001/api` в браузере — увидишь
`{"message":"Cannot GET /api"}`. Это нормально: `/api` — это префикс для
маршрутов (`/api/auth/login`, `/api/photos` и т.д.), а не страница сама по
себе. Документация API (Swagger) — по адресу `http://localhost:3001/api/docs`.

---

## Шаг 2. Запуск фронтенда

Второй терминал, не закрывая первый:

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Фронтенд дергает `/api/...` — Vite сам проксирует эти запросы на
`localhost:3001` (см. `frontend/vite.config.ts`), поэтому отдельно
настраивать CORS руками не нужно.

---

## Шаг 3. Проверка, что всё работает

1. Открой `http://localhost:5173` — должен открыться сайт.
2. Открой `http://localhost:5173/admin/login` — форма входа в админку.
3. Залогинься:
   - **Логин:** `admin` (это логин, не e-mail!)
   - **Пароль:** значение `SEED_ADMIN_PASSWORD` из `backend/.env`
     (сейчас это `IdONUJuW8XU9O_AgUR6xQb6o`)
4. Если после логина `401 Unauthorized` на `/api/auth/me` — почисти
   куки сайта `localhost:5173` в браузере и попробуй снова (старый
   access/refresh токен мог остаться от другого состояния базы).

Если на 3-м шаге опять `500 Internal server error` на `/api/auth/login` —
значит Шаг 0 (доступ к MySQL) не выполнен либо `npx prisma db push`
не создал таблицы. Проверь логи бэкенда в терминале — там будет видно
точную ошибку Prisma/MySQL.

---

## Все локальные доступы (после настройки по этой инструкции)

| Что | Значение |
|-----|----------|
| Фронтенд (dev) | http://localhost:5173 |
| Бэкенд API | http://localhost:3001 |
| Swagger (документация API) | http://localhost:3001/api/docs |
| Админка | http://localhost:5173/admin/login |
| Логин админки | `admin` |
| Пароль админки | см. `SEED_ADMIN_PASSWORD` в `backend/.env` |
| MySQL host | `127.0.0.1:3306` |
| MySQL база | `electromontage` |
| MySQL пользователь приложения | `electromontage` / `apppass` |
| MySQL root (после сброса по Шагу 0) | `root` / тот пароль, что задал |

---

## Продакшн-доступы (хостинг reg.ru, домен abcn77.ru)

Эти доступы **не для повседневной разработки** — только для деплоя/
диагностики сервера. Не коммить их никуда в открытом виде.

| Что | Значение |
|-----|----------|
| Панель хостинга (ISPmanager) | https://server266.hosting.reg.ru:1500/ |
| SSH/SFTP логин | `u3596867` |
| SSH host | `server266.reg.ru` (или IP `31.31.196.50`) |
| Путь к коду на сервере | обычно `~/apps/electromontage` (см. секрет `REG_RU_BACKEND_PATH`) |
| Путь фронтенда (nginx root) | см. секрет `REG_RU_FRONTEND_PATH`, вероятно `/var/www/abcn77.ru` |
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
| `Cannot GET /api` в браузере | Открыл `/api` напрямую — это не страница | Открой `/api/docs` или используй фронтенд |
| `net start MySQL80` → "Отказано в доступе" (код 5) | PowerShell не от администратора | Перезапусти PowerShell как администратор |
| `mysql` не распознан как команда | `mysql.exe` не добавлен в PATH | Используй полный путь: `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`, либо добавь эту папку в переменную окружения PATH |
| 401 на `/api/auth/me` сразу после логина | Устаревшие куки с токенами от другого состояния базы | Очисти куки `localhost:5173` и `localhost:3001` в браузере |
| Ошибки при создании/загрузке файлов фото | Старые временные файлы multer в `backend/uploads/tmp` или нет прав на запись в `backend/uploads` | Проверь, что папка `backend/uploads` существует и доступна на запись |
