# 📋 ElectroMontage — Админка: Учётные данные и инструкции

---

## 🔐 Доступ к админке

| Параметр | Значение |
|----------|----------|
| **URL админки** | `http://localhost:5173/admin/login` (dev) / `https://your-domain.com/admin/login` (prod) |
| **Email** | `admin@electromontage.ru` |
| **Пароль** | `ElectroAdmin2024!` |

> ⚠️ **Важно:** Смените пароль при первом входе через раздел профиля (планируется) или напрямую в БД.

---

## 🗄️ База данных

| Параметр | Значение |
|----------|----------|
| **Тип** | PostgreSQL 15+ |
| **Хост** | `localhost:5432` (dev) |
| **База** | `electromontage` |
| **Пользователь** | `postgres` |
| **Пароль** | `postgres` (dev) |

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
# Запуск PostgreSQL (если не запущен)
# Docker: docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=electromontage -p 5432:5432 postgres:15

# Миграции
npm run prisma:migrate

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
- [ ] Настроить PostgreSQL с надежным паролем
- [ ] Настроить HTTPS (SSL сертификаты)
- [ ] Установить `FRONTEND_URL=https://your-domain.com`
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
│       ├── category1-slug/
│       │   ├── photo1.webp
│       │   └── photo2.webp
│       └── category2-slug/
│           └── ...
```

- Все фото конвертируются в **WebP** (quality 85) при загрузке
- Оригинальные файлы не хранятся
- Максимальный размер: **10 MB**
- Разрешенные форматы: **JPG, PNG, WebP**

---

## 🔒 Безопасность

### JWT
- **Access Token**: 15 минут, httpOnly, Secure, SameSite=Strict
- **Refresh Token**: 7 дней, httpOnly, Secure, SameSite=Strict, **ротация** при каждом обновлении
- Старые refresh токены добавляются в blacklist

### Защита
- Rate limiting: 100 req/min (общий), строже на `/auth/*`
- Helmet.js заголовки безопасности
- CORS только для `FRONTEND_URL`
- Валидация всех входных данных (class-validator)
- Bcrypt cost: 12

---

## 🛠️ Управление портфолио

### В админке доступно:
1. **Категории** (`/admin/categories`)
   - Создание / переименование / удаление
   - Drag-and-drop переупорядочивание
2. **Фото** (`/admin/photos`)
   - Загрузка (множественная)
   - Редактирование заголовка / описания
   - Drag-and-drop переупорядочивание внутри категории
   - Удаление

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
| `P1001: Can't reach database` | Проверьте PostgreSQL, `DATABASE_URL`, firewall |
| `Invalid refresh token` | Очистите cookies, войдите заново |
| `CORS error` | Проверьте `FRONTEND_URL` в `.env` |
| Фото не отображаются | Проверьте `uploads/` папку, nginx static serving |
| `Prisma Client not generated` | Запустите `npm run prisma:generate` |

---

## 📞 Поддержка

При проблемах проверьте:
1. Логи сервера (`npm run start:dev`)
2. Swagger документацию: `http://localhost:3001/api/docs`
3. Prisma Studio: `npm run prisma:studio`

---

*Последнее обновление: 2024*
*Проект: ElectroMontage Admin Panel*