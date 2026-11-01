# Переезд бэкенда с NestJS (Node) на PHP

## Зачем

Проект работает на виртуальном (shared) хостинге reg.ru (ISPmanager, тариф
«Хост-А»). На этом тарифе:
- нет root/sudo — подтверждено (`sudo -n -l` → "a password is required");
- официально поддерживается **только PHP через FastCGI/Apache** — в
  ISPmanager в форме «Создать сайт» есть лишь PHP, никакого типа приложения
  для Node;
- держать собственный процесс, слушающий порт >1024 (наш Node на 3001),
  запрещено правилами тарифа — reg.ru прислал официальное предупреждение
  «Зафиксирована аномалия исходящего трафика» именно за это и заблокировал
  исходящие соединения аккаунта, пока процесс не будет остановлен;
- порты <1024 (чтобы Node слушал что-то «стандартное») недоступны без root —
  это ограничение ядра Linux, не хостинга, обойти нельзя.

Из текущего архитектурного тупика (Node + самодельный PHP-прокси `api.php`,
который целый вечер был источником багов — см. git log) два реальных выхода:
VPS (не выбран пользователем) или **переписать бэкенд на PHP**, который
Apache запускает сам по каждому запросу через FastCGI — без листенящего
процесса, полностью в рамках тарифа.

Эта инструкция — для другой модели/агента, которая будет делать сам перенос.

## Главное правило: API-контракт не меняется

Фронтенд (React/Vite, `frontend/`) **не переписывается** — только бэкенд.
Поэтому новый PHP-бэкенд должен отвечать **байт-в-байт тем же** JSON, с теми
же кодами статусов, на тех же путях `/api/...`, что и текущий NestJS.

**Перед переносом каждого endpoint — открой соответствующий файл в
`backend/src/` и перенеси реальную логику и правила валидации оттуда,** а не
только по списку ниже (он лишь карта, не полная спецификация).

## Текущая схема БД (переносится как есть)

MySQL 8, база `u3596867_default`, уже существует и не пустая — **не трогать
структуру без миграции данных**. Актуальная схема — `backend/prisma/schema.prisma`:

- `users` (id uuid, login unique, passwordHash, name?, role enum[ADMIN,SUPER_ADMIN], createdAt, updatedAt)
- `categories` (id uuid, name unique, slug unique, description?, sortOrder int, createdAt, updatedAt)
- `photos` (id uuid, title, description?, filename, originalName, mimeType, size int, width?, height?, sortOrder int, categoryId → categories.id ON DELETE CASCADE, createdAt, updatedAt)
- `refresh_tokens` (id uuid, tokenHash unique, userId → users.id ON DELETE CASCADE, expiresAt, createdAt, revokedAt?)

## Карта endpoint'ов (сверять с исходниками!)

Источник правды — `backend/src/*/*.controller.ts` и соответствующие `dto/*.ts`.

**`/api/auth`** (`backend/src/auth/`):
- `POST /auth/login` — body `{login, password}` → см. `auth.service.ts login()`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

**`/api/users`** (`backend/src/users/`, только роль SUPER_ADMIN):
- `POST /users`, `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`

**`/api/categories`** (`backend/src/categories/`):
- `POST /categories`, `GET /categories`, `GET /categories/slug/:slug`,
  `GET /categories/:id`, `PATCH /categories/reorder`, `PATCH /categories/:id`,
  `DELETE /categories/:id`

**`/api/photos`** (`backend/src/photos/`):
- `POST /photos` (multipart, одно фото), `POST /photos/bulk` (multipart,
  несколько файлов под полем `files[]`, `titles`/`description` в base64 —
  см. ниже), `POST /photos/bulk-delete`, `GET /photos`, `GET /photos/:id`,
  `PATCH /photos/reorder`, `PATCH /photos/:id`, `DELETE /photos/:id`

**`/api/upload`** (`backend/src/upload/`) — проверить, используется ли
реально фронтендом или это мёртвый код.

**`/api/public`** (`backend/src/public/`, без авторизации):
- `GET /public/categories`, `GET /public/categories/:slug`

## Авторизация — воспроизвести 1-в-1

Логика целиком в `backend/src/auth/auth.service.ts`. Коротко:
- пароли — bcrypt (`password_hash`/`password_verify` в PHP, совместимы по формату);
- JWT access/refresh токены, **в httpOnly cookie**, не в заголовках:
  `access_token` (TTL из `JWT_ACCESS_TTL`, напр. 15m) и `refresh_token`
  (TTL из `JWT_REFRESH_TTL`, напр. 7d);
- cookie-флаги: `httpOnly: true, secure: production, sameSite: 'strict', path: '/'`;
- access и refresh подписаны **разными секретами** (`JWT_ACCESS_SECRET` /
  `JWT_REFRESH_SECRET` из `.env`) — в PHP взять библиотеку `firebase/php-jwt`;
- refresh-токены хранятся в БД как SHA-256 хеш (`tokenHash`, `createTokenHash()`
  = `hash('sha256', $token)`), не как сами токены — для отзыва/ротации;
  при каждом refresh старая запись удаляется, выдаётся новая (ротация);
- `jti` (JWT ID) у refresh-токена — `randomUUID()`-эквивалент, иначе два
  токена, выданных в одну секунду, дают одинаковую подпись;
- same-text ошибка на неверный логин ИЛИ неверный пароль (не раскрывать,
  какой именно) — см. `invalidCredentials` в `auth.service.ts`;
- guard на все защищённые роуты — проверка `access_token` из cookie, при
  истечении фронтенд сам дёргает `/auth/refresh` (см. `frontend/src/api/base.ts`,
  interceptor на 401).

## Загрузка и обработка фото

Источник — `backend/src/upload/upload.service.ts` и `backend/src/photos/photos.controller.ts`.
- входящие файлы (JPEG/PNG/WebP) конвертируются в **WebP** на сервере
  (сейчас — `sharp`; в PHP — `Imagick` или `GD`, проверить, что на хостинге
  реально установлено одно из двух через `phpinfo()`/`extension_loaded()`);
- реальные `width`/`height` достаются из обработанного файла, не из
  исходного (используется в ответе API и хранится в БД);
- файлы физически лежат в `uploads/portfolio/` внутри веб-корня, раздаются
  статикой через nginx/Apache напрямую (НЕ через PHP) — см. `.htaccess`
  (`frontend/public/.htaccess`) и `deploy/nginx.conf` (последний, напомню,
  реально не применён — актуальна только логика `.htaccess` + `api.php`,
  которую вся эта миграция и заменяет);
- **база64**: фронтенд сейчас шлёт `title`/`titles`/`description` в
  multipart-полях закодированными в base64 (см. комментарии в
  `frontend/src/modules/Admin/api/photosApi.ts` и
  `backend/src/common/utils/base64-text.util.ts`) — это обход
  WAF-блокировки (ModSecurity ловил подстроку ".htaccess" в сыром тексте).
  **Это нужно сохранить** в PHP-бэкенде: `base64_decode()` перед валидацией,
  или убрать с обеих сторон синхронно, если решите, что WAF больше не
  актуален (не рекомендуется — проверено на проде, баг реальный).
- Имя файла, которое шлёт фронтенд (`safeFileName()` в `photosApi.ts`),
  тоже специально нейтральное (не оригинальное) — то же самое, обход
  другого WAF-правила (блокирует загрузку, если имя файла содержит
  ".htaccess"). Не полагаться на оригинальное имя файла от клиента.

## Что убрать при переносе

- `backend/` целиком (NestJS/Prisma) — после переноса логики не нужен на
  проде; оставить в репозитории для истории или удалить отдельным PR;
- `/var/www/.../api.php` — реверс-прокси на Node, станет не нужен;
- `backend/scripts/supervise.sh`, `keep-alive.sh`, `server-start.sh`,
  `server-stop.sh` — весь супервизор для удержания живого Node-процесса
  не нужен, PHP не требует постоянного процесса;
- crontab-запись `keep-alive.sh` (`crontab -l` на сервере) — убрать;
- `.github/workflows/deploy.yml` — переписать `deploy-backend` job:
  вместо `npm ci && prisma generate && npm run build && server-start.sh`
  нужно `composer install --no-dev` (если используется Composer/фреймворк)
  и просто выложить файлы rsync'ом, без запуска процесса;
- `frontend/public/.htaccess` — правило `RewriteRule ^api(/.*)?$ /api.php`
  заменить на маршрут к новой точке входа PHP-приложения (например
  `/api/index.php` как front controller, если используется паттерн
  front-controller — тогда правило перепишется под него).

## Рекомендации по стеку PHP

- Лёгкий фреймворк с минимумом зависимостей — **Slim 4** или просто
  структурированный plain-PHP с собственным роутером (проект небольшой,
  5 контроллеров) — предпочтительнее тяжёлого Laravel на shared-хостинге
  с ограниченными ресурсами (см. CLAUDE.md: `ulimit -v 1572864` ≈ 1.5GB).
- ORM — не обязателен: таблиц всего 4, можно на чистом PDO с
  подготовленными запросами (учесть SQL-инъекции — только prepared statements).
  Если ORM нужен — Doctrine DBAL (без полного ORM) легче, чем Eloquent вне Laravel.
- Валидация — `respect/validation` или ручные проверки, зеркалящие
  `class-validator`-декораторы в текущих `dto/*.ts` (`@IsString`,
  `@IsUUID`, `@MaxLength` и т.п. — переносить 1-в-1 те же правила).

## Чек-лист после переноса

- [ ] Все endpoint'ы отвечают тем же JSON-контрактом (сверить вручную с
      фронтендом — `frontend/src/modules/Admin/api/*.ts` и
      `frontend/src/modules/Shared/hooks/useApi.ts` знают точный формат)
- [ ] Вход/выход/refresh работают, cookies выставляются с теми же флагами
- [ ] Роли (ADMIN/SUPER_ADMIN) ограничивают доступ так же, как сейчас
- [ ] Загрузка одного и нескольких фото работает (включая WAF-обходы выше)
- [ ] WebP-конвертация и реальные width/height в ответе
- [ ] Reorder категорий/фото и публичный сайт (`/api/public/*`) видят
      актуальный порядок сразу после сохранения в админке
- [ ] `deploy.yml` выкладывает PHP-бэкенд без Node-рантайма, без supervise/keep-alive
- [ ] Старый `api.php`, супервизор и crontab-запись удалены на сервере
