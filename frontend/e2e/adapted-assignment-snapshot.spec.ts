import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

async function loginViaUi(
  page: Page,
  credentials: { email: string; password: string },
  expectedPath: '/teacher' | '/student',
) {
  await page.goto(`${FRONTEND_BASE_URL}/login`);
  await page.getByPlaceholder('example@site.ru').fill(credentials.email);
  await page.getByPlaceholder('Введите пароль').fill(credentials.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(`**${expectedPath}`);
}

async function loginViaApi(
  request: APIRequestContext,
  credentials: { email: string; password: string },
) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
    data: credentials,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { access_token: string; token_type: string };
}

test('selected adapted version assignment uses snapshot and student does not see later live updates', async ({
  browser,
  request,
  page,
}) => {
  const teacherCredentials = {
    email: 'teacher.seed@example.com',
    password: 'TeacherSeed123!',
  };
  const studentCredentials = {
    email: 'student.seed@example.com',
    password: 'StudentSeed123!',
  };

  const teacherAuth = await loginViaApi(request, teacherCredentials);
  const studentAuth = await loginViaApi(request, studentCredentials);
  const studentMeResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${studentAuth.access_token}`,
    },
  });
  expect(studentMeResponse.ok()).toBeTruthy();
  const studentMe = (await studentMeResponse.json()) as { id: string };

  const suffix = Date.now();
  const sourceTitle = `Lifecycle source ${suffix}`;
  const sourceText = `Исходный текст для snapshot audit ${suffix}.`;
  const basicText = `Базовая версия ${suffix}.`;
  const structuredText = `Пошаговая версия ${suffix}.`;
  const structuredUpdatedText = `Новая live версия ${suffix}, которую ученик не должен увидеть.`;

  const createSourceResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/teacher/materials`, {
    headers: {
      Authorization: `Bearer ${teacherAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title: sourceTitle,
      original_text: sourceText,
    },
  });
  expect(createSourceResponse.ok()).toBeTruthy();
  const sourceMaterial = (await createSourceResponse.json()) as { id: string };

  const basicSaveResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/ai-assistant/save-material`,
    {
      headers: {
        Authorization: `Bearer ${teacherAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: sourceTitle,
        original_text: sourceText,
        adapted_text: basicText,
        source_type: 'material',
        source_material_id: sourceMaterial.id,
        adaptation_mode: 'basic_simplify',
      },
    },
  );
  expect(basicSaveResponse.ok()).toBeTruthy();
  const basicVersion = (await basicSaveResponse.json()) as { id: string };

  const structuredSaveResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/ai-assistant/save-material`,
    {
      headers: {
        Authorization: `Bearer ${teacherAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: sourceTitle,
        original_text: sourceText,
        adapted_text: structuredText,
        source_type: 'material',
        source_material_id: sourceMaterial.id,
        adaptation_mode: 'structured_explanation',
      },
    },
  );
  expect(structuredSaveResponse.ok()).toBeTruthy();
  const structuredVersion = (await structuredSaveResponse.json()) as { id: string };

  await page.route(`${BACKEND_BASE_URL}/api/v1/teacher/students?page=1&page_size=100`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: studentMe.id,
            full_name: 'Иванов Андрей Викторович',
            grade_label: '4А класс',
            avatar_url: null,
          },
        ],
        total: 1,
        page: 1,
        page_size: 100,
        pages: 1,
      }),
    });
  });

  await loginViaUi(page, teacherCredentials, '/teacher');
  await page.getByRole('button', { name: 'Материалы' }).click();
  await page.getByTestId('teacher-materials-tab-adapted').click();
  await page.getByText(sourceTitle).click();

  await page
    .getByTestId('teacher-adapted-material-version-selector')
    .selectOption({ label: 'Сделать пошаговым' });
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(structuredText);

  await page.getByRole('button', { name: 'Назначить ученику' }).click();
  await page.getByRole('button', { name: /Иванов Андрей Викторович/ }).click();
  await page.getByRole('button', { name: /^Назначить$/ }).click();
  await expect(page.getByText('Материал назначен ученику')).toBeVisible();

  await page
    .getByTestId('teacher-adapted-material-version-selector')
    .selectOption({ label: 'Упростить текст' });
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(basicText);

  await page.getByRole('button', { name: 'Назначить ученику' }).click();
  await page.getByRole('button', { name: /Иванов Андрей Викторович/ }).click();
  await page.getByRole('button', { name: /^Назначить$/ }).click();
  await expect(page.getByText('Материал назначен ученику')).toBeVisible();

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();

  await loginViaUi(studentPage, studentCredentials, '/student');
  await studentPage.getByRole('button', { name: 'Учебные материалы' }).click();

  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(basicText)).toBeVisible();

  await studentPage.getByRole('button').filter({ hasText: structuredText }).first().click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText('Сравнить')).toHaveCount(0);
  await expect(studentPage.getByText('Версия адаптации')).toHaveCount(0);
  await studentPage.getByRole('button', { name: 'Назад к материалам' }).click();

  await studentPage.getByRole('button').filter({ hasText: basicText }).first().click();
  await expect(studentPage.getByText(basicText)).toBeVisible();
  await studentPage.getByRole('button', { name: 'Назад к материалам' }).click();

  const structuredUpdateResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/ai-assistant/save-material`,
    {
      headers: {
        Authorization: `Bearer ${teacherAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: sourceTitle,
        original_text: sourceText,
        adapted_text: structuredUpdatedText,
        source_type: 'material',
        source_material_id: sourceMaterial.id,
        adaptation_mode: 'structured_explanation',
      },
    },
  );
  expect(structuredUpdateResponse.ok()).toBeTruthy();
  const structuredUpdatedVersion = (await structuredUpdateResponse.json()) as { id: string };
  expect(structuredUpdatedVersion.id).toBe(structuredVersion.id);

  await studentPage.reload();
  await studentPage.getByRole('button', { name: 'Учебные материалы' }).click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(structuredUpdatedText)).toHaveCount(0);

  await studentPage.getByRole('button').filter({ hasText: structuredText }).first().click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(structuredUpdatedText)).toHaveCount(0);

  console.log(
    JSON.stringify({
      scenario: 'adapted-assignment-snapshot',
      sourceTitle,
      basicVersionId: basicVersion.id,
      structuredVersionId: structuredVersion.id,
      studentId: studentMe.id,
      structuredSnapshotVisible: await studentPage.getByText(structuredText).isVisible(),
      structuredLiveUpdateVisible: await studentPage.getByText(structuredUpdatedText).count(),
    }),
  );

  await studentContext.close();
});
