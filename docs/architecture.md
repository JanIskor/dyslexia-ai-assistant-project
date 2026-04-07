# Архитектура проекта

## Обзор

Проект разрабатывается как современная веб-система для адаптации образовательных текстов к потребностям людей с дислексией.

## Текущая фаза: PostgreSQL Migration + Profile Schema

На текущем этапе frontend auth flow и базовые dashboard UI уже реализованы, а backend persistence переведён на PostgreSQL с Alembic и product-level profile schema.

### Tech Stack
```
Frontend (Next.js 16 + App Router)
    ↓
    [Tailwind CSS for styling]
    [TypeScript for type safety]
    [ESLint + Prettier for code quality]
    [Auth API client + token storage]
    ↓
[Browser]

Backend (FastAPI + SQLAlchemy)
    ↓
    [PostgreSQL database]
    [Alembic migrations]
    [JWT authentication]
    [Pydantic validation]
    [CORS for local frontend]
    ↓
[uvicorn server]
```

## Структура backend

### App (app/)
```
app/
├── main.py         # FastAPI приложение
├── core/           # Конфигурация и зависимости
│   ├── config.py
│   ├── security.py
│   └── dependencies.py
├── db/             # База данных
│   ├── base.py
│   └── session.py
├── models/         # SQLAlchemy модели
│   ├── user.py
│   ├── student_profile.py
│   ├── teacher_profile.py
│   └── teacher_student.py
├── schemas/        # Pydantic схемы
│   └── auth.py
├── services/       # Бизнес-логика
│   └── auth_service.py
├── scripts/        # Локальные utility/seed scripts
│   ├── create_teacher_user.py
│   └── seed_profile_data.py
└── api/v1/         # API endpoints
    ├── health.py
    └── auth.py
```

## Структура приложения

### App Router (src/app/)
```
app/
├── layout.tsx      # Root layout с метаданными и стилями
├── page.tsx        # Главная страница (/)
├── login/page.tsx
├── register/page.tsx
├── teacher/page.tsx
├── student/page.tsx # Student dashboard entrypoint
├── globals.css     # Глобальные стили (Tailwind)
└── [другие маршруты]
```

### Компоненты (src/components/)
Место для переиспользуемых React компонентов
```
components/
├── auth/
├── layout/
│   ├── Header.tsx
│   └── Footer.tsx
├── student/
│   └── StudentDashboard.tsx
└── teacher/
    └── TeacherDashboard.tsx
```

### Утилиты (src/lib/)
Вспомогательные функции и константы
```
lib/
├── authApi.ts      # Запросы register/login/me
├── authRedirect.ts # Redirect по роли
├── authStorage.ts  # Хранение access token
├── authValidators.ts
└── [другие helpers]
```

## Data Flow auth + persistence

```
User Browser
    ↓
React auth pages (`/register`, `/login`)
    ↓
`authApi.ts`
    ↓
FastAPI auth endpoints
    ↓
`/register` → создаёт пользователя
`/login` → возвращает access token
`/me` → возвращает текущего пользователя по Bearer token
    ↓
SQLAlchemy ORM
    ↓
PostgreSQL
    ↓
Browser storage (`localStorage` или `sessionStorage`)
    ↓
Redirect по роли (`/student` или `/teacher`)
    ↓
`/student` или `/teacher` выполняет `getAccessToken()` и `GET /api/v1/auth/me`
    ↓
Role check:
- `student` → dashboard UI
- `teacher` → redirect на `/teacher`
- нет токена / токен невалиден → redirect на `/login`
```

## Масштабируемость

Текущая структура подготовлена к расширению:
- **Компоненты** легко добавлять в src/components
- **Утилиты** организованы в src/lib
- **Path alias** (`@/*`) позволяет чистые импорты независимо от глубины папок

## Persistence Layer

- `frontend/src/app/register/page.tsx` отправляет JSON на `POST /api/v1/auth/register`.
- `frontend/src/app/login/page.tsx` отправляет JSON на `POST /api/v1/auth/login`.
- После логина frontend делает `GET /api/v1/auth/me` с `Authorization: Bearer <token>`.
- Auth persistence теперь использует PostgreSQL вместо SQLite.
- Alembic управляет версионированием схемы БД.
- Первая миграция создаёт:
  - `users`
  - `student_profiles`
  - `teacher_profiles`
  - `teacher_students`
- `student_profiles.user_id` и `teacher_profiles.user_id` задают one-to-one профиль к пользователю.
- `teacher_students` хранит teacher ↔ student linkage через два FK на `users.id`.
- Для локальной проверки добавлен seed `backend/scripts/seed_profile_data.py`.
- На backend сохранён существующий auth API contract.
- На backend включён CORS для локального frontend.

## Что ещё не реализовано

- refresh tokens;
- централизованный auth state;
- protected routes через middleware;
- profile read/write endpoints;
- frontend integration новых profile-данных;
- MinIO avatar storage;
- materials/tests persistence;
- assistant persistence.
