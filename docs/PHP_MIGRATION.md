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

## Автодеплой и секреты GitHub — что менять, а что нет

Текущий `.github/workflows/deploy.yml` — 2 джоба, `deploy-frontend` и
`deploy-backend`, оба по SSH на reg.ru. **`deploy-frontend` почти не
меняется** (как собирал и заливал `frontend/dist` рядом, так и продолжает —
только `--exclude api.php` в rsync-команде шага «Upload dist to VPS» нужно
заменить на исключение нового PHP-бэкенда, если он физически лежит в том же
веб-корне, что и статика — см. ниже). Главные изменения — в `deploy-backend`.

### Секреты репозитория (Settings → Secrets and variables → Actions) — не трогать

Все они логин/доступ к одному и тому же серверу/аккаунту, не зависят от
языка бэкенда:
- `REG_RU_SSH_HOST`, `REG_RU_SSH_USER`, `REG_RU_SSH_KEY`, `REG_RU_SSH_PORT`
- `REG_RU_BACKEND_PATH`, `REG_RU_FRONTEND_PATH`, `REG_RU_DOMAIN`
- `PROD_DATABASE_URL` (строка подключения MySQL — та же база, та же схема)
- `SEED_ADMIN_LOGIN`, `SEED_ADMIN_PASSWORD` (разовое создание первого
  администратора — логика "создать один раз, маркер-файл `.admin-seeded`,
  дальше пароль меняется только через саму админку" **обязательна** к
  переносу 1-в-1, см. `deploy.yml` текущий шаг "Prepare and restart API on
  server", блок про `ADMIN_SEEDED_MARKER` — её специально так сделали после
  бага с перезаписью пароля при каждом деплое)
- `REG_RU_HOST`/`REG_RU_USER`/`REG_RU_PASSWORD`/`REG_RU_FRONTEND_MODE` — это
  фолбэк на FTP, сейчас не используется (SSH-режим), можно игнорировать

### Новое, что стоит добавить

- `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` — сейчас генерируются один раз на
  сервере через `openssl rand -base64 32` при первом деплое и живут в
  `.env` на сервере (деплой их не перезаписывает, если `.env` уже есть).
  Это поведение **обязательно сохранить** в PHP-версии (генерировать/читать
  один раз, не перезаписывать) — иначе каждый деплой будет разлогинивать
  всех пользователей. Либо оставить как есть (генерация на сервере при
  первом деплое), либо — чище — завести их как новые GitHub-секреты и
  передавать явно; в обоих случаях главное условие: **не менять значение
  между деплоями**.

### Что убрать из `deploy-backend` целиком

Эти шаги существуют только потому, что Node — отдельный процесс, которым
нужно управлять; PHP выполняется самим Apache по запросу, ничего из этого
не нужно:
- шаг «2. Node на хостинге по умолчанию старый — ставим свой в
  `$HOME/runtime`» (скачивание/распаковка Node-рантайма);
- `npm ci`, `prisma generate`, `prisma db push` на сервере;
- шаг «6. Перезапуск: PID-файл, лог, health-check» (`server-start.sh`);
- шаг «7. Watchdog в cron» — запись `keep-alive.sh` в `crontab`;
  **крайне важно явно удалить и саму старую crontab-запись** (`crontab -l`
  / `crontab -r` или замена на пустую) при первом деплое PHP-версии, иначе
  она продолжит дёргать несуществующий Node-эндпоинт раз в минуту;
- файлы `backend/scripts/server-start.sh`, `server-stop.sh`,
  `keep-alive.sh`, `supervise.sh` и их `chmod +x` — удалить из репозитория
  или просто перестать деплоить.

### Что добавить вместо них

- Сборка PHP-зависимостей — **в CI, не на сервере** (тот же принцип, что
  сейчас: "сборка в GitHub Actions, на сервер едет только билд", см.
  комментарий в начале `deploy.yml`). Если используется Composer — шаг
  `composer install --no-dev --optimize-autoloader` в job'е, `vendor/`
  уезжает тем же rsync'ом, что и код — так не нужно гадать, есть ли на
  шаред-хостинге рабочий Composer/нужная версия PHP для него.
- Схема БД не создаётся Prisma-миграциями — либо переносить её вручную
  один раз (она уже и так есть, таблицы созданы), либо держать свой
  набор SQL-миграций и прогонять идемпотентно похожим шагом, как сейчас
  `prisma db push --skip-generate`.
- `.env`/конфиг для PHP — та же логика создания при первом деплое
  (`DATABASE_URL`, секреты JWT, `FRONTEND_URL`, `UPLOAD_DIR`), но без
  Node-специфичных полей (`PORT` не нужен — PHP не слушает порт).
- `.htaccess` (`frontend/public/.htaccess`) — правило
  `RewriteRule ^api(/.*)?$ /api.php [L,QSA]` заменить на путь к новой
  точке входа PHP-приложения (например `/api/index.php`, если используется
  паттерн front-controller — тогда это правило, наоборот, упростится).
- Никакого health-check/supervisor/cron-watchdog не нужно вообще —
  Apache сам управляет PHP-FastCGI воркерами, падать "насовсем" там
  нечему в том смысле, в каком падал наш Node-процесс.

## Локальная разработка — тоже обновить

Сейчас локальный запуск описан в `LOCAL_DEV.md` и `CLAUDE.md` (корень
репозитория) и автоматизирован через `package.json`/`scripts/dev.js`
(`npm run dev` поднимает MySQL + backend (Node) + frontend разом) и
`.claude/launch.json` (превью фронтенда). Все это нужно обновить под PHP:

- `scripts/dev.js`/`dev-stop.js` — вместо запуска `backend` как Node-процесса
  (`npm run start:dev`) должны поднимать локальный PHP (`php -S
  127.0.0.1:3001` для standalone-роутера, либо `php artisan serve`/эквивалент
  фреймворка, если выбран таковой) — тем же единым `npm run dev`/`npm run
  dev:stop`, без изменения UX для пользователя (одна команда, как сейчас).
- `LOCAL_DEV.md` — переписать раздел запуска backend (сейчас там
  `npm install && npx prisma generate && npx prisma db push && npm run
  prisma:seed && npm run start:dev`) на PHP-эквивалент (`composer install`,
  миграции/сидинг БД, `php -S ...`).
- **Доступы (логины/пароли/хосты MySQL, креды админа) должны остаться
  прежними** — ничего не менять в самой базе и переменных подключения,
  обновляется только то, *чем* backend запускается, не *куда* он подключается.
- `CLAUDE.md` в корне — обновить раздел "Local Development" и таблицу
  команд backend (сейчас там NestJS-команды типа `npm run start:dev`,
  `npm run prisma:studio` и т.п.) под новый стек.
- `.claude/launch.json` — если там зашит Node-специфичный способ запуска
  backend для превью, тоже обновить.

## Современный подход к PHP (не "php4-style")

Это не визитка 2008 года — пиши как нормальный проект 2025+:
- PHP 8.1+ синтаксис: типизированные свойства/параметры/возврат,
  `readonly`-свойства, `enum` (например для `Role`), named arguments,
  nullsafe `?->`, стрелочные функции где уместно;
- Composer с PSR-4 автозагрузкой (`namespace App\...`), никакого
  `require_once` по цепочке;
- строгая типизация — `declare(strict_types=1)` в каждом файле;
- только prepared statements (PDO) — никакой конкатенации строк в SQL;
- DI хотя бы в минимальном виде (конструктор-инъекция сервисов/репозиториев),
  не глобальные функции и не статические God-классы;
- структура по слоям (Controller → Service → Repository), зеркалящая то,
  что уже есть в `backend/src/*/` (там ровно такое разделение — не нужно
  придумывать новую архитектуру, просто перенести тот же паттерн на PHP);
- PSR-12 code style (`.php-cs-fixer` или `phpcs`), чтобы код был
  единообразным, а не "как получилось".

## Что удалить после переноса (не оставлять мёртвый код)

После того как PHP-бэкенд подтверждённо работает на проде (чек-лист ниже
пройден), убрать из репозитория и с сервера всё, что относилось к старой
Node-архитектуре — не оставлять "на всякий случай":
- `backend/` целиком (NestJS/Prisma исходники) — если понадобится свериться
  с оригинальной логикой, она останется в git-истории, в рабочем дереве
  репозитория ему делать нечего;
- `backend/scripts/server-start.sh`, `server-stop.sh`, `keep-alive.sh`,
  `supervise.sh`, `create-admin.js`, `seed-portfolio.js`, `prisma-client.js` —
  весь Node-тулинг;
- `deploy/nginx.conf`, `deploy/api.php` — оба больше не нужны (nginx.conf и
  так никогда не применялся на сервере, api.php заменяется новой точкой
  входа PHP);
- старый `api.php` и всё, что от Node-супервизора, — физически на сервере
  (файлы, crontab-запись — см. чек-лист);
- любые Node-специфичные упоминания в `.github/workflows/deploy.yml`,
  `CLAUDE.md`, `LOCAL_DEV.md`, `.claude/launch.json` — уже перечислены выше,
  но после переноса нужно финально пройтись и убедиться, что нигде не
  осталось висячих ссылок на `npm run start:dev`, `dist/main.js`,
  `prisma db push` и т.п. применительно к бэкенду;
- неиспользуемые npm-зависимости в корневом `package.json` (если там
  остались скрипты/пакеты, нужные только для управления Node-бэкендом).

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
      (проверить `crontab -l` — там не должно остаться `keep-alive.sh`)
- [ ] `.env`/JWT-секреты не перегенерируются на каждом деплое (иначе все
      разлогинятся при следующем же пуше)
- [ ] GitHub Secrets не трогались (список выше) — изменился только сам
      `deploy.yml`, не набор секретов
- [ ] После первого PHP-деплоя — ручная проверка, что reg.ru действительно
      снял блокировку исходящего трафика (аккаунт был заблокирован именно
      за старый Node-процесс, см. "Зачем" выше); если блокировка не снята
      автоматически, нужно отдельно написать в поддержку с перечнем
      выполненных действий (Node-процесс остановлен и удалён)
- [ ] `npm run dev` (из корня репозитория) по-прежнему одной командой
      поднимает MySQL + backend + frontend локально, без изменений в UX;
      логины/пароли/хосты для локальной БД и админа — те же, что были
- [ ] `LOCAL_DEV.md` и `CLAUDE.md` обновлены под новый стек backend
- [ ] `backend/` (NestJS), `deploy/nginx.conf`, `deploy/api.php` и весь
      Node-тулинг удалены из репозитория; на сервере физически удалены
      старый `api.php`, супервизор-скрипты и crontab-запись
- [ ] PHP-код написан по современным практикам (строгая типизация, PSR-12,
      PSR-4 автозагрузка, prepared statements, разделение Controller/
      Service/Repository) — не "php4-style" с require_once и глобалами
