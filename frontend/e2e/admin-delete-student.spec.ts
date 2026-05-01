import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';
const TEACHER_EMAIL = 'teacher.seed@example.com';
const TEACHER_PASSWORD = 'TeacherSeed123!';
const TEACHER_FULL_NAME = 'Попов Михаил Петрович';
const UNIQUE_SUFFIX = Date.now();
const STUDENT_EMAIL = `delete.student.${UNIQUE_SUFFIX}@example.com`;
const STUDENT_PASSWORD = 'DeleteStudentE2E123!';
const STUDENT_FULL_NAME = `Удаляемый Ученик ${UNIQUE_SUFFIX}`;

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

async function loginAdminViaUi(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Введите пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/admin');
}

async function createAssignedStudentForDeletion(request: APIRequestContext) {
  const registerResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/register`, {
    data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  });
  expect(registerResponse.ok()).toBeTruthy();

  const studentAuth = await loginViaApi(request, STUDENT_EMAIL, STUDENT_PASSWORD);
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const teacherAuth = await loginViaApi(request, TEACHER_EMAIL, TEACHER_PASSWORD);

  const patchProfileResponse = await request.patch(`${BACKEND_BASE_URL}/api/v1/student/profile`, {
    headers: {
      Authorization: `Bearer ${studentAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      full_name: STUDENT_FULL_NAME,
      birth_date: '2011-04-12',
      gender: 'Мужской',
      quote: 'Профиль для e2e удаления ученика.',
    },
  });
  expect(patchProfileResponse.ok()).toBeTruthy();

  const submitProfileResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/student/profile/submit`, {
    headers: { Authorization: `Bearer ${studentAuth.access_token}` },
  });
  expect(submitProfileResponse.ok()).toBeTruthy();

  const applicationsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/applications`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(applicationsResponse.ok()).toBeTruthy();
  const applicationsPayload = (await applicationsResponse.json()) as {
    items: Array<{ id: string; full_name: string }>;
  };
  const application = applicationsPayload.items.find((item) => item.full_name === STUDENT_FULL_NAME);
  expect(application).toBeTruthy();

  const patchApplicationResponse = await request.patch(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${application?.id}`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        grade_label: '5Б класс',
        enrollment_date: '2018-09-03',
      },
    },
  );
  expect(patchApplicationResponse.ok()).toBeTruthy();

  const assignmentOptionsResponse = await request.get(
    `${BACKEND_BASE_URL}/api/v1/admin/teachers/assignment-options?application_id=${application?.id}`,
    {
      headers: { Authorization: `Bearer ${adminAuth.access_token}` },
    },
  );
  expect(assignmentOptionsResponse.ok()).toBeTruthy();
  const assignmentOptionsPayload = (await assignmentOptionsResponse.json()) as {
    items: Array<{ teacher_user_id: string; full_name: string }>;
  };
  const teacherOption = assignmentOptionsPayload.items.find((item) => item.full_name === TEACHER_FULL_NAME);
  expect(teacherOption).toBeTruthy();

  const assignResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${application?.id}/assign-teacher`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: { teacher_user_id: teacherOption?.teacher_user_id },
    },
  );
  expect(assignResponse.ok()).toBeTruthy();

  const teacherNotificationsBeforeResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/notifications`, {
    headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
  });
  expect(teacherNotificationsBeforeResponse.ok()).toBeTruthy();
  const teacherNotificationsBeforePayload = (await teacherNotificationsBeforeResponse.json()) as {
    items: Array<{ id: string }>;
  };

  return {
    teacherToken: teacherAuth.access_token,
    teacherNotificationsBeforeCount: teacherNotificationsBeforePayload.items.length,
  };
}

test.describe.serial('admin delete student', () => {
  let teacherToken = '';
  let teacherNotificationsBeforeCount = 0;

  test.beforeAll(async ({ request }) => {
    const setup = await createAssignedStudentForDeletion(request);
    teacherToken = setup.teacherToken;
    teacherNotificationsBeforeCount = setup.teacherNotificationsBeforeCount;
  });

  test('admin sees delete student button, modal appears, and cancel keeps student', async ({ page }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Ученики' }).click();

    await page.getByRole('heading', { name: STUDENT_FULL_NAME }).click();
    await expect(page.getByRole('button', { name: 'Удалить ученика' })).toBeVisible();

    await page.getByRole('button', { name: 'Удалить ученика' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить ученика?' })).toBeVisible();
    await expect(
      page.getByText('Ученик будет деактивирован и больше не сможет пользоваться системой. Если ученик связан с преподавателем, преподаватель получит уведомление.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить ученика?' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Удалить ученика' })).toBeVisible();
  });

  test('confirm deletes student, student disappears, assignment tab excludes student, and teacher receives notification', async ({
    page,
    request,
  }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Ученики' }).click();

    await page.getByRole('heading', { name: STUDENT_FULL_NAME }).click();
    await page.getByRole('button', { name: 'Удалить ученика' }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText('Ученик удалён.')).toBeVisible();
    await expect(page.getByText(STUDENT_FULL_NAME)).toHaveCount(0);

    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();
    await expect(page.getByText(STUDENT_FULL_NAME)).toHaveCount(0);

    const teacherNotificationsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherNotificationsResponse.ok()).toBeTruthy();
    const teacherNotificationsPayload = (await teacherNotificationsResponse.json()) as {
      items: Array<{ title: string; message: string }>;
    };
    expect(teacherNotificationsPayload.items.length).toBeGreaterThan(teacherNotificationsBeforeCount);
    expect(
      teacherNotificationsPayload.items.some(
        (item) =>
          item.title === 'Ученик удалён администратором' &&
          item.message.includes(STUDENT_FULL_NAME),
      ),
    ).toBeTruthy();
  });
});
