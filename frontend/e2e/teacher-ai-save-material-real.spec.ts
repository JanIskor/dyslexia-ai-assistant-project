import { expect, test, type Page } from '@playwright/test';

async function loginAsTeacher(page: Page) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByPlaceholder('example@site.ru').fill('teacher.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('TeacherSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/teacher');
}

test('teacher can save real assistant reply and see it in materials', async ({ page }) => {
  const materialTitle = `AI real save ${Date.now()}`;

  await loginAsTeacher(page);
  await page.getByRole('button', { name: 'ИИ-ассистент' }).click();

  await page
    .getByTestId('teacher-ai-assistant-input')
    .fill(
      'Солнце нагревает воду. Вода испаряется, потом превращается в облака и снова падает дождём.',
    );
  await page.getByTestId('teacher-ai-assistant-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await page.getByTestId('teacher-ai-save-material-title').fill(materialTitle);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Материал сохранён. Он доступен во вкладке "Материалы".',
  );

  await page.getByRole('button', { name: 'Материалы' }).click();
  await expect(page.getByText(materialTitle)).toBeVisible({ timeout: 10000 });

  console.log(
    JSON.stringify({
      scenario: 'real-save-material',
      materialTitle,
    }),
  );
});
