# 📋 ElectroMontage — Админка: Учётные данные и инструкции

---

## 🔐 Доступ к админке

| Параметр | Значение |
|----------|----------|
| **URL админки** | `http://localhost:5173/admin/login` (dev) / `https://abcn77.ru/admin/login` (prod) |
| **Логин** | см. `SEED_ADMIN_LOGIN` в `api/.env` |
| **Пароль** | см. `SEED_ADMIN_PASSWORD` в `api/.env` |

> ℹ️ Реальных значений в этом файле **нет намеренно**: репозиторий публичный.
> Их место — `api/.env` (не попадает в git) и личный `ДОСТУПЫ.local.md`
> в корне репозитория (тоже в `.gitignore`).
>
> ⚠️ **Сменить пароль в интерфейсе нельзя — раздела профиля в админке нет.**
> Пароль меняется так: поменяйте `SEED_ADMIN_PASSWORD` в `api/.env`
> и выполните `php api/bin/seed-admin.php`. Старые
> сессии при этом станут невалидными — перелогиньтесь.

---

## 🗄️ База данных

| Параметр | Значение |
|----------|----------|
| **Тип** | MySQL 8 (нативно, без Docker) |
| **Хост** | `127.0.0.1:3306` |
| **База** | `electromontage` |
| **Пользователь** | `electromontage` |
| **Пароль** | из `api/.env` (в чат/доки не пишем) |

> **База на стенде уже настроена.** Используйте существующие хост / базу /
> пользователя / пароль — создавать что-то заново не нужно. Блок ниже — только
> для чистой установки с нуля.

Создание базы и пользователя — один раз:

```sql
CREATE DATABASE electromontage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'electromontage'@'localhost' IDENTIFIED BY 'сильный_пароль';
GRANT ALL PRIVILEGES ON electromontage.* TO 'electromontage'@'localhost';
FLUSH PRIVILEGES;
```

### Основные таблицы
- `users` — администраторы
- `categories` — категории портфолио
- `photos` — фото в категориях
- `refresh_tokens` — refresh токены (с ротацией и blacklist)

---

## 🚀 Запуск (Development)

### 1. Зависимости
```bash
cd api
composer install
```

### 2. База данных
```bash
# Убедитесь, что служба MySQL запущена
# Windows: служба MySQL80 в services.msc; Linux: sudo systemctl start mysql

# Схема + админ + демо-портфолио (идемпотентно)
php bin/setup.php
```

### 3. Запуск сервера
```bash
php -S 127.0.0.1:3001 -t . index.php
# API: http://localhost:3001/api/public/categories
# Диагностика: php bin/healthcheck.php
```

### 4. Фронтенд (в отдельном терминале)
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
# Админка: http://localhost:5173/admin/login
```

---

## 📦 Продакшн чек-лист

- [ ] Сгенерировать **сильные секреты** для JWT (64+ символов):
  ```bash
  openssl rand -base64 64
  ```
- [ ] Установить `APP_ENV=production`
- [ ] Настроить MySQL с надежным паролем
- [ ] Настроить HTTPS (SSL сертификаты)
- [ ] Установить `FRONTEND_URL=https://abcn77.ru`
- [ ] Настроить CORS только для вашего домена
- [ ] Убедиться, что Apache отдаёт `/uploads` как статику (это делается автоматически)
- [ ] Настроить бэкапы БД
- [ ] Настроить логирование и мониторинг

---

## 🔧 Полезные команды

```bash
# Применить/проверить схему БД (идемпотентно)
php api/bin/migrate.php

# Создать админа или сменить ему пароль
php api/bin/seed-admin.php

# Перенести портфолио по манифесту
php api/bin/seed-portfolio.php

# Проверить PHP-окружение (расширения, права, БД)
php api/bin/healthcheck.php
```

---

## 📁 Структура загрузок

```
api/uploads/portfolio/          # локально
<веб-корень>/uploads/portfolio/ # на проде
├── <uuid>.webp
├── <uuid>.webp
└── ...
```

Файлы лежат **плоско** в одной папке: категория хранится только в базе
(таблица `photos`, поле `categoryId`), подпапок на диске нет.

- Все фото конвертируются в **WebP** (quality 85) при загрузке
- Оригинальные файлы не хранятся
- Имя на диске — UUID, реальное имя файла сохраняется в `originalName`
- Максимальный размер: **10 MB**, максимальный размер изображения: **5000×5000 px**
- Разрешенные форматы: **JPG, PNG, WebP**

---

## 🔒 Безопасность

### JWT
- **Access Token**: 15 минут, httpOnly, Secure, SameSite=Strict
- **Refresh Token**: 7 дней, httpOnly, Secure, SameSite=Strict, **ротация** при каждом обновлении
- При ротации старый токен удаляется из БД (повторно использовать его нельзя)

### Защита
- Rate limiting: 100 запросов в минуту (глобально, включая `/auth/*`)
- CORS только для `FRONTEND_URL`
- Валидация всех входных данных (те же правила, что были в DTO)
- Только prepared statements (PDO)
- Bcrypt cost: 12
- Логин и пароль сравниваются одинаковым сообщением об ошибке — по ответу
  нельзя понять, существует ли пользователь

---

## 🛠️ Управление портфолио

### В админке доступно:
1. **Категории** (`/admin/categories`)
   - Создание / переименование / удаление
   - Drag-and-drop переупорядочивание
2. **Фото** (`/admin/photos`)
   - Загрузка по одному файлу (JPG/PNG/WebP, до 10 МБ)
   - Редактирование заголовка / описания / категории
   - Drag-and-drop переупорядочивание внутри категории
   - Удаление (файл удаляется и с диска)

### API эндпоинты (основные)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление токена |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/categories` | Список категорий |
| POST | `/api/categories` | Создать категорию |
| PATCH | `/api/categories/:id` | Обновить |
| DELETE | `/api/categories/:id` | Удалить |
| PATCH | `/api/categories/reorder` | Переупорядочить |
| GET | `/api/photos` | Список фото |
| POST | `/api/photos` | Загрузить фото |
| PATCH | `/api/photos/:id` | Обновить фото |
| DELETE | `/api/photos/:id` | Удалить фото |
| PATCH | `/api/photos/reorder` | Переупорядочить фото |
| GET | `/api/public/categories` | Публичное портфолио |

---

## 🆘 Troubleshooting

| Проблема | Решение |
|----------|---------|
| `Не удалось подключиться к MySQL` | MySQL 8 не запущен (`sudo systemctl status mysql`) или неверные хост/порт в `DATABASE_URL` |
| `Access denied for user` | Неверный пароль/пользователь MySQL: `mysql -u electromontage -p electromontage` |
| MySQL локально на Windows | Служба остановлена: `net start MySQL80` от администратора (или `services.msc` → MySQL80 → Запустить) |
| `could not find driver` | Не загружен `pdo_mysql`: запустите PHP с `-d extension=pdo_mysql` |
| `Invalid refresh token` | Очистите cookies, войдите заново |
| `CORS error` | Проверьте `FRONTEND_URL` в `.env` |
| Фото не отображаются | Проверьте `uploads/portfolio/` в веб-корне и `UPLOAD_DIR` в `.env` |
| Ошибка обработки изображения | На сервере нет `gd`/`imagick` с WebP: `php bin/healthcheck.php` |

---

## 📞 Поддержка

При проблемах проверьте:
1. Логи сервера (`npm run start:dev`)
2. Swagger документацию: `http://localhost:3001/api/docs`
3. Prisma Studio: `npm run prisma:studio`

---

*Последнее обновление: октябрь 2026 — MySQL 8 нативно, без Docker*
*Проект: ElectroMontage Admin Panel*