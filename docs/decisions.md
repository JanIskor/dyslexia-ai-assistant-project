# Архитектурные решения

## Frontend Stack

### Выбран стек
- **Next.js 16** (App Router) - современный React фреймворк с встроенной поддержкой SSR/SSG
- **TypeScript** - для типобезопасности и лучшей разработческой опытности
- **Tailwind CSS** - утилитарный CSS фреймворк для быстрой разработки UI
- **ESLint** - проверка качества кода с конфигом Next.js
- **Prettier** - автоматическое форматирование кода

### Почему эти технологии

#### Next.js + App Router
- App Router (новая версия) обеспечивает лучшую производительность и DX
- Встроенная поддержка `layout.tsx` позволяет управлять структурой страниц
- Подготовлено к API Routes на будущих этапах
- Хорошая экосистема и документация

#### TypeScript
- Обеспечивает типобезопасность на уровне кода
- Улучшает читаемость и поддерживаемость
- Необходима для масштабируемого проекта

#### Tailwind CSS
- Быстрая разработка UI без написания CSS по отдельности
- Встроенная утилитарная система, не требующая дополнительных зависимостей
- Легко кастомизируется при необходимости

#### ESLint + Prettier
- Автоматическое соблюдение стандартов кода
- Улучшает командную разработку
- Позволяет избежать стилистических дебатов

## Backend Stack

### Выбран стек
- **FastAPI** - современный Python фреймворк для API
- **SQLAlchemy** - ORM для работы с базой данных
- **PostgreSQL** - основная база данных проекта
- **Alembic** - миграции схемы
- **Pydantic** - валидация данных и схемы
- **passlib** - хеширование паролей
- **python-jose** - работа с JWT токенами

### Почему эти технологии

#### FastAPI
- Высокая производительность (на основе Starlette)
- Автоматическая генерация OpenAPI документации
- Встроенная поддержка асинхронности
- Хорошая интеграция с Pydantic

#### SQLAlchemy
- Мощная и гибкая ORM
- Поддержка миграций через Alembic
- Широко используется в Python экосистеме

#### PostgreSQL
- Подходит для реальной relational schema со связями teacher ↔ student
- Даёт предсказуемую persistence layer для следующих шагов
- Хорошо сочетается с Alembic и product-level migration flow

#### Pydantic
- Валидация данных с понятными ошибками
- Автоматическая генерация схем
- Интеграция с FastAPI

#### JWT для аутентификации
- Стандартный подход для stateless аутентификации
- Поддержка expiration токенов
- Легко расширяемо до refresh tokens

## Структура backend проекта

### Папки и их назначение
```
backend/
├── app/
│   ├── main.py        # Точка входа FastAPI
│   ├── core/          # Конфигурация и общие зависимости
│   ├── db/            # Настройки базы данных
│   ├── models/        # SQLAlchemy модели
│   ├── schemas/       # Pydantic схемы
│   ├── services/      # Бизнес-логика
│   ├── repositories/  # Доступ к данным (для будущего)
│   └── api/v1/        # API endpoints
├── requirements.txt   # Зависимости Python
└── README.md          # Документация
```

### Импорты
- Используется path alias `@/*` для удобных импортов
- Пример: `import { Button } from '@/components/Button'`

## Решения шага 2.3: Auth Integration

### Минимальный frontend API client
- Для auth интеграции добавлен небольшой слой `frontend/src/lib/authApi.ts`.
- Причина: этого достаточно для `register/login/me`, без глобального SDK и без лишней абстракции.

### Хранение токена в browser storage
- `access_token` хранится на клиенте.
- Если выбран флажок «Запомнить меня», используется `localStorage`.
- Если флажок не выбран, используется `sessionStorage`.
- Причина: это минимальный и прозрачный MVP-вариант без cookies и refresh token flow.

### Redirect определяется через `/me`, а не через локальный decode JWT
- После логина frontend всегда делает `GET /api/v1/auth/me`.
- Redirect выбирается по фактическому ответу backend.
- Причина: так frontend опирается на существующий backend API и не дублирует auth-логику.

### Backend изменён только в части CORS
- Для браузерной интеграции включён `CORSMiddleware`.
- Auth endpoints и их контракты не менялись.
- Причина: это минимальное необходимое изменение, чтобы frontend мог вызывать backend из браузера локально.

## Намеренно НЕ реализовано на этом шаге

### Функциональность
- Refresh tokens
- Forgot-password backend flow
- Reset password
- Полноценные protected routes
- Глобальный auth context / store
- Автовосстановление сессии при старте приложения
- Адаптация текстов
- Dashboard и сложные страницы

### Архитектурные решения
- Глобальное состояние (Redux, Zustand, Context) не добавлялось без необходимости
- Middleware auth guard отложен до появления реальных защищённых маршрутов
- Более сложная session architecture отложена до следующего этапа

## Решения шага 3.1.1: Student Dashboard UI

### Одна страница `/student` без nested routing
- Student dashboard реализован в рамках одного маршрута `/student`.
- Переключение между `Мой профиль`, `Учебные материалы`, `Мои тесты` построено через локальное React state.
- Причина: это соответствует ТЗ текущего шага и не добавляет лишнюю маршрутизацию.

### Auth-check оставлен локальным для student page
- При открытии `/student` используется уже существующий `getAccessToken()` и `getCurrentUser()`.
- При отсутствии токена пользователь перенаправляется на `/login`.
- При роли, отличной от `student`, используется существующий `getRoleRedirectPath`.
- Причина: это минимально достаточное решение без глобального auth store и без переписывания auth flow.

### Logout реализован через очистку существующего token storage
- Logout очищает `localStorage` и `sessionStorage` через `clearAccessToken()`.
- После этого выполняется redirect на `/login`.
- Причина: в текущем MVP дополнительных frontend auth-данных нет, поэтому отдельный logout endpoint не требуется.

### Общий `Header.tsx` расширен через лёгкий variant API
- `Header.tsx` по умолчанию сохраняет прежнее поведение для auth-страниц.
- Для student dashboard добавлен вариант `variant="dashboard"` с центральным заголовком и правым слотом.
- Причина: это позволяет использовать общий layout-компонент без поломки существующего UI и без создания сложной системы layout overrides.

### Контент student dashboard пока частично статический
- Профиль отображает захардкоженные данные, близкие к референсу.
- Разделы материалов и тестов реализованы как placeholders.
- Причина: на шаге 3.1.1 цель ограничена UI-слоем без backend-расширений и без преждевременной бизнес-логики.

## Решения шага 3.1.2: Teacher Dashboard UI

### Одна страница `/teacher` без nested routing
- Teacher dashboard реализован в рамках одного маршрута `/teacher`.
- Переключение между `Мой профиль`, `Список учеников`, `ИИ-ассистент` построено через локальное React state.
- Причина: это соответствует ТЗ текущего шага и сохраняет простую структуру, как у student dashboard.

### Teacher dashboard построен по тому же auth-паттерну, что и student dashboard
- При открытии `/teacher` используется существующий `getAccessToken()` и `getCurrentUser()`.
- При отсутствии токена пользователь перенаправляется на `/login`.
- При роли, отличной от `teacher`, используется существующий `getRoleRedirectPath`.
- Причина: это позволяет не переписывать auth flow и не вводить лишнюю архитектурную сложность.

### Для локальной проверки teacher flow добавлен только utility, а не публичная teacher-регистрация
- Создан `backend/scripts/create_teacher_user.py`, который создаёт или обновляет локального teacher-пользователя в основной БД проекта.
- Endpoint `/register` не менялся и по-прежнему создаёт только `student`.
- Причина: teacher должен быть проверяем локально через login, но не должен появляться через публичную регистрацию.

### Контент teacher dashboard пока частично статический
- Профиль преподавателя отображает захардкоженные данные по макету.
- Разделы списка учеников и ИИ-ассистента реализованы как placeholders.
- Причина: на шаге 3.1.2 задача ограничена UI и локальной проверкой teacher flow без внедрения реальных product-данных.

## Решения шага 3.2.1: PostgreSQL migration + profile schema

### PostgreSQL стал единственной основной persistence layer
- Значение `DATABASE_URL` переведено на PostgreSQL по умолчанию.
- SQLite больше не используется как основная рабочая БД backend.
- Причина: следующая продуктовая схема и связи teacher ↔ student должны жить в одной реальной relational database.

### Управление схемой переведено на Alembic
- Автоматическое `Base.metadata.create_all(...)` убрано из `app.main`.
- Схема БД создаётся и обновляется через Alembic migration history.
- Причина: для PostgreSQL и дальнейшего развития схемы нужен контролируемый migration flow вместо неявного auto-create.

### Product-level profile schema сведена к четырём таблицам без лишнего расширения
- Добавлены только:
  - `users`
  - `student_profiles`
  - `teacher_profiles`
  - `teacher_students`
- Причина: это минимальный foundation для следующего этапа без premature abstraction.

### UUID используется как primary key во всех таблицах
- Все PK и профильные FK завязаны на UUID.
- Причина: это даёт единый формат идентификаторов и хорошо сочетается с PostgreSQL и будущими интеграциями.

### Роль хранится как string, но ограничивается backend/database validation
- Поле `users.role` оставлено строковым.
- Для него добавлен `CHECK` constraint на значения `student` и `teacher`.
- Причина: это соответствует ТЗ и не требует вводить отдельный enum layer на текущем шаге.

### Локальный seed сделан простым utility, а не framework
- Добавлен `scripts/seed_profile_data.py`.
- Script создаёт или обновляет одного teacher, одного student, их профили и связь teacher ↔ student.
- Причина: этого достаточно для локальной проверки PostgreSQL schema и auth persistence без overengineering.

## Решения шага 3.2.2: Teacher Students API

### Teacher-only доступ вынесен в dependency
- Добавлен `get_current_teacher` поверх существующего `get_current_user`.
- Teacher endpoint без teacher-роли получает `403`.
- Причина: это минимально достаточный и переиспользуемый способ ограничить teacher area без новой auth architecture.

### Teacher видит только своих учеников через `teacher_students`
- Оба endpoint делают выборку только через связь `teacher_students.teacher_user_id -> current_teacher.id`.
- Причина: это отражает предметную модель и предотвращает доступ к чужим student records на уровне query logic.

### Для карточки чужого ученика возвращается `404`, а не `403`
- Если teacher запрашивает student profile, который не связан с ним через `teacher_students`, API отвечает `404 Student not found`.
- Причина: endpoint не раскрывает наличие чужого ученика вне teacher scope.

### Response schemas сведены к минимально нужным полям
- Для списка и детальной карточки созданы отдельные Pydantic schema.
- Причина: endpoint не возвращает лишние user/system поля и следует ТЗ текущего шага.

## Решения шага 3.2.3.1: Frontend Integration Teacher Students

### Teacher students integration встроена в существующий `/teacher`, без новых маршрутов
- Раздел `Список учеников` реализован внутри уже существующего `TeacherDashboard`.
- Переключение между grid списка и profile view ученика сделано через локальный React state.
- Причина: это соответствует ТЗ шага и сохраняет teacher dashboard как единый экран.

### Для teacher students добавлен минимальный API client без новой frontend-архитектуры
- Добавлен `frontend/src/lib/teacherStudentsApi.ts` с двумя GET-запросами:
  - `/api/v1/teacher/students`
  - `/api/v1/teacher/students/{student_id}`
- Запросы используют существующий Bearer token из `authStorage`.
- Причина: это достаточно для текущего шага и не требует глобального data layer.

### Auth flow не дублируется и не переписывается
- Teacher dashboard по-прежнему использует существующий `getAccessToken()` и `getCurrentUser()` для auth-check.
- Students API вызывается только после успешной teacher-проверки.
- Причина: это сохраняет уже работающий auth flow и исключает расхождение логики.

### Ошибки students API отображаются как локальные UI states
- Для списка реализованы `loading`, `error`, `empty`.
- Для detail реализованы `loading` и `error`.
- При `401/403` layout teacher dashboard остаётся целым, а пользователь видит error state вместо падения страницы.
- Причина: шаг требует мягкую обработку ошибок без переизобретения auth-механики.

### Detail view использует student-like profile composition
- Карточка выбранного ученика повторяет композицию student profile view:
  - avatar
  - full name
  - quote
  - birth date
  - gender
  - grade label
  - enrollment date
- Причина: это соответствует референсу и позволяет переиспользовать уже принятый визуальный паттерн без новой дизайн-системы.

### Поиск и фильтрация намеренно не добавлялись
- В верхней части списка учеников не добавлялись input и filter controls.
- Причина: они относятся к следующему шагу 3.2.3.2 и сознательно не смешивались с интеграцией реальных данных.

## Решения шага 3.2.3.2: Teacher Students Search And Sort

### Teacher students list остался на существующем endpoint без новых маршрутов
- Для поиска и сортировки расширен существующий `GET /api/v1/teacher/students`.
- Добавлены только query params:
  - `search`
  - `sort_by`
  - `sort_order`
- Причина: это минимально достаточное изменение API без нового route surface.

### Поиск ограничен первым словом `full_name`
- Backend ищет только по `split_part(full_name, ' ', 1)`.
- Это означает поиск только по фамилии, без матчинга имени и отчества.
- Причина: ТЗ текущего шага требует именно surname-only search и явно запрещает искать по остальным частям ФИО.

### Поиск реализован как case-insensitive substring match
- Backend использует `ILIKE` по первому слову ФИО.
- Поиск работает по одной букве и по части фамилии.
- Причина: это соответствует ожидаемому UX и не требует отдельного полнотекстового поиска.

### Сортировка по классу реализована как натуральная, а не строковая
- Для `grade_label` backend извлекает:
  - числовую часть класса
  - буквенную часть класса
- Сначала сортируется число, затем буква.
- Причина: строковая сортировка нарушила бы школьный порядок, например `11А` встала бы раньше `2А`.

### Frontend продолжает использовать локальный state teacher dashboard
- Поиск, выбранный режим сортировки и открытый detail view управляются в `TeacherDashboard`.
- Отдельный маршрут, nested routing и глобальный store не добавлялись.
- Причина: это сохраняет уже работающую архитектуру и не добавляет избыточную сложность.

### Query params формируются на frontend API layer
- `frontend/src/lib/teacherStudentsApi.ts` собирает query string через `URLSearchParams`.
- `TeacherDashboard` передаёт туда:
  - текущее значение поиска
  - `sort_by`
  - `sort_order`
- Причина: логика формирования URL остаётся рядом с API-запросом, а UI не знает деталей сборки query string.

### UI поиска и сортировки встроен в уже существующий список учеников
- Над grid списка добавлены:
  - строка поиска по фамилии
  - компактное меню сортировки справа
- Detail view ученика и кнопка `Назад` сохранены без изменения маршрутизации.
- Причина: задача текущего шага ограничена расширением существующего teacher dashboard, а не его переписыванием.

## Решения шага 3.2.3.3: Teacher Students Pagination

### Пагинация добавлена в существующий `GET /api/v1/teacher/students`
- Новый route не создавался.
- Добавлены только query params:
  - `page`
  - `page_size`
- Причина: это минимальное расширение уже работающего списка учеников.

### Размер страницы по умолчанию зафиксирован как 9
- Backend по умолчанию использует:
  - `page=1`
  - `page_size=9`
- Причина: teacher dashboard уже построен на grid 3x3, поэтому 9 карточек дают ровно 3 строки по 3 карточки.

### Backend возвращает paginated response object
- Endpoint возвращает:
  - `items`
  - `total`
  - `page`
  - `page_size`
  - `pages`
- Причина: frontend должен знать число страниц и текущее положение без дополнительных вычислений по всей выборке.

### На backend используется limit/offset без дополнительного усложнения
- После teacher scope, поиска и сортировки backend считает `total`, затем применяет `offset` и `limit`.
- Причина: этого достаточно для текущего MVP и не требует cursor pagination.

### Frontend переключает страницы внутри существующего teacher dashboard
- Pagination UI встроен под grid карточек.
- Teacher остаётся на `/teacher`.
- Detail view ученика и кнопка `Назад` продолжают работать в той же правой панели.
- Причина: текущий шаг ограничен именно pagination списка, без переработки маршрутизации.

## Решения шага 3.2.4.1: Admin Role Foundation

### Роль `admin` добавлена в существующую role model, без отдельного enum layer
- Поле `users.role` осталось строковым.
- Database/model constraint расширен до значений `student`, `teacher`, `admin`.
- JWT, `/auth/login`, `/auth/me` и `get_current_user` не переписывались, потому что уже работают с ролью как со строкой.
- Причина: это минимальное изменение, которое расширяет текущую auth-модель без новой архитектуры.

### Публичная регистрация не расширялась на admin
- `POST /api/v1/auth/register` по-прежнему всегда создаёт только `student`.
- Для dev-проверки добавлен отдельный utility `backend/scripts/create_admin_user.py`.
- Причина: admin не должен появляться через публичный flow.

### Admin-only доступ вынесен в отдельную dependency
- Добавлен `get_current_admin` поверх существующего `get_current_user`.
- Для реальной backend-проверки добавлен минимальный endpoint `GET /api/v1/admin/access-check`.
- Причина: это foundation для следующих admin API без внедрения бизнес-логики заявок уже сейчас.

### Redirect by role остался централизованным
- Frontend продолжает определять целевой dashboard после логина через `GET /api/v1/auth/me`.
- Общий helper `getRoleRedirectPath` теперь поддерживает:
  - `student` → `/student`
  - `teacher` → `/teacher`
  - `admin` → `/admin`
- Причина: один источник истины для role-based redirect сохраняет уже работающий auth flow.

### Маршрут `/admin` защищён тем же локальным auth-паттерном, что и остальные dashboard
- `AdminDashboard` использует существующие `getAccessToken()`, `getCurrentUser()` и `clearAccessToken()`.
- Без токена происходит redirect на `/login`.
- Пользователь с ролью `student` или `teacher` получает redirect на свой dashboard, а не доступ в admin area.
- Причина: это консистентно со student/teacher dashboard и не требует middleware или глобального auth store.

### Admin dashboard ограничен skeleton UI
- Добавлен только один маршрут `/admin` и локальный sidebar state.
- Правая часть показывает placeholder для `Заявки учеников`.
- Отдельный admin profile, moderation flow, notifications logic и CRUD намеренно не реализовывались.
- Причина: шаг ограничен foundation роли администратора внутри уже существующего продукта.
