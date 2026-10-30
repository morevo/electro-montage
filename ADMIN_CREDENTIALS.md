# 📋 ElectroMontage — Админка: Учётные данные и инструкции

---

## 🔐 Доступ к админке

| Параметр | Значение |
|----------|----------|
| **URL админки** | `http://localhost:5173/admin/login` (dev) / `https://abcn77.ru/admin/login` (prod) |
| **Логин** | см. `SEED_ADMIN_LOGIN` в `backend/.env` |
| **Пароль** | см. `SEED_ADMIN_PASSWORD` в `backend/.env` |

> ℹ️ Реальных значений в этом файле **нет намеренно**: репозиторий публичный.
> Их место — `backend/.env` (не попадает в git) и личный `ДОСТУПЫ.local.md`
> в корне репозитория (тоже в `.gitignore`).
>
> ⚠️ **Сменить пароль в интерфейсе нельзя — раздела профиля в админке нет.**
> Пароль меняется так: поменяйте `SEED_ADMIN_PASSWORD` в `backend/.env`
> и выполните `node scripts/create-admin.js` (см. гайд, раздел 5). Старые
> сессии при этом станут невалидными — перелогиньтесь.

---

## 🗄️ База данных

| Параметр | Значение |
|----------|----------|
| **Тип** | MySQL 8 (нативно, без Docker) |
| **Хост** | `127.0.0.1:3306` |
| **База** | `electromontage` |
| **Пользователь** | `electromontage` |
| **Пароль** | из `backend/.env` (в чат/доки не пишем) |

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
cd backend
npm install
```

### 2. База данных
```bash
# Убедитесь, что служба MySQL запущена
# Windows: служба MySQL80 в services.msc; Linux: sudo systemctl start mysql

# Схема (миграций нет — используем db push)
npx prisma db push

# Генерация Prisma Client
npm run prisma:generate

# Сидирование (создание админа + перенос портфолио)
npm run prisma:seed
```

### 3. Запуск сервера
```bash
npm run start:dev
# Сервер: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
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
- [ ] Установить `NODE_ENV=production`
- [ ] Настроить MySQL с надежным паролем
- [ ] Настроить HTTPS (SSL сертификаты)
- [ ] Установить `FRONTEND_URL=https://abcn77.ru`
- [ ] Настроить CORS только для вашего домена
- [ ] Настроить reverse proxy (nginx) для статики `/uploads`
- [ ] Настроить бэкапы БД
- [ ] Настроить логирование и мониторинг

---

## 🔧 Полезные команды

```bash
# Prisma Studio (GUI для БД)
npm run prisma:studio

# Создание миграции после изменения схемы
npm run prisma:migrate -- --name migration_name

# Применение миграций в продакшне
npm run prisma:migrate:prod

# Сброс БД (ТОЛЬКО DEV!)
npm run prisma:migrate reset

# Логи сервера
npm run start:dev 2>&1 | tee server.log
```

---

## 📁 Структура загрузок

```
backend/
├── uploads/
│   └── portfolio/
│       ├── <uuid>.webp
│       ├── <uuid>.webp
│       └── ...
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
- Старые refresh токены добавляются в blacklist

### Защита
- Rate limiting: 100 запросов в минуту (глобально, включая `/auth/*`)
- Helmet.js заголовки безопасности
- CORS только для `FRONTEND_URL`
- Валидация всех входных данных (class-validator)
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
| `P1001: Can't reach database` | MySQL 8 не запущен (`sudo systemctl status mysql`) или неверные хост/порт в `DATABASE_URL` |
| `P1000: Authentication failed` | Неверный пароль/пользователь MySQL: `mysql -u electromontage -p electromontage` |
| `P1001` локально на Windows | Служба MySQL 8 остановлена: `net start MySQL80` от администратора (или `services.msc` → MySQL80 → Запустить) |
| `P1001` с портом `3399` | Это старый Docker-инстанс, его больше нет: в `DATABASE_URL` должен быть порт нативной MySQL — `3306` |
| `Invalid refresh token` | Очистите cookies, войдите заново |
| `CORS error` | Проверьте `FRONTEND_URL` в `.env` |
| Фото не отображаются | Проверьте `backend/uploads/` и прокси `/uploads/` в `deploy/nginx.conf` |
| `Prisma Client not generated` | Запустите `npm run prisma:generate` |

---

## 📞 Поддержка

При проблемах проверьте:
1. Логи сервера (`npm run start:dev`)
2. Swagger документацию: `http://localhost:3001/api/docs`
3. Prisma Studio: `npm run prisma:studio`

---

*Последнее обновление: октябрь 2026 — MySQL 8 нативно, без Docker*
*Проект: ElectroMontage Admin Panel*