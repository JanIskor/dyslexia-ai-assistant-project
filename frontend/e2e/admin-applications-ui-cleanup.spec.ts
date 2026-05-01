import { expect, test, type Page, type Route } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_EMAIL = 'admin.seed@example.com';
const ADMIN_PASSWORD = 'AdminSeed123!';

function buildApplications(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `application-${index + 1}`,
    full_name: `Ученик ${index + 1}`,
    status: 'Новая',
    request_kind: 'initial_profile',
    request_kind_label: 'Первичная анкета',
  }));
}

function buildRemovalRequests(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `removal-${index + 1}`,
    status: 'pending',
    reason: `Причина ${index + 1}`,
    admin_comment: null,
    created_at: '2026-05-01T10:00:00Z',
    resolved_at: null,
    resolved_by_admin_user_id: null,
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
  test('applications placeholder, bulk delete ui and pagination work as expected', async ({ page }) => {
    await page.route('**/api/v1/admin/applications/filters', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statuses: [{ value: 'Новая', label: 'Новая' }],
        }),
      });
    });

    await page.route('**/api/v1/admin/applications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: buildApplications(11),
        }),
      });
    });

    await page.route('**/api/v1/admin/student-removal-requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: buildRemovalRequests(11),
        }),
      });
    });

    await loginAdminViaUi(page);

    await expect(page.getByPlaceholder('Поиск по первому слову...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Удалить' })).toBeVisible();
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();
    await expect(page.getByText('Ученик 10')).toBeVisible();
    await expect(page.getByText('Ученик 11')).toHaveCount(0);

    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByText('Ученик 11')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(1);

    await page.getByTestId('admin-sidebar-student-removal-requests-tab').click();
    await expect(page.getByRole('heading', { name: 'Заявки на открепление' })).toBeVisible();
    await expect(page.getByTestId('admin-student-removal-request-card')).toHaveCount(10);
    await expect(page.getByText('Страница 1 из 2')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(10);
    await page.getByRole('button', { name: 'Отмена' }).click();
    await expect(page.locator('input[type="checkbox"][aria-label^="Выбрать заявку "]')).toHaveCount(0);

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
