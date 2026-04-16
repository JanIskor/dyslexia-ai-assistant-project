import { expect, test } from '@playwright/test';

test('teacher ai assistant ux foundation', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/login');

  await page.getByPlaceholder('example@site.ru').fill('teacher.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('TeacherSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();

  await page.waitForURL('**/teacher');
  await page.getByRole('button', { name: 'ИИ-ассистент' }).click();

  const section = page.getByTestId('teacher-ai-assistant-section');
  const chat = page.getByTestId('teacher-ai-assistant-chat');
  const input = page.getByTestId('teacher-ai-assistant-input');
  const submitButton = page.getByTestId('teacher-ai-assistant-submit');

  await expect(section).toBeVisible();
  await expect(page.getByTestId('teacher-ai-assistant-empty-state')).toContainText(
    'Введите текст, который нужно адаптировать',
  );
  await expect(input).toHaveAttribute('placeholder', 'Вставьте учебный текст для адаптации...');

  await input.fill('Первая строка');
  await input.press('Shift+Enter');
  await input.type('Вторая строка');
  await expect(input).toHaveValue('Первая строка\nВторая строка');

  await input.press('Enter');

  await expect(page.getByTestId('teacher-ai-assistant-loading')).toContainText('Ассистент думает...');
  await expect(submitButton).toBeDisabled();
  await expect(page.getByTestId('teacher-ai-assistant-message-user')).toContainText(
    'Первая строка\nВторая строка',
  );
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant')).toContainText(
    'Это тестовый ответ ИИ-ассистента. Здесь позже будет адаптированный текст.',
  );

  const chatOverflowY = await chat.evaluate((element) => getComputedStyle(element).overflowY);

  console.log(
    JSON.stringify({
      teacherPageUrl: page.url(),
      assistantSectionVisible: await section.isVisible(),
      emptyStateVisibleBeforeFirstMessage: true,
      shiftEnterCreatesNewLine: true,
      sendButtonDisabledWhileLoading: true,
      userMessageRendered: await page.getByTestId('teacher-ai-assistant-message-user').textContent(),
      assistantReplyRendered: await page.getByTestId('teacher-ai-assistant-message-assistant').textContent(),
      chatOverflowY,
    }),
  );
});
