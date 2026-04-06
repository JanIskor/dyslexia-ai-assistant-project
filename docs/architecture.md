# Архитектура проекта

## Обзор

Проект разрабатывается как современная веб-система для адаптации образовательных текстов к потребностям людей с дислексией.

## Текущая фаза: Teacher Dashboard UI

На текущем этапе frontend auth flow уже работает end-to-end, а поверх него реализованы student и teacher dashboard UI на маршрутах `/student` и `/teacher`.

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
    [SQLite database]
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
│   └── user.py
├── schemas/        # Pydantic схемы
│   └── auth.py
├── services/       # Бизнес-логика
│   └── auth_service.py
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

## Data Flow auth + dashboards

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

## Dashboard UI

- `frontend/src/app/register/page.tsx` отправляет JSON на `POST /api/v1/auth/register`.
- `frontend/src/app/login/page.tsx` отправляет JSON на `POST /api/v1/auth/login`.
- После логина frontend делает `GET /api/v1/auth/me` с `Authorization: Bearer <token>`.
- Токен сохраняется минимальным MVP-способом:
  - `localStorage` при включённом «Запомнить меня»;
  - `sessionStorage` в остальных случаях.
- Redirect по роли реализован без middleware и глобального auth context:
  - `student` → `/student`
  - `teacher` → `/teacher`
- `frontend/src/app/student/page.tsx` рендерит `StudentDashboard`.
- `frontend/src/app/teacher/page.tsx` рендерит `TeacherDashboard`.
- `StudentDashboard` хранит активную вкладку в локальном состоянии:
  - `profile`
  - `materials`
  - `tests`
- `TeacherDashboard` хранит активную вкладку в локальном состоянии:
  - `profile`
  - `students`
  - `assistant`
- Внутри `/student` не используется nested routing.
- Внутри `/teacher` не используется nested routing.
- Верхняя панель student dashboard построена на общем `Header.tsx` через `variant="dashboard"`.
- Верхняя панель teacher dashboard использует тот же общий `Header.tsx` и тот же визуальный паттерн.
- `Footer.tsx` остаётся общим и рендерится вне карточки dashboard, поэтому естественно остаётся внизу страницы.
- Для локальной проверки teacher flow добавлен utility `backend/scripts/create_teacher_user.py`, который создаёт или обновляет пользователя с ролью `teacher` напрямую в локальной SQLite БД.
- На backend включён CORS для локального frontend.

## Что ещё не реализовано

- refresh tokens;
- централизованный auth state;
- protected routes через middleware;
- полноценные данные профиля с backend;
- реальные учебные материалы;
- реальные тесты;
- реальный список учеников;
- реальный интерфейс ИИ-ассистента;
- dashboard actions beyond logout.
