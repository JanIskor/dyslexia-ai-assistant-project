import { expect, test } from '@playwright/test';

test('teacher ai assistant ux foundation', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const response = await route.fetch();
    await page.waitForTimeout(450);
    await route.fulfill({ response });
  });

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
  const emptyState = page.getByTestId('teacher-ai-assistant-empty-state');

  await expect(section).toBeVisible();
  await expect(emptyState).toContainText('Введите текст, который нужно адаптировать');
  await expect(input).toHaveAttribute('placeholder', 'Вставьте учебный текст для адаптации...');
  await expect(submitButton).toBeDisabled();

  const initialInputHeight = await input.evaluate((element) => element.clientHeight);
  await input.fill('Первая строка');
  await input.press('Shift+Enter');
  await input.type('Вторая строка');
  await expect(input).toHaveValue('Первая строка\nВторая строка');
  await expect(submitButton).toBeEnabled();

  const expandedInputHeight = await input.evaluate((element) => element.clientHeight);
  const submitButtonBounds = await submitButton.boundingBox();

  await input.press('Enter');

  await expect(page.getByTestId('teacher-ai-assistant-loading')).toContainText('Ассистент печатает...');
  await expect(page.getByTestId('teacher-ai-assistant-typing-dots').locator('span')).toHaveCount(3);
  await expect(submitButton).toBeDisabled();
  await expect(page.getByTestId('teacher-ai-assistant-message-user')).toContainText(
    'Первая строка\nВторая строка',
  );
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant')).toContainText(
    'Это тестовый ответ ИИ-ассистента. Здесь позже будет адаптированный текст.',
  );

  const autoScrollAfterFirstReply = await chat.evaluate((element) => {
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceToBottom < 4;
  });

  for (let index = 0; index < 12; index += 1) {
    await input.fill(`Сообщение ${index + 2}`);
    await submitButton.click();
    await expect(page.getByTestId('teacher-ai-assistant-loading')).toBeVisible();
    await expect(page.getByTestId('teacher-ai-assistant-message-assistant').last()).toContainText(
      'Это тестовый ответ ИИ-ассистента. Здесь позже будет адаптированный текст.',
    );
  }

  const chatOverflowY = await chat.evaluate((element) => getComputedStyle(element).overflowY);
  const chatMetrics = await chat.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  const isChatScrollable = chatMetrics.scrollHeight > chatMetrics.clientHeight;

  await chat.evaluate((element) => {
    element.scrollTop = 0;
  });

  const windowScrollBeforeWheel = await page.evaluate(() => window.scrollY);
  await chat.hover();
  await chat.click();
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(150);

  const scrollIsolation = await Promise.all([
    page.evaluate(() => window.scrollY),
    chat.evaluate((element) => element.scrollTop),
  ]);

  const [windowScrollAfterWheel, chatScrollAfterWheel] = scrollIsolation;

  console.log(
    JSON.stringify({
      teacherPageUrl: page.url(),
      assistantSectionVisible: await section.isVisible(),
      emptyStateVisibleBeforeFirstMessage: true,
      shiftEnterCreatesNewLine: true,
      compactInputHeightPx: initialInputHeight,
      expandedInputHeightPx: expandedInputHeight,
      inputAutoResized: expandedInputHeight > initialInputHeight,
      inputGrowthLimited: expandedInputHeight <= 224,
      sendButtonEnabledWithText: true,
      sendButtonDisabledWhileLoading: true,
      sendButtonIsRound: submitButtonBounds ? Math.abs(submitButtonBounds.width - submitButtonBounds.height) < 2 : false,
      typingDotsCount: await page.getByTestId('teacher-ai-assistant-typing-dots').locator('span').count(),
      userMessageRendered: await page.getByTestId('teacher-ai-assistant-message-user').first().textContent(),
      assistantReplyRendered: await page.getByTestId('teacher-ai-assistant-message-assistant').first().textContent(),
      chatOverflowY,
      chatScrollable: isChatScrollable,
      autoScrollAfterFirstReply,
      windowScrollBeforeWheel,
      windowScrollAfterWheel,
      chatScrollAfterWheel,
      chatOwnScrollUsed: chatScrollAfterWheel > 0 && windowScrollAfterWheel === windowScrollBeforeWheel,
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
