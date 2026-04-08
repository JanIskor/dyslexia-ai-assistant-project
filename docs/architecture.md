# Архитектура проекта

## Обзор

Проект разрабатывается как современная веб-система для адаптации образовательных текстов к потребностям людей с дислексией.

## Текущая фаза: Admin Role Foundation

На текущем этапе frontend auth flow, dashboard UI, PostgreSQL schema layer, teacher-only API и teacher students frontend integration уже реализованы. Поверх этого добавлен foundation для третьей системной роли `admin` без внедрения бизнес-логики заявок.

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
│   ├── auth.py
│   └── teacher_students.py
├── services/       # Бизнес-логика
│   ├── auth_service.py
│   └── teacher_students_service.py
├── scripts/        # Локальные utility/seed scripts
│   ├── create_teacher_user.py
│   ├── create_admin_user.py
│   └── seed_profile_data.py
└── api/v1/         # API endpoints
    ├── admin.py
    ├── health.py
    ├── auth.py
    └── teacher.py
```

## Структура приложения

### App Router (src/app/)
```
app/
├── layout.tsx      # Root layout с метаданными и стилями
├── page.tsx        # Главная страница (/)
├── login/page.tsx
├── register/page.tsx
├── admin/page.tsx
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
├── admin/
│   └── AdminDashboard.tsx
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
├── teacherStudentsApi.ts # Запросы teacher students list/detail
├── authValidators.ts
└── [другие helpers]
```

## Data Flow teacher students frontend

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
`/teacher/students` → список учеников текущего teacher
`/teacher/students/{student_id}` → карточка конкретного ученика текущего teacher
    ↓
SQLAlchemy ORM
    ↓
PostgreSQL
    ↓
Browser storage (`localStorage` или `sessionStorage`)
    ↓
Redirect по роли (`/student`, `/teacher` или `/admin`)
    ↓
`/student`, `/teacher` или `/admin` выполняет `getAccessToken()` и `GET /api/v1/auth/me`
    ↓
Role check:
- `student` → dashboard UI
- `teacher` → redirect на `/teacher`
- `admin` → redirect на `/admin`
- нет токена / токен невалиден → redirect на `/login`
    ↓
Teacher dashboard (`frontend/src/components/teacher/TeacherDashboard.tsx`)
    ↓
Выбор sidebar-пункта `Список учеников`
    ↓
`teacherStudentsApi.ts` делает `GET /api/v1/teacher/students` с Bearer token
и query params:
- `search`
- `sort_by`
- `sort_order`
- `page`
- `page_size`
    ↓
В правой панели отображается:
- loading state списка
- error state списка
- empty state списка
- search input по фамилии
- меню сортировки
- grid карточек учеников
- pagination UI
    ↓
Клик по карточке
    ↓
`teacherStudentsApi.ts` делает `GET /api/v1/teacher/students/{student_id}`
    ↓
В той же правой панели отображается student-like profile view
    ↓
Кнопка `Назад` возвращает локальный view state к grid списка
```

## Масштабируемость

Текущая структура подготовлена к расширению:
- **Компоненты** легко добавлять в src/components
- **Утилиты** организованы в src/lib
- **Path alias** (`@/*`) позволяет чистые импорты независимо от глубины папок

## Teacher Students Frontend

- `frontend/src/app/register/page.tsx` отправляет JSON на `POST /api/v1/auth/register`.
- `frontend/src/app/login/page.tsx` отправляет JSON на `POST /api/v1/auth/login`.
- После логина frontend делает `GET /api/v1/auth/me` с `Authorization: Bearer <token>`.
- Раздел `Список учеников` в `TeacherDashboard.tsx` не создаёт отдельный маршрут и работает внутри `/teacher`.
- Для teacher students frontend добавлен минимальный API client `frontend/src/lib/teacherStudentsApi.ts`.
- Список учеников запрашивается только после открытия teacher-секции `students`.
- Список учеников может быть перезапрошен с query params:
  - `search`
  - `sort_by`
  - `sort_order`
  - `page`
  - `page_size`
- Backend возвращает paginated response:
  - `items`
  - `total`
  - `page`
  - `page_size`
  - `pages`
- На teacher dashboard одна страница ограничена 9 карточками:
  - 3 карточки в строке
  - 3 ряда
- Поиск ограничен только первым словом `full_name`, потому что в предметной модели этот фрагмент соответствует фамилии.
- Сортировка `full_name` использует обычный порядок строки ФИО, что даёт порядок по фамилии.
- Сортировка `grade_label` использует натуральный порядок:
  - сначала номер класса
  - затем букву класса
- Detail view ученика хранится в локальном state teacher dashboard и не использует nested routing.
- Карточки учеников строятся из реальных backend-полей:
  - `avatar_url`
  - `full_name`
  - `grade_label`
- Detail view показывает:
  - `avatar_url`
  - `full_name`
  - `quote`
  - `birth_date`
  - `gender`
  - `grade_label`
  - `enrollment_date`
- Если `avatar_url` отсутствует, frontend отображает placeholder avatar.
- Для списка реализованы состояния:
  - loading
  - error
  - empty
- Для пустого результата поиска frontend показывает отдельный empty state:
  - `По вашему запросу ученики не найдены`
- Для detail реализованы состояния:
  - loading
  - error
- Ошибки `401/403` на students endpoints не ломают layout: teacher dashboard остаётся на экране и показывает error state.
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
- `app/core/dependencies.py` содержит teacher-only guard `get_current_teacher` и admin-only guard `get_current_admin`.
- `app/services/teacher_students_service.py` инкапсулирует выборку учеников teacher.
- `GET /api/v1/admin/access-check` даёт минимальную backend-проверку admin-only доступа без добавления бизнес-логики.
- `GET /api/v1/teacher/students` возвращает:
  - `id`
  - `full_name`
  - `grade_label`
  - `avatar_url`
- `GET /api/v1/teacher/students` дополнительно поддерживает:
  - `search`
  - `sort_by`
  - `sort_order`
  - `page`
  - `page_size`
- `GET /api/v1/teacher/students` возвращает paginated object:
  - `items`
  - `total`
  - `page`
  - `page_size`
  - `pages`
- `GET /api/v1/teacher/students/{student_id}` возвращает:
  - `id`
  - `full_name`
  - `birth_date`
  - `gender`
  - `grade_label`
  - `enrollment_date`
  - `quote`
  - `avatar_url`
- Teacher получает только своих учеников за счёт join по `teacher_students.teacher_user_id`.

## Что ещё не реализовано

- refresh tokens;
- централизованный auth state;
- protected routes через middleware;
- profile write endpoints;
- frontend integration новых profile-данных;
- MinIO avatar storage;
- materials/tests persistence;
- assistant persistence;
- student applications workflow;
- moderation actions for admin;
- teacher assignment flow;
- admin profile management;
- выбор конкретных классов или множественные фильтры для teacher students list.
- cursor/infinite pagination для teacher students list.
