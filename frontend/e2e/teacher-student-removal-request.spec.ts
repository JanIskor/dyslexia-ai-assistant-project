import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { createAcceptedStudentForTeacher, createTeacherViaAdmin } from './helpers/adminSeeds';
import {
  ADMIN_CREDENTIALS,
  BACKEND_BASE_URL,
  loginViaApi,
  loginViaUi,
} from './helpers/auth';
import { buildUniqueSuffix } from './helpers/testData';

async function openTeacherStudentDetail(
  page: Page,
  teacherCredentials: { email: string; password: string },
  studentSurname: string,
  studentFullName: string,
) {
  await loginViaUi(page, teacherCredentials, '/teacher');
  await page.getByRole('button', { name: 'Список учеников' }).click();
  await page.getByLabel('Поиск по фамилии').fill(studentSurname);
  await page.getByText(studentFullName).click();
}

async function openAdminRemovalRequests(page: Page) {
  await loginViaUi(page, ADMIN_CREDENTIALS, '/admin');
  await page.getByTestId('admin-sidebar-student-removal-requests-tab').click();
}

async function listTeacherStudents(
  request: APIRequestContext,
  teacherToken: string,
): Promise<Array<{ id: string; full_name: string }>> {
  const response = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/students`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ id: string; full_name: string }>;
  };
  return payload.items;
}

async function rejectPendingRemovalRequestsForStudent(
  request: APIRequestContext,
  studentFullName: string,
): Promise<void> {
  const adminAuth = await loginViaApi(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  const response = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/student-removal-requests`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{
      id: string;
      status: string;
      student: { full_name: string };
    }>;
  };

  for (const item of payload.items) {
    if (item.status !== 'pending' || item.student.full_name !== studentFullName) {
      continue;
    }
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

async function createRemovalRequestForStudent(
  request: APIRequestContext,
  teacherToken: string,
  studentId: string,
  reason: string,
): Promise<void> {
  const response = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/students/${studentId}/removal-requests`,
    {
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        'Content-Type': 'application/json',
      },
      data: { reason },
    },
  );
  expect(response.ok()).toBeTruthy();
}

test.describe.serial('teacher student removal requests', () => {
  let teacherToken = '';
  let teacherFullName = '';
  let studentFullName = '';
  let studentSurname = '';
  let teacherCredentials = { email: '', password: '' };

  test.beforeAll(async ({ request }, testInfo) => {
    const suffix = buildUniqueSuffix(testInfo, 'removal-request');
    const teacher = await createTeacherViaAdmin(request, {
      suffix,
      firstName: 'Ирина',
      lastNamePrefix: 'E2EОткреплениеУчитель',
      password: 'RemovalRequestTeacher123!',
      birthDate: '1986-02-17',
      gender: 'female',
      position: 'Преподаватель',
      phone: '+79007778899',
      subjectName: 'Литература',
    });
    const student = await createAcceptedStudentForTeacher(request, {
      suffix,
      password: 'RemovalRequestStudent123!',
      teacherFullName: teacher.fullName,
      teacherEmail: teacher.email,
      teacherPassword: teacher.password,
      firstName: 'Открепляемый',
      lastNamePrefix: 'E2EОткрепление',
    });
    const teacherAuth = await loginViaApi(request, teacher.email, teacher.password);

    teacherToken = teacherAuth.access_token;
    teacherFullName = teacher.fullName;
    studentFullName = student.fullName;
    studentSurname = student.surname;
    teacherCredentials = { email: teacher.email, password: teacher.password };
  });

  test.beforeEach(async ({ request }) => {
    await rejectPendingRemovalRequestsForStudent(request, studentFullName);
  });

  test('teacher sees removal button and modal cancel keeps student detail intact', async ({ page }) => {
    await openTeacherStudentDetail(page, teacherCredentials, studentSurname, studentFullName);

    await expect(page.getByTestId('teacher-student-removal-trigger')).toBeVisible();
    await page.getByTestId('teacher-student-removal-trigger').click();
    await expect(page.getByTestId('teacher-student-removal-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.getByTestId('teacher-student-removal-modal')).toHaveCount(0);
    await expect(page.getByText(studentFullName)).toBeVisible();
  });

  test('teacher can send request and admin can reject it while student remains in teacher list', async ({
    page,
    request,
  }) => {
    await openTeacherStudentDetail(page, teacherCredentials, studentSurname, studentFullName);
    await page.getByTestId('teacher-student-removal-trigger').click();
    await page
      .getByTestId('teacher-student-removal-modal')
      .locator('textarea')
      .fill('Тестовый запрос на открепление.');
    await page.getByTestId('teacher-student-removal-confirm').click();
    await expect(page.getByText('Заявка отправлена администратору.')).toBeVisible();

    await openAdminRemovalRequests(page);
    const requestCard = page.getByTestId('admin-student-removal-request-card').filter({
      hasText: `${studentFullName}Ожидает решения`,
    });
    await expect(requestCard).toBeVisible();
    await requestCard.getByRole('button', { name: 'Отклонить' }).click();
    await expect(page.getByText('Заявка на открепление отклонена.')).toBeVisible();

    const teacherStudents = await listTeacherStudents(request, teacherToken);
    expect(teacherStudents.some((item) => item.full_name === studentFullName)).toBeTruthy();
  });

  test('admin can approve request and student disappears from teacher active list', async ({
    page,
    request,
  }) => {
    await openTeacherStudentDetail(page, teacherCredentials, studentSurname, studentFullName);
    await page.getByTestId('teacher-student-removal-trigger').click();
    await page.getByTestId('teacher-student-removal-confirm').click();
    await expect(page.getByText('Заявка отправлена администратору.')).toBeVisible();

    await openAdminRemovalRequests(page);
    const requestCard = page.getByTestId('admin-student-removal-request-card').filter({
      hasText: `${studentFullName}Ожидает решения`,
    });
    await expect(requestCard).toBeVisible();
    await requestCard.getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByText('Заявка на открепление подтверждена.')).toBeVisible();

    const teacherStudents = await listTeacherStudents(request, teacherToken);
    expect(teacherStudents.some((item) => item.full_name === studentFullName)).toBeFalsy();
  });

  test('admin can bulk delete selected and all removal requests', async ({ page, request }) => {
    const bulkStudent = await createAcceptedStudentForTeacher(request, {
      suffix: buildUniqueSuffix(undefined, 'removal-bulk'),
      password: 'RemovalBulkStudent123!',
      teacherFullName,
      teacherEmail: teacherCredentials.email,
      teacherPassword: teacherCredentials.password,
      firstName: 'Массовый',
      lastNamePrefix: 'E2EBulkОткрепление',
    });

    await createRemovalRequestForStudent(
      request,
      teacherToken,
      bulkStudent.userId,
      'Первая заявка для bulk delete.',
    );
    await rejectPendingRemovalRequestsForStudent(request, bulkStudent.fullName);

    await createRemovalRequestForStudent(
      request,
      teacherToken,
      bulkStudent.userId,
      'Вторая заявка для bulk delete.',
    );
    await rejectPendingRemovalRequestsForStudent(request, bulkStudent.fullName);

    await openAdminRemovalRequests(page);
    await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const bulkStudentCheckboxes = page.locator(
      `input[aria-label="Выбрать заявку ${bulkStudent.fullName}"]`,
    );

    await expect(bulkStudentCheckboxes).toHaveCount(2);
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Удалить' }).click();
    const enabledCheckboxes = page.locator(
      `input[aria-label="Выбрать заявку ${bulkStudent.fullName}"]:not([disabled])`,
    );
    await expect(enabledCheckboxes).toHaveCount(2);
    await enabledCheckboxes.first().check();
    await page.getByRole('button', { name: 'Удалить выбранные' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить заявки?' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText(/Заявк[аи] на открепление удален/)).toBeVisible();

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(
      page.locator(`input[aria-label="Выбрать заявку ${bulkStudent.fullName}"]`),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Удалить все доступные' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить заявки?' })).toBeVisible();
    await page.getByRole('button', { name: 'Удалить' }).last().click();
    await expect(page.getByText(/Заявк[аи] на открепление удален/)).toBeVisible();
    await expect(
      page.locator(`input[aria-label="Выбрать заявку ${bulkStudent.fullName}"]`),
    ).toHaveCount(0);
  });
});
