import { expect, test, type Page } from '@playwright/test';

async function loginAsTeacher(page: Page) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByPlaceholder('example@site.ru').fill('teacher.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('TeacherSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/teacher');
  await page.getByRole('button', { name: 'ИИ-ассистент' }).click();
}

test('teacher ai assistant returns real adapted text', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const response = await route.fetch();
    await page.waitForTimeout(500);
    await route.fulfill({ response });
  });

  await loginAsTeacher(page);

  const input = page.getByTestId('teacher-ai-assistant-input');
  const submitButton = page.getByTestId('teacher-ai-assistant-submit');
  const sourceText =
    'Сложные биологические процессы требуют последовательного объяснения, потому что в них участвует много взаимосвязанных этапов.';

  await input.fill(sourceText);
  await expect(submitButton).toBeEnabled();
  await input.press('Enter');

  await expect(page.getByTestId('teacher-ai-assistant-loading')).toContainText('Ассистент печатает...');
  await expect(submitButton).toBeDisabled();
  await expect(page.getByTestId('teacher-ai-assistant-message-user').first()).toContainText(sourceText);

  const assistantMessage = page.getByTestId('teacher-ai-assistant-message-assistant').first();
  await expect(assistantMessage).toBeVisible({ timeout: 30000 });

  const assistantReply = (await assistantMessage.textContent())?.trim() ?? '';

  expect(assistantReply.length).toBeGreaterThan(30);
  expect(assistantReply).not.toBe(sourceText);
  await expect(page.getByTestId('teacher-ai-assistant-loading')).toHaveCount(0);

  console.log(
    JSON.stringify({
      scenario: 'real-success',
      teacherPageUrl: page.url(),
      sendButtonDisabledWhileLoading: true,
      userMessageRendered: sourceText,
      assistantReply,
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows backend error in UI', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await page.waitForTimeout(400);
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Не удалось получить ответ от GigaChat.',
      }),
    });
  });

  await loginAsTeacher(page);

  const input = page.getByTestId('teacher-ai-assistant-input');
  const submitButton = page.getByTestId('teacher-ai-assistant-submit');

  await input.fill('Проверка отображения ошибки');
  await submitButton.click();

  await expect(page.getByTestId('teacher-ai-assistant-loading')).toContainText('Ассистент печатает...');
  await expect(page.getByTestId('teacher-ai-assistant-error')).toContainText(
    'Не удалось получить ответ от GigaChat.',
  );
  await expect(page.getByTestId('teacher-ai-assistant-loading')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant')).toHaveCount(0);
  await expect(submitButton).toBeDisabled();

  console.log(
    JSON.stringify({
      scenario: 'ui-error',
      displayedError: await page.getByTestId('teacher-ai-assistant-error').textContent(),
      assistantMessagesCount: await page.getByTestId('teacher-ai-assistant-message-assistant').count(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
