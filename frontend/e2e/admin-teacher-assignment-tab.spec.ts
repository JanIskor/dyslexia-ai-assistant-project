import { expect, test } from '@playwright/test';

import { loginAdminViaUi } from './helpers/auth';
import { buildUniqueSuffix } from './helpers/testData';

test.describe.serial('admin teacher assignment tab', () => {
  test('admin sees teacher assignment tab without assignment block and create teacher form works', async ({
    page,
  }, testInfo) => {
    const suffix = buildUniqueSuffix(testInfo, 'teacher-tab');
    const createdTeacherEmail = `teacher.e2e.${suffix}@example.com`;
    const createdTeacherPassword = 'AssignmentTabTeacher123!';
    const createdTeacherFirstName = 'Ирина';
    const createdTeacherLastName = `Назначение${suffix}`;
    const createdTeacherFullName = `${createdTeacherLastName} ${createdTeacherFirstName}`;

    await loginAdminViaUi(page);
    await expect(page.getByTestId('admin-sidebar-teacher-assignment-tab')).toBeVisible();
    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();

    await expect(page.getByRole('heading', { name: 'Создать преподавателя' })).toBeVisible();
    await expect(
      page.getByText('Эта вкладка теперь отвечает только за создание новой учётной записи преподавателя.'),
    ).toBeVisible();
    await expect(page.getByText('Назначить ученика преподавателю')).toHaveCount(0);

    await page.locator('#admin-create-teacher-email').fill(createdTeacherEmail);
    await page.locator('#admin-create-teacher-password').fill(createdTeacherPassword);
    await page.locator('#admin-create-teacher-first-name').fill(createdTeacherFirstName);
    await page.locator('#admin-create-teacher-last-name').fill(createdTeacherLastName);
    await page.locator('#admin-create-teacher-birth-date').fill('1989-04-12');
    await expect(page.locator('#admin-create-teacher-work-email')).toHaveCount(0);
    await page.locator('#admin-create-teacher-gender').selectOption('female');
    await page.locator('#admin-create-teacher-position').fill('Учитель-логопед');
    await page.locator('#admin-create-teacher-phone').fill('+79001234567');
    await page.locator('#admin-create-teacher-subject-name').fill('Русский язык');
    await page.getByRole('button', { name: 'Создать преподавателя' }).click();

    await expect(page.getByTestId('admin-create-teacher-message')).toHaveText(
      `Преподаватель ${createdTeacherFullName} создан.`,
    );

    await page.getByTestId('admin-sidebar-teachers-tab').click();
    await page.getByLabel('Поиск преподавателей').fill(createdTeacherLastName);
    await page.getByRole('heading', { name: createdTeacherFullName }).click();
    await expect(page.getByText(createdTeacherEmail)).toBeVisible();
    await expect(page.getByText('Женский')).toBeVisible();
  });
});
