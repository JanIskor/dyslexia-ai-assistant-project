import { expect, test, type Page, type Route } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';

function buildGroupedApplications() {
  return [
    ...Array.from({ length: 11 }, (_, index) => ({
      id: `initial-${index + 1}`,
      full_name: `Первичный ученик ${index + 1}`,
      status: 'Новая',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: true,
    })),
    {
      id: 'profile-update-1',
      full_name: 'Профиль Ученик',
      status: 'На рассмотрении',
      request_kind: 'profile_update',
      request_kind_label: 'Изменение профиля ученика',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: false,
    },
    {
      id: 'profile-update-approved-1',
      full_name: 'Профиль Подтверждён',
      status: 'Подтверждена',
      request_kind: 'profile_update',
      request_kind_label: 'Изменение профиля ученика',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: false,
    },
    {
      id: 'teacher-profile-update-1',
      full_name: 'Преподаватель Профиль',
      status: 'На доработке',
      request_kind: 'teacher_profile_update',
      request_kind_label: 'Изменение профиля преподавателя',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: false,
    },
    {
      id: 'needs-assignment-1',
      full_name: 'Ожидает Назначения',
      status: 'NEEDS_ASSIGNMENT',
      request_kind: 'system_assignment_event',
      request_kind_label: 'Системное событие',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: true,
    },
    {
      id: 'waiting-teacher-1',
      full_name: 'Ожидает Решения Преподавателя',
      status: 'Подтверждена',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      current_teacher_user_id: 'teacher-pending-1',
      teacher_review_status: 'Ожидает решения преподавателя',
      can_assign_teacher: true,
    },
    {
      id: 'accepted-1',
      full_name: 'Принятый Ученик',
      status: 'Принята преподавателем',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      current_teacher_user_id: 'teacher-accepted-1',
      teacher_review_status: 'Принята преподавателем',
      can_assign_teacher: true,
    },
    {
      id: 'rejected-1',
      full_name: 'Отклонённый Ученик',
      status: 'Отклонена преподавателем',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      current_teacher_user_id: null,
      teacher_review_status: 'Отклонена преподавателем',
      can_assign_teacher: true,
    },
    {
      id: 'terminal-rejected-1',
      full_name: 'Отклонённый Терминальный',
      status: 'Отклонена',
      request_kind: 'teacher_profile_update',
      request_kind_label: 'Обновление профиля преподавателя',
      current_teacher_user_id: null,
      teacher_review_status: null,
      can_assign_teacher: false,
    },
  ];
}

function buildApplicationDetail(applicationId: string) {
  const common = {
    birth_date: '2012-05-19',
    gender: 'Женский',
    quote: 'Тестовая заявка',
    avatar_url: null,
    position: null,
    phone: null,
    work_email: null,
    subject_name: null,
    grade_label: '3В класс',
    enrollment_date: '2019-09-02',
    current_teacher_subject_name: 'Русский язык',
    current_profile_full_name: null,
    current_profile_birth_date: null,
    current_profile_gender: null,
    current_profile_quote: null,
    current_profile_position: null,
    current_profile_phone: null,
    current_profile_work_email: null,
    current_profile_subject_name: null,
  };

  const details: Record<string, Record<string, unknown>> = {
    'initial-1': {
      ...common,
      id: 'initial-1',
      full_name: 'Первичный ученик 1',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      status: 'Новая',
      current_teacher_user_id: null,
      current_teacher_full_name: null,
      teacher_review_status: null,
      can_edit_admin_fields: true,
      can_assign_teacher: true,
    },
    'needs-assignment-1': {
      ...common,
      id: 'needs-assignment-1',
      full_name: 'Ожидает Назначения',
      request_kind: 'system_assignment_event',
      request_kind_label: 'Системное событие',
      status: 'NEEDS_ASSIGNMENT',
      current_teacher_user_id: null,
      current_teacher_full_name: null,
      teacher_review_status: null,
      can_edit_admin_fields: true,
      can_assign_teacher: true,
    },
    'profile-update-1': {
      ...common,
      id: 'profile-update-1',
      full_name: 'Профиль Ученик',
      request_kind: 'profile_update',
      request_kind_label: 'Обновление профиля',
      status: 'На рассмотрении',
      current_teacher_user_id: null,
      current_teacher_full_name: null,
      teacher_review_status: null,
      current_profile_full_name: 'Профиль Ученик Текущий',
      current_profile_birth_date: '2012-05-01',
      current_profile_gender: 'Женский',
      current_profile_quote: 'Текущая цитата',
      can_edit_admin_fields: false,
      can_assign_teacher: false,
    },
    'waiting-teacher-1': {
      ...common,
      id: 'waiting-teacher-1',
      full_name: 'Ожидает Решения Преподавателя',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      status: 'Подтверждена',
      current_teacher_user_id: 'teacher-pending-1',
      current_teacher_full_name: 'Педагог Ожидание',
      teacher_review_status: 'Ожидает решения преподавателя',
      can_edit_admin_fields: true,
      can_assign_teacher: true,
    },
    'accepted-1': {
      ...common,
      id: 'accepted-1',
      full_name: 'Принятый Ученик',
      request_kind: 'initial_profile',
      request_kind_label: 'Первичная анкета',
      status: 'Принята преподавателем',
      current_teacher_user_id: 'teacher-accepted-1',
      current_teacher_full_name: 'Педагог Принятие',
      teacher_review_status: 'Принята преподавателем',
      can_edit_admin_fields: true,
      can_assign_teacher: true,
    },
    'teacher-profile-update-1': {
      ...common,
      id: 'teacher-profile-update-1',
      full_name: 'Преподаватель Профиль',
      request_kind: 'teacher_profile_update',
      request_kind_label: 'Обновление профиля преподавателя',
      status: 'На доработке',
      current_teacher_user_id: null,
      current_teacher_full_name: null,
      teacher_review_status: null,
      can_edit_admin_fields: false,
      can_assign_teacher: false,
    },
    'profile-update-approved-1': {
      ...common,
      id: 'profile-update-approved-1',
      full_name: 'Профиль Подтверждён',
      request_kind: 'profile_update',
      request_kind_label: 'Обновление профиля',
      status: 'Подтверждена',
      current_teacher_user_id: null,
      current_teacher_full_name: null,
      teacher_review_status: null,
      can_edit_admin_fields: false,
      can_assign_teacher: false,
    },
  };

  return details[applicationId];
}

function buildRemovalRequests(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `removal-${index + 1}`,
    status: index === 0 ? 'approved' : index === 1 ? 'rejected' : 'pending',
    reason: `Причина ${index + 1}`,
    admin_comment: null,
    created_at: '2026-05-01T10:00:00Z',
    resolved_at: index < 2 ? '2026-05-01T11:00:00Z' : null,
    resolved_by_admin_user_id: index < 2 ? 'admin-1' : null,
    teacher: {
      user_id: `teacher-${index + 1}`,
      full_name: `Преподаватель ${index + 1}`,
    },
    student: {
      user_id: `student-${index + 1}`,
      full_name: `Ученик ${index + 1}`,
      grade_label: '4А класс',
    },
  }));
}

function buildDirectoryItems(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    full_name: `${prefix === 'student' ? 'Ученик' : 'Преподаватель'} ${index + 1}`,
    avatar_url: null,
    grade_label: prefix === 'student' ? '5Б класс' : undefined,
    subject_name: prefix === 'teacher' ? 'Русский язык' : undefined,
  }));
}

async function loginAdminViaUi(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Введите пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/admin');
}

async function fulfillDirectoryPage(route: Route, prefix: 'student' | 'teacher') {
  const url = new URL(route.request().url());
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('page_size') ?? '0');
  const items = buildDirectoryItems(prefix, 11);
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: paginatedItems,
      page,
      page_size: pageSize,
      total: items.length,
      total_pages: Math.ceil(items.length / pageSize),
    }),
  });
}

test.describe.serial('admin applications ui cleanup', () => {
  test('applications use task-oriented statuses, responsible labels, inner tabs, and scoped search', async ({ page }) => {
    let applications = buildGroupedApplications();
    let removalRequests = buildRemovalRequests(11);

    await page.route('**/api/v1/admin/applications*', async (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;
      const applicationId = pathname.split('/').pop();

      if (route.request().method() === 'DELETE') {
        const payload = route.request().postDataJSON() as { ids?: string[]; delete_all?: boolean };
        const requestedIds = new Set(payload.ids ?? []);
        const beforeCount = applications.length;
        applications = applications.filter((item) => !requestedIds.has(item.id));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Applications deleted',
            deleted_count: beforeCount - applications.length,
          }),
        });
        return;
      }

      if (route.request().method() === 'POST' && pathname.endsWith('/reject')) {
        const targetId = pathname.split('/').at(-2);
        if (!targetId) {
          await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Application not found' }) });
          return;
        }

        applications = applications.map((item) =>
          item.id === targetId
            ? {
                ...item,
                status: 'Отклонена',
              }
            : item,
        );

        const detail = buildApplicationDetail(targetId);
        if (!detail) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Application not found' }) });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...detail,
            status: 'Отклонена',
          }),
        });
        return;
      }

      if (applicationId && applicationId !== 'applications') {
        const detail = buildApplicationDetail(applicationId);
        if (!detail) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Application not found' }) });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(detail),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: applications,
        }),
      });
    });

    await page.route('**/api/v1/admin/teachers/assignment-options*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              teacher_user_id: 'teacher-available-1',
              full_name: 'Доступный Преподаватель',
              subject_name: 'Русский язык',
              student_count: 4,
              capacity: 15,
              is_available: true,
              unavailable_reason: null,
            },
            {
              teacher_user_id: 'teacher-rejected-1',
              full_name: 'Отклонявший Преподаватель',
              subject_name: 'Литература',
              student_count: 6,
              capacity: 15,
              is_available: false,
              unavailable_reason: 'already_rejected_this_student',
            },
            {
              teacher_user_id: 'teacher-full-1',
              full_name: 'Переполненный Преподаватель',
              subject_name: 'Чтение',
              student_count: 15,
              capacity: 15,
              is_available: false,
              unavailable_reason: 'full_capacity',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/admin/student-removal-requests', async (route) => {
      if (route.request().method() === 'DELETE') {
        const payload = route.request().postDataJSON() as { ids?: string[]; delete_all?: boolean };
        const deletableIds = new Set(
          removalRequests.filter((item) => item.status !== 'pending').map((item) => item.id),
        );
        if (payload.delete_all) {
          removalRequests = removalRequests.filter((item) => item.status === 'pending');
        } else {
          const requestedIds = new Set((payload.ids ?? []).filter((id) => deletableIds.has(id)));
          removalRequests = removalRequests.filter((item) => !requestedIds.has(item.id));
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Removal requests deleted',
            deleted_count: payload.delete_all ? 2 : (payload.ids ?? []).filter((id) => deletableIds.has(id)).length,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: removalRequests,
        }),
      });
    });

    await loginAdminViaUi(page);

    await expect(page.getByPlaceholder('Поиск по первому слову...')).toBeVisible();
    await expect(page.getByTestId('admin-application-group-initial')).toBeVisible();
    await expect(page.getByTestId('admin-application-group-profile_updates')).toBeVisible();
    await expect(page.getByTestId('admin-application-group-needs_assignment')).toBeVisible();
    await expect(page.getByTestId('admin-application-group-accepted')).toBeVisible();
    await expect(page.getByTestId('admin-application-group-rejected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible();
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();
    await expect(page.getByText('Первичный ученик 10')).toBeVisible();
    await expect(page.getByText('Первичный ученик 11')).toHaveCount(0);
    await expect(page.getByText('На рассмотрении')).toBeVisible();
    await expect(page.getByText('Новая')).toHaveCount(0);
    await expect(page.getByText('Первичная анкета')).toHaveCount(0);
    await expect(page.getByText('Ожидает администратора')).toBeVisible();
    await expect(page.getByText('submitted')).toHaveCount(0);
    await expect(page.getByText('teacher_accepted')).toHaveCount(0);

    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByText('Первичный ученик 11')).toBeVisible();

    await page.getByRole('button', { name: '1' }).click();
    await page.getByText('Первичный ученик 1').click();
    await expect(page.getByRole('button', { name: 'Подтвердить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отклонить изменение' })).toHaveCount(0);
    await expect(page.getByText('Ожидает администратора')).toBeVisible();
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByTestId('admin-application-group-profile_updates').click();
    await expect(page.getByText('Профиль Ученик')).toBeVisible();
    await expect(page.getByText('Преподаватель Профиль')).toBeVisible();
    await expect(page.getByText('Страница 1 из 1')).toBeVisible();
    await page.getByText('Профиль Ученик').click();
    await expect(page.getByRole('button', { name: 'Подтвердить изменения' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отклонить изменение' })).toBeVisible();
    await page.getByRole('button', { name: 'Отклонить изменение' }).click();
    await expect(page.getByRole('heading', { name: 'Отклонить изменение профиля?' })).toBeVisible();
    await page.getByLabel('Причина отклонения').fill('Недостаточно данных для подтверждения.');
    await page.getByRole('button', { name: 'Отклонить' }).last().click();
    await expect(page.getByText('Изменение профиля отклонено.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отклонить изменение' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Подтвердить изменения' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByPlaceholder('Поиск по первому слову...').fill('Принятый');
    await expect(page.getByText('Профиль Ученик')).toHaveCount(0);
    await expect(page.getByText('По вашему запросу заявки не найдены.')).toBeVisible();
    await page.getByPlaceholder('Поиск по первому слову...').fill('');

    await page.getByTestId('admin-application-group-needs_assignment').click();
    await expect(page.getByText('Ожидает Назначения')).toBeVisible();
    await expect(page.getByText('Требует назначения')).toBeVisible();
    await expect(page.getByText('Отклонённый Ученик')).toBeVisible();
    await expect(page.getByText('Ожидает администратора')).toBeVisible();
    await page.getByText('Ожидает Назначения').click();
    await expect(page.getByRole('button', { name: 'Назначить преподавателя' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Подтвердить' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByTestId('admin-application-group-initial').click();
    await expect(page.getByText('Ожидает Решения Преподавателя')).toBeVisible();
    await page.getByText('Ожидает Решения Преподавателя').click();
    await expect(page.getByText('Ожидает преподавателя')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Подтвердить' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Назначить преподавателя' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByTestId('admin-application-group-accepted').click();
    await expect(page.getByText('Принятый Ученик')).toBeVisible();
    await expect(page.getByText('Принята преподавателем')).toBeVisible();
    await page.getByText('Принятый Ученик').click();
    await expect(page.getByText('Завершено')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Подтвердить' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Назначить преподавателя' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByTestId('admin-application-group-rejected').click();
    await expect(page.getByText('Профиль Ученик')).toBeVisible();
    await expect(page.getByText('Отклонённый Терминальный')).toBeVisible();
    await expect(page.getByText('Отклонена')).toBeVisible();

    await page.getByTestId('admin-application-group-profile_updates').click();
    await page.getByText('Преподаватель Профиль').click();
    await expect(page.getByText('Ожидает преподавателя')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Подтвердить' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Отправить на доработку' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Назад' }).click();

    await page.getByTestId('admin-application-group-needs_assignment').click();
    await page.getByText('Ожидает Назначения').click();
    await page.getByRole('button', { name: 'Назначить преподавателя' }).click();
    await expect(page.getByText('Отклонявший Преподаватель')).toBeVisible();
    await expect(page.getByText('Уже отклонял этого ученика')).toBeVisible();
    await expect(page.getByText('Лимит 15 из 15 учеников уже заполнен')).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(2);
    await expect(page.getByText('Для ученика ещё нужно назначить преподавателя.')).toBeVisible();

    await page.getByTestId('admin-application-group-accepted').click();
    await page.getByRole('button', { name: 'Удалить' }).click();
    await page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]').first().check();
    await page.getByRole('button', { name: 'Удалить выбранные' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить заявки?' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText('Заявка удалена.')).toBeVisible();
    await expect(page.getByText('Принятый Ученик')).toHaveCount(0);

    await page.getByTestId('admin-sidebar-student-removal-requests-tab').click();
    await expect(page.getByRole('heading', { name: 'Заявки на открепление' })).toBeVisible();
    await expect(page.getByTestId('admin-student-removal-request-card')).toHaveCount(10);
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(10);
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]:not(:disabled)')).toHaveCount(2);
    await expect(page.getByText('Заявка на открепление ещё ожидает решения администратора.')).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Удалить' }).click();
    await page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]').first().check();
    await page.getByRole('button', { name: 'Удалить выбранные' }).click();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText('Заявка на открепление удалена.')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить все доступные' }).click();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText('Заявки на открепление удалены.')).toBeVisible();

    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByTestId('admin-student-removal-request-card')).toHaveCount(1);
  });

  test('students and teachers directories request 10 items per page', async ({ page }) => {
    const requestedPageSizes: Array<{ scope: 'students' | 'teachers'; pageSize: number }> = [];

    await page.route('**/api/v1/admin/students?*', async (route) => {
      const url = new URL(route.request().url());
      requestedPageSizes.push({
        scope: 'students',
        pageSize: Number(url.searchParams.get('page_size') ?? '0'),
      });
      await fulfillDirectoryPage(route, 'student');
    });

    await page.route('**/api/v1/admin/teachers?*', async (route) => {
      const url = new URL(route.request().url());
      requestedPageSizes.push({
        scope: 'teachers',
        pageSize: Number(url.searchParams.get('page_size') ?? '0'),
      });
      await fulfillDirectoryPage(route, 'teacher');
    });

    await loginAdminViaUi(page);

    await page.getByTestId('admin-sidebar-students-tab').click();
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();
    await expect(page.getByText('Ученик 10')).toBeVisible();
    await expect(page.getByText('Ученик 11')).toHaveCount(0);
    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByText('Ученик 11')).toBeVisible();

    await page.getByTestId('admin-sidebar-teachers-tab').click();
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();
    await expect(page.getByText('Преподаватель 10')).toBeVisible();
    await expect(page.getByText('Преподаватель 11')).toHaveCount(0);
    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByText('Преподаватель 11')).toBeVisible();

    expect(requestedPageSizes.some((item) => item.scope === 'students' && item.pageSize === 10)).toBeTruthy();
    expect(requestedPageSizes.some((item) => item.scope === 'teachers' && item.pageSize === 10)).toBeTruthy();
  });
});
