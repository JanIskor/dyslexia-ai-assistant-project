# Архитектура проекта

## Обзор

Проект разрабатывается как современная веб-система для адаптации образовательных текстов к потребностям людей с дислексией.

## Текущая фаза: Auth Integration

На этом этапе frontend auth UI соединён с backend auth API в минимальный рабочий MVP flow.

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
├── globals.css     # Глобальные стили (Tailwind)
└── [в будущем - другие маршруты]
```

### Компоненты (src/components/)
Место для переиспользуемых React компонентов
```
components/
├── Button.tsx
├── Input.tsx
├── Header.tsx
└── [другие компоненты]
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

### Hooks (src/hooks/)
Пользовательские React hooks
```
hooks/
├── useAuth.ts      # [в будущем]
└── [другие hooks]
```

### Типы (src/types/)
TypeScript типы и интерфейсы
```
types/
├── index.ts        # Основные типы
└── api.ts          # [типы для API - когда будет backend]
```

## Жизненный цикл приложения

```
1. Пользователь открывает приложение
   ↓
2. Next.js загружает layout.tsx (язык, шрифты, стили)
   ↓
3. Next.js загружает page.tsx (главная страница)
   ↓
4. На экране отображается минималистичная главная страница
   ↓
5. На будущих шагах:
   - Добавляются интерактивные компоненты
   - Подключается API backend
   - Реализуется авторизация
   - Реализуется функциональность адаптации текстов
```

## Data Flow auth integration

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
```

## Масштабируемость

Текущая структура подготовлена к расширению:
- **Компоненты** легко добавлять в src/components
- **Утилиты** организованы в src/lib
- **Типы** централизованы в src/types
- **Hooks** отделены в src/hooks для переиспользования
- **Path alias** (`@/*`) позволяет чистые импорты независимо от глубины папок

## Auth Integration

- `frontend/src/app/register/page.tsx` отправляет JSON на `POST /api/v1/auth/register`.
- `frontend/src/app/login/page.tsx` отправляет JSON на `POST /api/v1/auth/login`.
- После логина frontend делает `GET /api/v1/auth/me` с `Authorization: Bearer <token>`.
- Токен сохраняется минимальным MVP-способом:
  - `localStorage` при включённом «Запомнить меня»;
  - `sessionStorage` в остальных случаях.
- Redirect по роли реализован без middleware и глобального auth context:
  - `student` → `/student`
  - `teacher` → `/teacher`
- На backend включён CORS для локального frontend.

## Что ещё не реализовано

- refresh tokens;
- централизованный auth state;
- protected routes через middleware;
- автоматическая проверка токена при открытии приложения.
