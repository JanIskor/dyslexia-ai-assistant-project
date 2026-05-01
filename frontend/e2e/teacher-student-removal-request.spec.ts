import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';
const TEACHER_EMAIL = 'teacher.seed@example.com';
const TEACHER_PASSWORD = 'TeacherSeed123!';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';
const STUDENT_FULL_NAME = 'Иванов Андрей Викторович';
const TEACHER_FULL_NAME = 'Попов Михаил Петрович';

async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ access_token: string }> {
  const response = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { access_token: string };
}

async function getTeacherProfileName(request: APIRequestContext, token: string): Promise<string> {
  const response = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { full_name: string }).full_name;
}

async function ensureSeedAssignmentPresent(request: APIRequestContext) {
  const teacherAuth = await loginViaApi(request, TEACHER_EMAIL, TEACHER_PASSWORD);
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const teacherProfileName = await getTeacherProfileName(request, teacherAuth.access_token);

  const currentStudents = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/students`, {
    headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
  });
  expect(currentStudents.ok()).toBeTruthy();
  const studentsPayload = (await currentStudents.json()) as {
    items: Array<{ id: string; full_name: string }>;
  };

  if (studentsPayload.items.some((item) => item.full_name === STUDENT_FULL_NAME)) {
    return;
  }

  const applicationsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/applications`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(applicationsResponse.ok()).toBeTruthy();
  const applicationsPayload = (await applicationsResponse.json()) as {
    items: Array<{ id: string; full_name: string }>;
  };
  const studentApplication = applicationsPayload.items.find((item) => item.full_name === STUDENT_FULL_NAME);
  expect(studentApplication).toBeTruthy();

  const optionsResponse = await request.get(
    `${BACKEND_BASE_URL}/api/v1/admin/teachers/assignment-options?application_id=${studentApplication?.id}`,
    {
      headers: { Authorization: `Bearer ${adminAuth.access_token}` },
    },
  );
  expect(optionsResponse.ok()).toBeTruthy();
  const optionsPayload = (await optionsResponse.json()) as {
    items: Array<{ teacher_user_id: string; full_name: string }>;
  };
  const teacherOption = optionsPayload.items.find((item) => item.full_name === teacherProfileName);
  expect(teacherOption).toBeTruthy();

  const assignResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${studentApplication?.id}/assign-teacher`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        teacher_user_id: teacherOption?.teacher_user_id,
      },
    },
  );
  expect(assignResponse.ok()).toBeTruthy();
}

async function rejectPendingRemovalRequests(request: APIRequestContext) {
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const response = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/student-removal-requests`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{
      id: string;
      status: string;
      teacher: { full_name: string };
      student: { full_name: string };
    }>;
  };

  for (const item of payload.items) {
    if (
      item.status === 'pending' &&
      item.teacher.full_name === TEACHER_FULL_NAME &&
      item.student.full_name === STUDENT_FULL_NAME
    ) {
      const rejectResponse = await request.patch(
        `${BACKEND_BASE_URL}/api/v1/admin/student-removal-requests/${item.id}`,
        {
          headers: {
            Authorization: `Bearer ${adminAuth.access_token}`,
            'Content-Type': 'application/json',
          },
          data: { action: 'reject' },
        },
      );
      expect(rejectResponse.ok()).toBeTruthy();
    }
  }
}

async function openTeacherStudentDetail(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(TEACHER_EMAIL);
  await page.getByPlaceholder('Введите пароль').fill(TEACHER_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/teacher');
  await page.getByRole('button', { name: 'Список учеников' }).click();
  await page.getByText(STUDENT_FULL_NAME).click();
}

async function openAdminRemovalRequests(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Введите пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/admin');
  await page.getByTestId('admin-sidebar-student-removal-requests-tab').click();
}

test.describe.serial('teacher student removal requests', () => {
  test.beforeEach(async ({ request }) => {
    await ensureSeedAssignmentPresent(request);
    await rejectPendingRemovalRequests(request);
  });

  test('teacher sees removal button and modal cancel keeps student detail intact', async ({ page }) => {
    await openTeacherStudentDetail(page);

    await expect(page.getByTestId('teacher-student-removal-trigger')).toBeVisible();
    await page.getByTestId('teacher-student-removal-trigger').click();
    await expect(page.getByTestId('teacher-student-removal-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByTestId('teacher-student-removal-modal')).toHaveCount(0);
    await expect(page.getByText(STUDENT_FULL_NAME)).toBeVisible();
  });

  test('teacher can send request and admin can reject it while student remains in teacher list', async ({
    page,
    request,
  }) => {
    await openTeacherStudentDetail(page);
    await page.getByTestId('teacher-student-removal-trigger').click();
    await page.getByTestId('teacher-student-removal-modal').locator('textarea').fill('Тестовый запрос на открепление.');
    await page.getByTestId('teacher-student-removal-confirm').click();
    await expect(page.getByText('Заявка отправлена администратору.')).toBeVisible();

    await openAdminRemovalRequests(page);
    const requestCard = page.getByTestId('admin-student-removal-request-card').filter({
      hasText: `${STUDENT_FULL_NAME}Ожидает решения`,
    });
    await expect(requestCard).toBeVisible();
    await requestCard.getByRole('button', { name: 'Отклонить' }).click();
    await expect(page.getByText('Заявка на открепление отклонена.')).toBeVisible();

    const teacherAuth = await loginViaApi(request, TEACHER_EMAIL, TEACHER_PASSWORD);
    const teacherStudentsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/students`, {
      headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
    });
    expect(teacherStudentsResponse.ok()).toBeTruthy();
    const teacherStudentsPayload = (await teacherStudentsResponse.json()) as {
      items: Array<{ full_name: string }>;
    };
    expect(teacherStudentsPayload.items.some((item) => item.full_name === STUDENT_FULL_NAME)).toBeTruthy();
  });

  test('admin can approve request and student disappears from teacher active list', async ({
    page,
    request,
  }) => {
    await openTeacherStudentDetail(page);
    await page.getByTestId('teacher-student-removal-trigger').click();
    await page.getByTestId('teacher-student-removal-confirm').click();
    await expect(page.getByText('Заявка отправлена администратору.')).toBeVisible();

    await openAdminRemovalRequests(page);
    const requestCard = page.getByTestId('admin-student-removal-request-card').filter({
      hasText: `${STUDENT_FULL_NAME}Ожидает решения`,
    });
    await expect(requestCard).toBeVisible();
    await requestCard.getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByText('Заявка на открепление подтверждена.')).toBeVisible();

    const teacherAuth = await loginViaApi(request, TEACHER_EMAIL, TEACHER_PASSWORD);
    const teacherStudentsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/students`, {
      headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
    });
    expect(teacherStudentsResponse.ok()).toBeTruthy();
    const teacherStudentsPayload = (await teacherStudentsResponse.json()) as {
      items: Array<{ full_name: string }>;
    };
    expect(teacherStudentsPayload.items.some((item) => item.full_name === STUDENT_FULL_NAME)).toBeFalsy();
  });

  test('admin can bulk delete selected and all removal requests', async ({ page, request }) => {
    const teacherAuth = await loginViaApi(request, TEACHER_EMAIL, TEACHER_PASSWORD);
    const teacherStudentsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/students`, {
      headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
    });
    expect(teacherStudentsResponse.ok()).toBeTruthy();
    const teacherStudentsPayload = (await teacherStudentsResponse.json()) as {
      items: Array<{ id: string; full_name: string }>;
    };
    const seedStudent = teacherStudentsPayload.items.find((item) => item.full_name === STUDENT_FULL_NAME);
    expect(seedStudent).toBeTruthy();

    const createResponse = await request.post(
      `${BACKEND_BASE_URL}/api/v1/teacher/students/${seedStudent?.id}/removal-requests`,
      {
        headers: {
          Authorization: `Bearer ${teacherAuth.access_token}`,
          'Content-Type': 'application/json',
        },
        data: { reason: 'Первая заявка для bulk delete.' },
      },
    );
    expect(createResponse.ok()).toBeTruthy();

    await rejectPendingRemovalRequests(request);

    const secondResponse = await request.post(
      `${BACKEND_BASE_URL}/api/v1/teacher/students/${seedStudent?.id}/removal-requests`,
      {
        headers: {
          Authorization: `Bearer ${teacherAuth.access_token}`,
          'Content-Type': 'application/json',
        },
        data: { reason: 'Вторая заявка для bulk delete.' },
      },
    );
    expect(secondResponse.ok()).toBeTruthy();

    await openAdminRemovalRequests(page);
    await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const checkboxes = page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]');
    await expect(checkboxes).toHaveCount(2);
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(checkboxes).toHaveCount(2);
    await page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]').first().check();
    await page.getByRole('button', { name: 'Удалить выбранные' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить заявки?' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText('Заявка на открепление удалена.')).toBeVisible();

    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Удалить все' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить заявки?' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText('Заявка на открепление удалена.')).toBeVisible();
    await expect(page.getByText('Заявок на открепление пока нет.')).toBeVisible();
  });
});
