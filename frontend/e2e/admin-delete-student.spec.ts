import { expect, test } from '@playwright/test';

import {
  createAcceptedStudentForTeacher,
  createTeacherViaAdmin,
  getTeacherNotificationsCount,
} from './helpers/adminSeeds';
import {
  BACKEND_BASE_URL,
  loginAdminViaUi,
  loginViaApi,
} from './helpers/auth';
import { buildUniqueSuffix } from './helpers/testData';

test.describe.serial('admin delete student', () => {
  let teacherToken = '';
  let teacherNotificationsBeforeCount = 0;
  let studentFullName = '';
  let studentSurname = '';
  let studentEmail = '';
  let studentPassword = '';

  test.beforeAll(async ({ request }, testInfo) => {
    const suffix = buildUniqueSuffix(testInfo, 'delete-student');
    const createdTeacher = await createTeacherViaAdmin(request, {
      suffix,
      firstName: 'Николай',
      lastNamePrefix: 'E2EУдалениеСтудентаУчитель',
      password: 'DeleteStudentTeacher123!',
      birthDate: '1987-03-18',
      gender: 'male',
      position: 'Преподаватель',
      phone: '+79006667788',
      subjectName: 'Русский язык',
    });
    const createdStudent = await createAcceptedStudentForTeacher(request, {
      suffix,
      password: 'DeleteStudentE2E123!',
      teacherFullName: createdTeacher.fullName,
      teacherEmail: createdTeacher.email,
      teacherPassword: createdTeacher.password,
      firstName: 'Удаляемый',
      lastNamePrefix: 'E2EУдалениеУченика',
    });

    const teacherAuth = await loginViaApi(request, createdTeacher.email, createdTeacher.password);

    teacherToken = teacherAuth.access_token;
    teacherNotificationsBeforeCount = await getTeacherNotificationsCount(request, teacherToken);
    studentFullName = createdStudent.fullName;
    studentSurname = createdStudent.surname;
    studentEmail = createdStudent.email;
    studentPassword = createdStudent.password;
  });

  test('admin sees delete student button, modal appears, and cancel keeps student', async ({ page }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Ученики' }).click();
    await page.getByLabel('Поиск учеников').fill(studentSurname);

    await page.getByRole('heading', { name: studentFullName }).click();
    await expect(page.getByRole('button', { name: 'Удалить ученика' })).toBeVisible();

    await page.getByRole('button', { name: 'Удалить ученика' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить ученика?' })).toBeVisible();
    await expect(
      page.getByText(
        'Ученик будет деактивирован и больше не сможет пользоваться системой. Если ученик связан с преподавателем, преподаватель получит уведомление.',
      ),
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
    await page.getByLabel('Поиск учеников').fill(studentSurname);

    await page.getByRole('heading', { name: studentFullName }).click();
    await page.getByRole('button', { name: 'Удалить ученика' }).click();
    await page.getByRole('button', { name: 'Удалить', exact: true }).click();

    await expect(page.getByText('Ученик удалён.')).toBeVisible();
    await expect(page.getByText(studentFullName)).toHaveCount(0);

    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();
    await expect(page.getByText(studentFullName)).toHaveCount(0);

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
          item.message.includes(studentFullName),
      ),
    ).toBeTruthy();

    const deletedStudentLogin = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      data: { email: studentEmail, password: studentPassword },
    });
    expect(deletedStudentLogin.ok()).toBeFalsy();
  });
});
