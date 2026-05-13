import { expect, test } from '@playwright/test';

import {
  createAcceptedStudentForTeacher,
  createTeacherViaAdmin,
} from './helpers/adminSeeds';
import { loginAdminViaUi } from './helpers/auth';
import { buildUniqueSuffix } from './helpers/testData';

test.describe.serial('admin delete teacher simplified', () => {
  let teacherFullName = '';
  let teacherSurname = '';
  let studentFullName = '';
  let studentSurname = '';

  test.beforeAll(async ({ request }, testInfo) => {
    const suffix = buildUniqueSuffix(testInfo, 'delete-teacher');
    const createdTeacher = await createTeacherViaAdmin(request, {
      suffix,
      firstName: 'Мария',
      lastNamePrefix: 'E2EУдалениеПреподавателя',
      password: 'DeleteTeacherE2E123!',
      birthDate: '1988-06-15',
      gender: 'female',
      position: 'Преподаватель',
      phone: '+79005554433',
      subjectName: 'Литература',
    });

    const createdStudent = await createAcceptedStudentForTeacher(request, {
      suffix,
      password: 'DeleteTeacherStudent123!',
      teacherFullName: createdTeacher.fullName,
      teacherEmail: createdTeacher.email,
      teacherPassword: createdTeacher.password,
      firstName: 'Освобождаемый',
      lastNamePrefix: 'E2EПослеУдаленияУчителя',
    });

    teacherFullName = createdTeacher.fullName;
    teacherSurname = createdTeacher.surname;
    studentFullName = createdStudent.fullName;
    studentSurname = createdStudent.surname;
  });

  test('admin sees delete teacher button, modal shows active students count, and cancel keeps teacher', async ({
    page,
  }) => {
    await loginAdminViaUi(page);
    await page.getByRole('button', { name: 'Преподаватели' }).click();
    await page.getByLabel('Поиск преподавателей').fill(teacherSurname);

    await page.getByRole('heading', { name: teacherFullName }).click();
    await expect(page.getByRole('button', { name: 'Удалить преподавателя' })).toBeVisible();

    await page.getByRole('button', { name: 'Удалить преподавателя' }).click();
    await expect(page.getByRole('heading', { name: 'Удалить преподавателя?' })).toBeVisible();
    await expect(
      page.getByText(
        'У этого преподавателя сейчас 1 учеников из 15. После удаления преподавателя все его ученики перейдут в состояние "ожидает назначения".',
      ),
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
    await page.getByLabel('Поиск преподавателей').fill(teacherSurname);

    await page.getByRole('heading', { name: teacherFullName }).click();
    await page.getByRole('button', { name: 'Удалить преподавателя' }).click();
    await page.getByRole('button', { name: 'Удалить', exact: true }).click();

    await expect(
      page.getByText('Преподаватель удалён. Ученики переведены в ожидание назначения.'),
    ).toBeVisible();
    await expect(page.getByText(teacherFullName)).toHaveCount(0);

    await page.getByTestId('admin-sidebar-student-applications-tab').click();
    await page.getByRole('button', { name: 'Требуют назначения' }).click();
    await page.getByLabel('Поиск заявок учеников').fill(studentSurname);

    const studentCard = page.locator('li').filter({ hasText: studentFullName }).first();
    await expect(studentCard).toBeVisible();
    await expect(studentCard.getByText('Требует назначения')).toBeVisible();
  });
});
