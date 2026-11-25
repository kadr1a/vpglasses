# VP Glasses

Интернет-магазин оптики: каталог оправ, конструктор линз, корзина, оформление заказов, личный кабинет и административная панель.

## Запуск через Docker

Требуются Docker Desktop и Docker Compose.

```bash
docker compose up --build
```

После запуска:
- Магазин: http://localhost:8080
- API: http://localhost:3001/api/health
- PostgreSQL снаружи Docker: `localhost:5433`

При первом старте backend автоматически применяет Prisma migrations через `prisma db push` и запускает seed. Данные сохраняются в volume `vpglasses_data`.

Остановка: `docker compose down`. Удаление БД вместе с данными: `docker compose down -v`.

## Тестовые учётные записи

- Администратор: `admin@pvglasses.ru` / `admin123`
- Клиент: `client@example.com` / `client123`

## Запуск без Docker

Нужны Node.js 20+, PostgreSQL 15+ и npm.

Backend:
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run seed
npm run dev
```

Frontend (во втором терминале):
```bash
cd frontend
npm install
npm run dev
```

Vite dev server доступен на http://localhost:5173. API по умолчанию — http://localhost:3001.

## Переменные окружения backend

| Переменная | Назначение | Значение по умолчанию |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Секрет подписи JWT | требуется задать |
| `PORT` | Порт API | `3001` |
| `CLIENT_URL` | Разрешённый origin | `http://localhost:8080` |

Для production обязательно замените `JWT_SECRET`, пароли БД и тестовые учётные записи.

## Основные маршруты

- `/` — каталог
- `/frames/:id` — карточка оправы
- `/cart` — корзина
- `/checkout` — оформление заказа
- `/login`, `/register` — вход и регистрация
- `/profile` — профиль и история заказов
- `/admin` — панель администратора

## Администрирование

Войдите под администратором и откройте `/admin`. Там доступны CRUD оправ, управление статусами заказов и аналитические отчёты. Новую оправу можно добавить через форму, указав URL изображения. Справочники линз редактируются в `backend/prisma/seed.js` и повторным запуском `npm run seed`; существующие справочные записи не дублируются.

## Архитектура

- `frontend/` — React 18, Vite, Zustand, Axios, React Router 6.
- `backend/` — Express, Prisma, PostgreSQL, JWT, bcrypt, Zod.
- `docker-compose.yml` — PostgreSQL, API и Nginx frontend.
