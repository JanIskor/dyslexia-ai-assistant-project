import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

async function loginViaUi(page: Page) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill('teacher.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('TeacherSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/teacher');
  await page.getByRole('button', { name: 'Материалы' }).click();
}

async function loginViaApi(request: APIRequestContext) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
    data: {
      email: 'teacher.seed@example.com',
      password: 'TeacherSeed123!',
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { access_token: string };
}

test('delete button is visible in draft detail and cancel keeps material', async ({ page, request }) => {
  const teacherAuth = await loginViaApi(request);
  const suffix = Date.now();
  const title = `Soft delete draft ${suffix}`;

  const createResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/teacher/materials`, {
    headers: {
      Authorization: `Bearer ${teacherAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title,
      original_text: `Черновой текст ${suffix}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await loginViaUi(page);
  await page.getByText(title).click();

  await expect(page.getByTestId('teacher-material-delete-trigger')).toBeVisible();
  await page.getByTestId('teacher-material-delete-trigger').click();
  await expect(page.getByTestId('teacher-material-delete-modal')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByTestId('teacher-material-delete-modal')).toHaveCount(0);
  await expect(page.getByText(title)).toBeVisible();
});

test('delete button is visible in adapted detail and confirmed delete removes material from list', async ({
  page,
  request,
}) => {
  const teacherAuth = await loginViaApi(request);
  const suffix = Date.now();
  const sourceTitle = `Soft delete source ${suffix}`;
  const adaptedTitle = `Soft delete adapted ${suffix}`;
  const sourceText = `Исходный текст для soft delete ${suffix}.`;

  const sourceResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/teacher/materials`, {
    headers: {
      Authorization: `Bearer ${teacherAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title: sourceTitle,
      original_text: sourceText,
    },
  });
  expect(sourceResponse.ok()).toBeTruthy();
  const sourceMaterial = (await sourceResponse.json()) as { id: string };

  const adaptedResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/ai-assistant/save-material`,
    {
      headers: {
        Authorization: `Bearer ${teacherAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: adaptedTitle,
        original_text: sourceText,
        adapted_text: `Адаптированный текст для удаления ${suffix}.`,
        source_type: 'material',
        source_material_id: sourceMaterial.id,
        adaptation_mode: 'basic_simplify',
      },
    },
  );
  expect(adaptedResponse.ok()).toBeTruthy();

  await loginViaUi(page);
  await page.getByTestId('teacher-materials-tab-adapted').click();
  await page.getByText(adaptedTitle).click();

  await expect(page.getByTestId('teacher-material-delete-trigger')).toBeVisible();
  await page.getByTestId('teacher-material-delete-trigger').click();
  await expect(page.getByTestId('teacher-material-delete-modal')).toBeVisible();
  await page.getByTestId('teacher-material-delete-confirm').click();

  await expect(page.getByText('Материал удалён.')).toBeVisible();
  await expect(page.getByText(adaptedTitle)).toHaveCount(0);
});
