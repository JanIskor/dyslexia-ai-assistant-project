import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_BASE_URL ?? 'http://127.0.0.1:3000';
export const BACKEND_BASE_URL = process.env.E2E_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';

export const ADMIN_CREDENTIALS = {
  email: 'admin.seed@example.com',
  password: 'AdminSeed123!',
};

export const TEACHER_SEED_CREDENTIALS = {
  email: 'teacher.seed@example.com',
  password: 'TeacherSeed123!',
};

export async function loginViaApi(
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

export async function loginViaUi(
  page: Page,
  credentials: { email: string; password: string },
  expectedPath: '/admin' | '/teacher' | '/student',
) {
  const { access_token } = await loginViaApi(page.request, credentials.email, credentials.password);
  await page.goto(FRONTEND_BASE_URL);
  await page.evaluate((token) => {
    window.localStorage.setItem('auth.access_token', token);
    window.sessionStorage.removeItem('auth.access_token');
  }, access_token);
  await page.goto(`${FRONTEND_BASE_URL}${expectedPath}`);
  await page.waitForURL(`**${expectedPath}`);

  if (expectedPath === '/admin') {
    await expect(page.getByTestId('admin-sidebar-student-applications-tab')).toBeVisible({
      timeout: 15000,
    });
    return;
  }

  if (expectedPath === '/teacher') {
    await expect(page.getByRole('button', { name: 'Список учеников' })).toBeVisible({
      timeout: 15000,
    });
    return;
  }

  await expect(page.getByRole('button', { name: 'Учебные материалы' })).toBeVisible({
    timeout: 15000,
  });
}

export async function loginAdminViaUi(page: Page) {
  await loginViaUi(page, ADMIN_CREDENTIALS, '/admin');
}
