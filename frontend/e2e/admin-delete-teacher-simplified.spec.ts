import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';
const TEACHER_EMAIL = 'teacher.seed@example.com';
const TEACHER_PASSWORD = 'TeacherSeed123!';
const STUDENT_FULL_NAME = 'Иванов Андрей Викторович';
const UNIQUE_SUFFIX = Date.now();
const DELETABLE_TEACHER_EMAIL = `delete.teacher.${UNIQUE_SUFFIX}@example.com`;
const DELETABLE_TEACHER_PASSWORD = 'DeleteTeacherE2E123!';
const DELETABLE_TEACHER_FIRST_NAME = 'Мария';
const DELETABLE_TEACHER_LAST_NAME = `Удаление${UNIQUE_SUFFIX}`;
const DELETABLE_TEACHER_FULL_NAME = `${DELETABLE_TEACHER_LAST_NAME} ${DELETABLE_TEACHER_FIRST_NAME}`;

let deletableTeacherId: string;

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

async function ensureSeedStudentUnassigned(request: APIRequestContext): Promise<string> {
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);

  const unassignedResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/students/unassigned`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(unassignedResponse.ok()).toBeTruthy();
  const unassignedPayload = (await unassignedResponse.json()) as {
    items: Array<{ application_id: string; user_id: string; full_name: string }>;
  };
  const existing = unassignedPayload.items.find((item) => item.full_name === STUDENT_FULL_NAME);
  if (existing) {
    return existing.application_id;
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
      data: { reason: 'Подготовка e2e для admin delete teacher simplified.' },
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

  const refreshedUnassignedResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/students/unassigned`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(refreshedUnassignedResponse.ok()).toBeTruthy();
  const refreshedUnassignedPayload = (await refreshedUnassignedResponse.json()) as {
    items: Array<{ application_id: string; user_id: string; full_name: string }>;
  };
  const refreshed = refreshedUnassignedPayload.items.find((item) => item.full_name === STUDENT_FULL_NAME);
  expect(refreshed).toBeTruthy();
  return refreshed!.application_id;
}

async function createTeacherAndAssignStudent(request: APIRequestContext) {
  const adminAuth = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const applicationId = await ensureSeedStudentUnassigned(request);

  const createResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/admin/teachers`, {
    headers: {
      Authorization: `Bearer ${adminAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      email: DELETABLE_TEACHER_EMAIL,
      password: DELETABLE_TEACHER_PASSWORD,
      first_name: DELETABLE_TEACHER_FIRST_NAME,
      last_name: DELETABLE_TEACHER_LAST_NAME,
      birth_date: '1988-06-15',
      gender: 'female',
      position: 'Преподаватель',
      phone: '+79005554433',
      subject_name: 'Литература',
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createPayload = (await createResponse.json()) as { id: string };
  deletableTeacherId = createPayload.id;

  const assignResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${applicationId}/assign-teacher`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: { teacher_user_id: deletableTeacherId },
    },
  );
  expect(assignResponse.ok()).toBeTruthy();
}

test.describe.serial('admin delete teacher simplified', () => {
  test.beforeAll(async ({ request }) => {
    await createTeacherAndAssignStudent(request);
  });

  test('admin sees delete teacher button, modal shows active students count, and cancel keeps teacher', async ({
    page,
  }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Преподаватели' }).click();

    await page.getByRole('heading', { name: DELETABLE_TEACHER_FULL_NAME }).click();
    await expect(page.getByRole('button', { name: 'Удалить преподавателя' })).toBeVisible();

    await page.getByRole('button', { name: 'Удалить преподавателя' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить преподавателя?' })).toBeVisible();
    await expect(
      page.getByText('У этого преподавателя сейчас 1 учеников из 15. После удаления преподавателя все его ученики перейдут в состояние "ожидает назначения".'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить преподавателя?' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Удалить преподавателя' })).toBeVisible();
  });

  test('confirm deletes teacher, teacher disappears, and released student becomes visible as needs-assignment system event', async ({
    page,
  }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Преподаватели' }).click();

    await page.getByRole('heading', { name: DELETABLE_TEACHER_FULL_NAME }).click();
    await page.getByRole('button', { name: 'Удалить преподавателя' }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    await expect(
      page.getByText('Преподаватель удалён. Ученики переведены в ожидание назначения.'),
    ).toBeVisible();
    await expect(page.getByText(DELETABLE_TEACHER_FULL_NAME)).toHaveCount(0);

    await page.getByTestId('admin-sidebar-student-applications-tab').click();
    const studentCard = page.locator('li').filter({ hasText: STUDENT_FULL_NAME }).first();
    await expect(studentCard).toBeVisible();
    await expect(studentCard.getByText('Системное событие')).toBeVisible();
    await expect(studentCard.getByText('Требует назначения')).toBeVisible();
  });
});
