import { expect, test, type Page } from '@playwright/test';

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

async function loginAdminViaUi(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Введите пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/admin');
}

test.describe.serial('admin teacher assignment tab', () => {
  test('admin sees teacher assignment tab without assignment block and create teacher form works', async ({
    page,
  }) => {
    await loginAdminViaUi(page);
    await expect(page.getByTestId('admin-sidebar-teacher-assignment-tab')).toBeVisible();
    await page.getByTestId('admin-sidebar-teacher-assignment-tab').click();

    await expect(page.getByRole('heading', { name: 'Создать преподавателя' })).toBeVisible();
    await expect(page.getByText('Эта вкладка теперь отвечает только за создание новой учётной записи преподавателя.')).toBeVisible();
    await expect(page.getByText('Назначить ученика преподавателю')).toHaveCount(0);
    await expect(page.getByText(STUDENT_FULL_NAME)).toHaveCount(0);

    await page.locator('#admin-create-teacher-email').fill(CREATED_TEACHER_EMAIL);
    await page.locator('#admin-create-teacher-password').fill(CREATED_TEACHER_PASSWORD);
    await page.locator('#admin-create-teacher-first-name').fill(CREATED_TEACHER_FIRST_NAME);
    await page.locator('#admin-create-teacher-last-name').fill(CREATED_TEACHER_LAST_NAME);
    await page.locator('#admin-create-teacher-birth-date').fill('1989-04-12');
    await expect(page.locator('#admin-create-teacher-work-email')).toHaveCount(0);
    await page.locator('#admin-create-teacher-gender').selectOption('female');
    await page.locator('#admin-create-teacher-position').fill('Учитель-логопед');
    await page.locator('#admin-create-teacher-phone').fill('+79001234567');
    await page.locator('#admin-create-teacher-subject-name').fill('Русский язык');
    await page.getByRole('button', { name: 'Создать преподавателя' }).click();

    await expect(page.getByTestId('admin-create-teacher-message')).toHaveText(
      `Преподаватель ${CREATED_TEACHER_FULL_NAME} создан.`,
    );

    await page.getByTestId('admin-sidebar-teachers-tab').click();
    await page.getByRole('heading', { name: CREATED_TEACHER_FULL_NAME }).click();
    await expect(page.getByText(CREATED_TEACHER_EMAIL)).toBeVisible();
    await expect(page.getByText('Женский')).toBeVisible();
  });
});
