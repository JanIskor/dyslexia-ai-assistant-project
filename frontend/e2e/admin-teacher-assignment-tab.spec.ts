import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';
const TEACHER_EMAIL = 'teacher.seed@example.com';
const TEACHER_PASSWORD = 'TeacherSeed123!';
const STUDENT_FULL_NAME = 'Иванов Андрей Викторович';
const UNIQUE_SUFFIX = Date.now();
const CREATED_TEACHER_EMAIL = `assignment.tab.${UNIQUE_SUFFIX}@example.com`;
const CREATED_TEACHER_PASSWORD = 'AssignmentTabTeacher123!';
const CREATED_TEACHER_FIRST_NAME = 'Ирина';
const CREATED_TEACHER_LAST_NAME = `Назначение${UNIQUE_SUFFIX}`;
const CREATED_TEACHER_FULL_NAME = `${CREATED_TEACHER_LAST_NAME} ${CREATED_TEACHER_FIRST_NAME}`;

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

async function ensureSeedStudentUnassigned(request: APIRequestContext) {
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);

  const unassignedResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/students/unassigned`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(unassignedResponse.ok()).toBeTruthy();
  const unassignedPayload = (await unassignedResponse.json()) as {
    items: Array<{ application_id: string; user_id: string; full_name: string }>;
  };
  if (unassignedPayload.items.some((item) => item.full_name === STUDENT_FULL_NAME)) {
    return;
  }

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

  const removalResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/students/${seedStudent?.id}/removal-requests`,
    {
      headers: {
        Authorization: `Bearer ${teacherAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: { reason: 'Подготовка e2e для admin assignment tab.' },
    },
  );
  expect(removalResponse.ok()).toBeTruthy();

  const adminRemovalRequestsResponse = await request.get(
    `${BACKEND_BASE_URL}/api/v1/admin/student-removal-requests`,
    {
      headers: { Authorization: `Bearer ${adminAuth.access_token}` },
    },
  );
  expect(adminRemovalRequestsResponse.ok()).toBeTruthy();
  const adminRemovalRequestsPayload = (await adminRemovalRequestsResponse.json()) as {
    items: Array<{ id: string; status: string; student: { full_name: string } }>;
  };
  const pendingRequest = adminRemovalRequestsPayload.items.find(
    (item) => item.status === 'pending' && item.student.full_name === STUDENT_FULL_NAME,
  );
  expect(pendingRequest).toBeTruthy();

  const approveResponse = await request.patch(
    `${BACKEND_BASE_URL}/api/v1/admin/student-removal-requests/${pendingRequest?.id}`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: { action: 'approve' },
    },
  );
  expect(approveResponse.ok()).toBeTruthy();
}

test.describe.serial('admin teacher assignment tab', () => {
  test.beforeAll(async ({ request }) => {
    await ensureSeedStudentUnassigned(request);
  });

  test('admin sees teacher assignment tab and create teacher form works', async ({ page }) => {
    await loginAdminViaUi(page);
    await expect(page.getByTestId('admin-sidebar-teacher-assignment-tab')).toBeVisible();
    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();

    await page.locator('#admin-create-teacher-email').fill(CREATED_TEACHER_EMAIL);
    await page.locator('#admin-create-teacher-password').fill(CREATED_TEACHER_PASSWORD);
    await page.locator('#admin-create-teacher-first-name').fill(CREATED_TEACHER_FIRST_NAME);
    await page.locator('#admin-create-teacher-last-name').fill(CREATED_TEACHER_LAST_NAME);
    await page.getByRole('button', { name: 'Создать преподавателя' }).click();

    await expect(page.getByTestId('admin-create-teacher-message')).toHaveText(
      `Преподаватель ${CREATED_TEACHER_FULL_NAME} создан.`,
    );
    const teacherCapacityCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: CREATED_TEACHER_FULL_NAME }),
    });
    await expect(teacherCapacityCard).toBeVisible();
    await expect(teacherCapacityCard.getByText('0 / 15')).toBeVisible();
    await expect(page.getByText(STUDENT_FULL_NAME)).toBeVisible();
  });

  test('teachers list shows capacity and full teacher is disabled in assignment modal', async ({ page }) => {
    await loginAdminViaUi(page);
    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();

    await page.route('**/api/v1/admin/teachers/assignment-options?application_id=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              teacher_user_id: '11111111-1111-1111-1111-111111111111',
              full_name: 'Полная Нагрузка',
              subject_name: 'Математика',
              student_count: 15,
              capacity: 15,
              is_available: false,
              unavailable_reason: 'full_capacity',
            },
          ],
        }),
      });
    });

    const studentCard = page.locator('article').filter({ hasText: STUDENT_FULL_NAME }).first();
    await expect(studentCard).toBeVisible();
    await studentCard.getByRole('button', { name: 'Назначить' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Назначение преподавателя' })).toBeVisible();
    await expect(page.getByText('Полная Нагрузка')).toBeVisible();
    await expect(page.getByText('15/15')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Полная Нагрузка' })).toBeDisabled();
  });

  test('admin can assign unassigned student to created teacher and student disappears from waiting list', async ({
    page,
  }) => {
    await loginAdminViaUi(page);
    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();

    const studentCard = page.locator('article').filter({ hasText: STUDENT_FULL_NAME }).first();
    await expect(studentCard).toBeVisible();
    await studentCard.getByRole('button', { name: 'Назначить' }).click({ force: true });
    await expect(page.getByText(CREATED_TEACHER_FULL_NAME)).toBeVisible();

    await page.getByRole('button', { name: CREATED_TEACHER_FULL_NAME }).click();
    await page.getByRole('button', { name: 'Отправить преподавателю' }).click();

    await expect(page.getByText(`Ученик ${STUDENT_FULL_NAME} назначен преподавателю.`)).toBeVisible();
    await expect(page.locator('article').filter({ hasText: STUDENT_FULL_NAME })).toHaveCount(0);
  });
});
