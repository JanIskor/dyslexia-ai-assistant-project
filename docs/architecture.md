# Архитектура проекта

## Обзор

Проект разрабатывается как современная веб-система для адаптации образовательных текстов к потребностям людей с дислексией.

## Текущая фаза: Admin Applications List Foundation

На текущем этапе frontend auth flow, dashboard UI, PostgreSQL schema layer, admin role foundation, teacher students integration и student profile moderation foundation уже реализованы. Поверх этого `/admin` переходит от skeleton UI к реальным данным в разделе списка заявок учеников.

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
│   ├── admin_applications.py
│   ├── student_profile.py
│   └── teacher_students.py
├── services/       # Бизнес-логика
│   ├── admin_applications_service.py
│   ├── auth_service.py
│   ├── student_profile_service.py
│   └── teacher_students_service.py
├── scripts/        # Локальные utility/seed scripts
│   ├── create_teacher_user.py
│   ├── create_admin_user.py
│   └── seed_profile_data.py
└── api/v1/         # API endpoints
    ├── admin.py
    ├── health.py
    ├── auth.py
    ├── student.py
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
├── adminApplicationsApi.ts # Запросы admin applications list
├── authApi.ts      # Запросы register/login/me
├── authRedirect.ts # Redirect по роли
├── authStorage.ts  # Хранение access token
├── studentProfileApi.ts # Запросы student self-profile
├── teacherStudentsApi.ts # Запросы teacher students list/detail
├── authValidators.ts
└── [другие helpers]
```

## Data Flow admin applications list foundation

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
`/admin/applications` → список student applications для admin
`/student/profile` → self-profile текущего student + его режим
`/student/profile` (PATCH) → сохранение draft-формы
`/student/profile/submit` → перевод draft в `submitted`
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
Admin dashboard (`frontend/src/components/admin/AdminDashboard.tsx`)
    ↓
Выбор sidebar-пункта `Заявки учеников`
    ↓
`adminApplicationsApi.ts` делает `GET /api/v1/admin/applications`
s Bearer token и необязательными query params:
- `search`
- `status`
    ↓
Backend использует `get_current_admin`
    ↓
Только `admin` получает доступ к данным
    ↓
Backend делает выборку из `student_profiles` c join на `users`
и ограничением `users.role = student`
    ↓
Поиск работает только по первому слову `student_profiles.full_name`
через case-insensitive prefix search
    ↓
Backend возвращает:
- `id`
- `full_name`
- `status`
    ↓
Статус вычисляется mapping-слоем:
- `draft` → `Новая`
- `submitted` → `На рассмотрении`
- `rejected` → `Отклонена` (зарезервировано для следующего расширения)
    ↓
В правой панели `/admin` отображается:
- search input
- compact filter dropdown по статусам
- loading state
- error state
- empty state
- список заявок
    ↓
В каждой строке:
- слева `full_name`
- справа status badge
- status badge выровнен по правому краю строки
- между строками есть небольшой визуальный отступ
    ↓
Student dashboard (`frontend/src/components/student/StudentDashboard.tsx`)
    ↓
`studentProfileApi.ts` делает `GET /api/v1/student/profile`
    ↓
Backend создаёт draft-profile автоматически, если у student его ещё нет
    ↓
Backend определяет `student_mode` по наличию связи в `teacher_students`
    ↓
Если `student_mode = onboarding`:
- доступны поля `full_name`, `birth_date`, `gender`, `quote`
- доступна кнопка `Отправить на модерацию`
- sidebar содержит только `Мой профиль`
    ↓
`PATCH /api/v1/student/profile` сохраняет только editable поля
    ↓
`POST /api/v1/student/profile/submit` проверяет обязательные поля:
- `full_name`
- `birth_date`
- `gender`
    ↓
При успехе профиль получает:
- `profile_status = submitted`
- `submitted_at = now()`
    ↓
Если `student_mode = regular`:
- student остаётся на обычном `/student` dashboard
- sidebar содержит:
  - `Мой профиль`
  - `Учебные материалы`
  - `Мои тесты`
  - `Редактирование профиля`
- вкладка `Редактирование профиля` использует тот же editable screen
- при `profile_status = submitted` edit-screen становится read-only
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

## Student Profile Moderation Foundation

- `GET /api/v1/student/profile` возвращает только профиль текущего student.
- Если `student_profile` ещё не существует, backend создаёт draft-запись автоматически.
- `GET /api/v1/student/profile` дополнительно возвращает `student_mode`:
  - `onboarding`
  - `regular`
- `student_mode` определяется по наличию назначения преподавателя через `teacher_students`.
- `PATCH /api/v1/student/profile` позволяет student менять только:
  - `full_name`
  - `birth_date`
  - `gender`
  - `quote`
- `PATCH /api/v1/student/profile` не принимает `grade_label` и `enrollment_date`.
- `POST /api/v1/student/profile/submit` доступен только для draft-profile.
- После submit backend проставляет:
  - `profile_status = submitted`
  - `submitted_at`
- После submit backend запрещает дальнейшее редактирование student profile.
- `student_profiles` теперь содержит:
  - `profile_status`
  - `submitted_at`
- Moderation UI остаётся внутри существующего маршрута `/student`.
- В `onboarding` mode sidebar содержит только `Мой профиль`.
- В `regular` mode sidebar содержит также `Учебные материалы`, `Мои тесты`, `Редактирование профиля`.
- `Редактирование профиля` использует тот же editable screen, что и onboarding flow.
- Grade и дата поступления могут отображаться, но остаются read-only.
- Avatar upload и MinIO integration на этом шаге не реализуются.

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
- `GET /api/v1/admin/applications` даёт foundation списка student applications:
  - с prefix search по фамилии
  - с фильтрацией по статусу
- `GET /api/v1/admin/applications/filters` возвращает доступные статусы для UI-фильтра.
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
- avatar upload for student onboarding;
- отдельная история версий student profile changes;
- approve/reject cycle для profile moderation;
- назначение класса и даты поступления student через продуктовый workflow;
- выбор конкретных классов или множественные фильтры для teacher students list.
- cursor/infinite pagination для teacher students list.
