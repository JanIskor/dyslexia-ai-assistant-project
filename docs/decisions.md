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

## Решения шага 3.2.4.10: Notification Routing And Read-Flow Polish

### Уведомление связано не с frontend-компонентом, а с product target metadata
- В `notifications` добавлены `target_view`, `action_key`, `target_id`.
- Причина: backend описывает intent перехода, а frontend сам переводит его в конкретный route/query params без жёсткой привязки к внутренним React state names.

### Dropdown показывает только unread
- `GET /api/v1/notifications` получил параметр `only_unread`.
- Bell dropdown теперь всегда запрашивает только непрочитанные уведомления.
- Причина: прочитанные элементы не должны повторно захламлять компактный header UI.

### Read + navigate и read only разведены в два независимых user action
- Клик по основной области уведомления делает `POST /read`, затем `router.push(...)`.
- Кнопка `Прочитать` делает только `POST /read`.
- Причина: пользователь должен явно различать «открыть связанное место» и «просто убрать уведомление».

### Routing сделан через query params существующих dashboard routes
- Используются `/admin`, `/teacher`, `/student` с query params вроде `tab` и `applicationId` / `studentId`.
- Причина: это даёт deep-link-like поведение без nested routing, отдельного notification center и переписывания dashboard layout.

## Решения шага 3.2.4.11: Teacher-To-Student Communication Foundation

### Teacher message хранится отдельно от notifications
- Добавлена таблица `teacher_student_messages`.
- Причина: сообщение преподавателя является самостоятельной доменной сущностью с собственным read-state, а notification здесь играет только роль delivery signal.

### Teacher может писать только ученику из своей текущей связки
- Перед созданием сообщения backend проверяет наличие записи в `teacher_students`.
- Причина: это минимальная и достаточная бизнес-валидация без нового permission layer.

### Student messages вынесены в отдельную вкладку dashboard, а не в notifications dropdown
- Sidebar student dashboard получил раздел `Сообщения`, где есть список и detail-view.
- Причина: содержательные teacher сообщения длиннее обычных уведомлений и требуют отдельного места для чтения.

### Открытие сообщения автоматически помечает его прочитанным
- При загрузке detail-view frontend вызывает `POST /student/messages/{id}/read`, если сообщение ещё не прочитано.
- Причина: это делает UX ближе к обычной inbox-модели без отдельней кнопки внутри message detail.

### Notifications routing переиспользован вместо нового messaging router
- Notification `teacher_message_received` ведёт в существующий `/student` route с `tab=messages&messageId=...`.
- Причина: это сохраняет уже принятый query-param подход и не требует переписывать dashboard layout или вводить nested routes.

### Для `useSearchParams` оставлены существующие client dashboards
- `/admin`, `/teacher`, `/student` page entrypoints обёрнуты в `Suspense`.
- Причина: это минимальная совместимая интеграция с App Router без redesign страниц.

### Dropdown layering поднят в отдельный верхний stacking layer
- `Header` и `NotificationsBell` получили более высокий stacking context.
- Причина: bell dropdown должен гарантированно перекрывать поиск, карточки и прочие dashboard elements, а не конкурировать с ними по случайным локальным `z-index`.

### Teacher assignment modal прокручивает только список преподавателей
- header и footer оставлены в фиксированных секциях modal;
- средняя часть со списком teacher options вынесена в отдельный scroll container;
- при открытом modal прокрутка `body` блокируется.
- Причина: длинный список преподавателей должен оставаться удобным и не сдвигать CTA/заголовок, а страница под modal не должна «уезжать».

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

## Решения шага 3.2.4.2: Student Profile Moderation Foundation

### Student area поддерживает два режима без новых маршрутов
- Маршрут `/student` сохранён как единая точка входа.
- Режим `onboarding` используется для student без назначенного преподавателя.
- Режим `regular` используется для student, у которого уже есть связь в `teacher_students`.
- Причина: это даёт предсказуемое поведение без отдельной сложной router-архитектуры.

### Режим student определяется через уже существующую teacher-student связь
- `GET /api/v1/student/profile` возвращает `student_mode`.
- `student_mode = regular`, если у student есть запись в `teacher_students`.
- Иначе возвращается `student_mode = onboarding`.
- Причина: это переиспользует уже существующую предметную модель и не требует новых сущностей.

### Moderation flow по-прежнему опирается только на два статуса
- В `student_profiles` добавлены:
  - `profile_status`
  - `submitted_at`
- На текущем шаге используются только значения:
  - `draft`
  - `submitted`
- Причина: этого достаточно для foundation без преждевременного внедрения moderation state machine.

### Draft-profile создаётся автоматически при первом обращении student
- Публичная регистрация по-прежнему создаёт только `User` с ролью `student`.
- `GET /api/v1/student/profile` создаёт пустой draft-profile, если запись ещё не существует.
- Причина: новый student должен сразу попадать в onboarding flow без отдельного seed или скрытого init endpoint.

### Student редактирует только ограниченный набор полей
- `PATCH /api/v1/student/profile` поддерживает только:
  - `full_name`
  - `birth_date`
  - `gender`
  - `quote`
- `grade_label` и `enrollment_date` остаются read-only и не принимаются API.
- Причина: эти поля относятся к дальнейшему внутреннему workflow, а не к self-service onboarding student.

### Submit отделён от простого сохранения draft
- Draft сохраняется через `PATCH /api/v1/student/profile`.
- Отправка на модерацию делается отдельным `POST /api/v1/student/profile/submit`.
- Submit возможен только если заполнены:
  - `full_name`
  - `birth_date`
  - `gender`
- Причина: это явно разделяет редактирование черновика и финальную отправку.

### После submit профиль становится read-only и на backend, и на frontend
- Backend запрещает `PATCH` для профиля со статусом `submitted`.
- Frontend в статусе `submitted` скрывает submit-кнопку и делает moderation-form read-only.
- Причина: read-only поведение не должно зависеть только от клиентского UI.

### Regular student получает обычный dashboard и отдельную вкладку редактирования
- В `regular` mode sidebar содержит:
  - `Мой профиль`
  - `Учебные материалы`
  - `Мои тесты`
  - `Редактирование профиля`
- Вкладка `Редактирование профиля` использует тот же editable screen, что и onboarding.
- Причина: активный student не должен терять доступ к обычному dashboard, но должен иметь путь для отправки profile changes на модерацию.

### Onboarding student по-прежнему ограничен moderation-flow
- В `onboarding` mode sidebar содержит только `Мой профиль`.
- До появления teacher assignment student не получает полноценный обычный dashboard.
- Причина: это следует продуктовой логике текущего шага.

## Решения шага 3.2.4.3: Admin Applications List Foundation

### Список заявок добавлен отдельным admin-only endpoint без новой сущности заявки
- Добавлен `GET /api/v1/admin/applications`.
- Источником данных остаётся существующая таблица `student_profiles`.
- Причина: на текущем шаге достаточно foundation списка, без введения отдельной `application`-модели и без усложнения схемы.

### Admin access переиспользует существующий guard
- Endpoint использует уже существующий `get_current_admin`.
- Без токена backend возвращает `401`, с ролью `student` или `teacher` возвращает `403`.
- Причина: это сохраняет единый auth/access pattern для admin API и не ломает текущий flow.

### Поиск в admin applications list приведён к той же модели, что и teacher students list
- `search` применяется только к первому слову `student_profiles.full_name`.
- Поиск реализован через case-insensitive prefix matching.
- Причина: это делает поведение поиска одинаковым между двумя списками и соответствует ТЗ доработки шага.

### UI-статус вычисляется из backend-логики через mapping layer
- Backend возвращает человекочитаемое поле `status`.
- Используются соответствия:
  - `draft` → `Новая`
  - `submitted` → `На рассмотрении`
  - `rejected` → `Отклонена`
- Причина: frontend получает готовый display-статус, а backend остаётся единым источником истины для текста статуса.

### Reject-flow не внедрялся в persistence model на этом шаге
- Текущая moderation foundation по-прежнему хранит только `draft` и `submitted`.
- Значение `rejected` зарезервировано на уровне mapping-слоя для следующего шага.
- Причина: это подготавливает контракт списка заявок к расширению, но не вводит раньше времени approve/reject lifecycle.

### Frontend встроен в существующий `/admin` dashboard без переписывания layout
- Реальный список заявок реализован только в секции `Заявки учеников`.
- Остальные admin-секции сохранены как placeholders.
- Причина: задача ограничена foundation списка заявок, а не полным редизайном admin area.

### Фильтрация ограничена статусами заявок
- Backend принимает повторяющийся query param `status`.
- Для UI добавлен отдельный lightweight endpoint `GET /api/v1/admin/applications/filters`.
- Frontend использует компактный dropdown от уже существующей кнопки фильтра.
- Причина: фильтрация уже реально работает, но остаётся простой и готовой к расширению при появлении новых статусов.

### Sidebar администратора упрощён до текстового вида
- Иконки убраны из sidebar admin dashboard.
- Оставлены только названия разделов:
  - `Заявки учеников`
  - `Преподаватели`
  - `Ученики`
- Причина: это ближе к референсу и делает левую колонку визуально спокойнее.

## Решения шага 3.2.4.4: Admin Application Detail / Review Foundation

### Детальная карточка заявки открывается внутри того же `/admin`, без нового route
- Клик по строке заявки переключает правую часть dashboard из списка в detail card.
- Возврат реализован кнопкой `Назад`, которая сбрасывает локальный selected application state.
- Причина: это сохраняет простой admin layout и не требует nested routing.

### Student data остаются read-only для admin
- В detail card admin только просматривает:
  - `full_name`
  - `birth_date`
  - `gender`
  - `quote`
  - `avatar_url`
  - `status`
- Причина: шаг ограничен review foundation и не должен превращаться в прямое редактирование student profile.

### Admin редактирует только два поля предметной модели
- `PATCH /api/v1/admin/applications/{application_id}` принимает только:
  - `grade_label`
  - `enrollment_date`
- Причина: именно эти поля по ТЗ относятся к admin review, а остальные student fields заполняет сам ученик.

### Review flow держится на четырёх рабочих статусах
- Для review flow используются:
  - `submitted`
  - `in_review`
  - `needs_completion`
  - `approved`
- `draft` остаётся внутренним состоянием student до отправки на модерацию.
- Причина: этого достаточно для базового review cycle без premature assignment logic.

### Открытие detail переводит `submitted` в `in_review`
- `GET /api/v1/admin/applications/{application_id}` при первом открытии меняет статус `submitted` на `in_review`.
- Причина: открытие detail означает начало review и позволяет списку отражать, что заявка уже взята в работу.

### Request changes и approve реализованы как отдельные action endpoints
- `POST /api/v1/admin/applications/{application_id}/request-changes` переводит заявку в `needs_completion`.
- `POST /api/v1/admin/applications/{application_id}/approve` переводит заявку в `approved`.
- Причина: отдельные action endpoints проще и чище, чем перегружать один PATCH несколькими типами переходов.

### Student снова может редактировать профиль после `needs_completion`
- Student-side backend разрешает `PATCH` и повторный submit для статуса `needs_completion`.
- Frontend student profile перестаёт быть read-only в этом статусе.
- Причина: иначе action `Отправить на доработку` был бы продуктово бесполезным.

## Решения шага 3.2.4.5: Teacher Assignment Modal Foundation

### Назначение преподавателя встроено в существующий admin detail flow
- Кнопка `Подтвердить заявку` больше не делает direct approve.
- Вместо этого она открывает modal поверх уже открытой карточки заявки.
- Причина: это соответствует ТЗ шага и не требует нового route или отдельной страницы.

### Список преподавателей для назначения отдаётся отдельным lightweight endpoint
- Добавлен `GET /api/v1/admin/teachers/assignment-options`.
- Endpoint возвращает только:
  - `teacher_user_id`
  - `full_name`
  - `subject_name`
  - `student_count`
  - `capacity`
  - `is_available`
- Причина: modal нужен компактный список без лишней teacher-detail логики.

### Лимит преподавателя зафиксирован на backend как `15`
- `capacity` на текущем шаге не настраивается и не хранится отдельно.
- Доступность считается по правилу `student_count < 15`.
- Причина: это минимально достаточный foundation без избыточной конфигурации.

### Назначение преподавателя создаёт связь `teacher_students` и переводит заявку в `approved`
- Добавлен `POST /api/v1/admin/applications/{application_id}/assign-teacher`.
- Endpoint:
  - проверяет teacher;
  - считает текущую нагрузку;
  - блокирует переполненного teacher;
  - создаёт связь `teacher_user_id ↔ student_user_id`;
  - переводит заявку в `approved`.
- Причина: на текущем шаге финальное подтверждение заявки происходит только вместе с teacher assignment.

### Недоступный преподаватель блокируется и во frontend, и на backend
- Во frontend преподаватель с `15/15` рендерится disabled.
- Backend повторно валидирует загрузку перед сохранением связи.
- Причина: UI делает ограничение понятным, а backend остаётся источником истины.

### Уведомления, email и teacher-side workflow намеренно не внедрялись
- Assignment не создаёт notifications, email или очередь teacher review.
- Причина: это уже следующий этап и не относится к modal foundation.

## Решения шага 3.2.4.6: Teacher Incoming Review Foundation

### Incoming review использует три статуса поверх уже существующего assignment flow
- `approved` означает, что admin уже назначил teacher, но teacher ещё не обработал ученика.
- `teacher_accepted` означает, что teacher принял ученика.
- `teacher_rejected` означает, что teacher отклонил назначение.
- Причина: это минимальный teacher-side workflow без отдельной таблицы review событий.

### Уже существующие назначенные ученики миграцией переводятся в `teacher_accepted`
- Alembic revision `73ebec191d1f` расширяет check constraint `student_profiles`.
- Та же миграция переводит исторические записи `approved` + связь в `teacher_students` в `teacher_accepted`.
- Причина: после внедрения incoming review старые активные teacher-student связи не должны внезапно стать «новыми учениками».

### Incoming students отдаются отдельным teacher-only API
- Добавлены endpoints:
  - `GET /api/v1/teacher/incoming-students`
  - `GET /api/v1/teacher/incoming-students/{student_id}`
  - `POST /api/v1/teacher/incoming-students/{student_id}/accept`
  - `POST /api/v1/teacher/incoming-students/{student_id}/reject`
- Причина: это чище, чем перегружать существующий `/teacher/students` разными режимами.

### Teacher видит только собственных incoming students
- Все incoming queries идут через join `teacher_students.teacher_user_id = current_teacher.id`.
- Incoming list/detail дополнительно ограничены `student_profiles.profile_status = approved`.
- Причина: teacher не должен видеть чужие назначения и уже обработанных учеников в incoming-разделе.

### Accept сохраняет teacher ↔ student linkage и переводит профиль в `teacher_accepted`
- После `POST /accept` связь в `teacher_students` остаётся.
- Обычный `GET /api/v1/teacher/students` теперь возвращает только `teacher_accepted`.
- Причина: после принятия ученик должен перейти из incoming-раздела в основной список учеников teacher.

### Reject удаляет связь и переводит профиль в `teacher_rejected`
- После `POST /reject` backend удаляет запись из `teacher_students`.
- Reject не требует комментария или причины.
- Причина: на текущем шаге достаточно базового отказа без возврата в сложный admin workflow.

### Sidebar teacher dashboard расширяется без переписывания страницы
- В sidebar добавлен раздел `Новые ученики`.
- Existing sections `Мой профиль`, `Список учеников`, `ИИ-ассистент` сохранены.
- Причина: шаг ограничен foundation-расширением уже существующего teacher dashboard, а не его редизайном.

### Notifications, badge counters и realtime updates остаются вне шага
- Incoming review не добавляет email, badge counters, in-app notifications или realtime sync.
- Причина: это следующий продуктовый слой и он не нужен для foundation teacher-side review.

## Решения шага 3.2.4.8: Reassignment Restrictions And Admin Application State Guards

### Detail заявки хранит текущий teacher context прямо в `student_profiles`
- В `student_profiles` добавлены:
  - `current_teacher_user_id`
  - `teacher_review_status`
- Detail response admin теперь возвращает:
  - `current_teacher_user_id`
  - `current_teacher_full_name`
  - `current_teacher_subject_name`
  - `teacher_review_status`
- Причина: admin должен видеть, кому уже отправляли ученика и чем закончился teacher review, без отдельной истории действий.

### История teacher reject хранится отдельно минимальной таблицей
- Добавлена таблица `teacher_student_rejections` с уникальной парой `teacher_user_id + student_user_id`.
- Причина: после reject активная связь из `teacher_students` удаляется, поэтому для блокировки повторного назначения тому же teacher нужен отдельный lightweight history layer.

### Reassign разрешён только после `teacher_rejected`
- `assign-teacher` допускает отправку teacher только из статусов:
  - `submitted`
  - `in_review`
  - `teacher_rejected`
- Причина: pending/accepted teacher flow не должен silently перетираться повторным назначением.

### Assignment options стали зависеть от конкретной заявки
- `GET /api/v1/admin/teachers/assignment-options` теперь принимает `application_id`.
- Для каждого teacher backend возвращает:
  - `teacher_user_id`
  - `full_name`
  - `subject_name`
  - `student_count`
  - `capacity`
  - `is_available`
  - `unavailable_reason`
- `unavailable_reason` может быть:
  - `null`
  - `full_capacity`
  - `already_rejected_this_student`
- Причина: modal должен заранее показывать, кого нельзя выбрать именно для этого ученика.

### Guard на неполный профиль остаётся backend-first и дублируется в admin detail UI
- Перед assign backend проверяет обязательные поля:
  - `full_name`
  - `birth_date`
  - `gender`
  - `grade_label`
  - `enrollment_date`
- Frontend одновременно disable'ит `Подтвердить заявку` и показывает сообщение прямо на странице заявки.
- Причина: admin должен видеть проблему до открытия modal, но backend остаётся источником истины.

### Guard на `needs_completion` показывается прямо в detail карточке
- Если заявка в статусе `needs_completion`, action `Подтвердить заявку` disabled ещё до открытия modal.
- Backend также повторно валидирует это в `assign-teacher`.
- Причина: заявка на доработке не должна попадать в teacher review flow.

### Teacher reject блокирует только конкретного teacher, а не весь reassignment flow
- После reject сохраняется `teacher_review_status = rejected`, удаляется активная связь и создаётся запись в `teacher_student_rejections`.
- Admin может назначить другого teacher.
- Teacher, который уже отказал, в modal становится disabled.
- Причина: нужен controlled reassignment без избыточного workflow возврата админу.

## Решения шага 3.2.4.9: In-App Notifications Foundation

### Notifications выделены в отдельную простую таблицу
- Добавлена таблица `notifications` с полями:
  - `id`
  - `user_id`
  - `role`
  - `type`
  - `title`
  - `message`
  - `is_read`
  - `created_at`
- Причина: нужен общий foundation для всех ролей без сложной event-driven архитектуры.

### Создание уведомлений встроено прямо в существующие service-слои
- Уведомления создаются в момент уже существующих student/admin/teacher действий.
- Причина: для текущего шага этого достаточно и это не требует отдельного event bus.

### Admin notifications рассылаются всем активным admin пользователям
- Для `student_first_submitted_profile`, `student_resubmitted_profile`, `teacher_accepted_student`, `teacher_rejected_student` используется fan-out по всем `role = admin`.
- Причина: на этом шаге не вводится отдельный ответственный admin owner.

### Header dropdown выбран как минимальный notification UX
- Bell icon в header показывает unread badge и открывает compact dropdown.
- Dropdown поддерживает:
  - список уведомлений
  - `mark as read`
  - `mark all as read`
- Причина: это самый лёгкий способ встроить notifications в уже существующие dashboards.

### Реaltime, grouping и удаление намеренно отложены
- Нет websocket/push, grouping/priorities, удаления и настроек.
- Причина: текущий шаг ограничен foundation внутренних уведомлений и badge counters.
