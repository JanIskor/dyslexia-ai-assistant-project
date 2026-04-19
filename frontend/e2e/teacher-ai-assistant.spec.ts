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

test('teacher ai assistant composer shows one plus menu and sends selected mode', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: `Mode received: ${requestBody.mode}`,
      }),
    });
  });

  await loginAsTeacher(page);

  const actionsButton = page.getByTestId('teacher-ai-assistant-actions-trigger');
  const modeButton = page.getByTestId('teacher-ai-assistant-mode-button');

  await expect(actionsButton).toBeVisible();
  await expect(modeButton).toContainText('Упростить текст');

  await actionsButton.click();
  await expect(page.getByTestId('teacher-ai-assistant-actions-menu')).toBeVisible();
  await expect(page.getByTestId('teacher-ai-assistant-action-material')).toContainText('Материал');
  await expect(page.getByTestId('teacher-ai-assistant-action-file')).toContainText('Файл');

  await modeButton.click();
  await expect(page.getByTestId('teacher-ai-assistant-mode-menu')).toBeVisible();
  await page.getByTestId('teacher-ai-assistant-mode-option-structured_explanation').click();
  await expect(modeButton).toContainText('Сделать пошаговым');

  await page.getByTestId('teacher-ai-assistant-input').fill('Проверка отправки после смены режима');
  await page.getByTestId('teacher-ai-assistant-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Mode received: structured_explanation',
  );

  console.log(
    JSON.stringify({
      scenario: 'composer-mode-contract',
      actionsButtonVisible: await actionsButton.isVisible(),
      selectedMode: await modeButton.textContent(),
      assistantReply: await page.getByTestId('teacher-ai-assistant-message-assistant').first().textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows rag transparency block when knowledge chunks are used', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Растения превращают солнечный свет, воду и углекислый газ в питание и выделяют кислород.',
        used_knowledge_chunks: [
          {
            document_title: 'photosynthesis',
            chunk_index: 0,
          },
          {
            document_title: 'formative_feedback',
            chunk_index: 1,
          },
        ],
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Адаптируй текст про фотосинтез');
  await page.getByTestId('teacher-ai-assistant-submit').click();

  const knowledgeBlock = page.getByTestId('teacher-ai-assistant-knowledge-usage').first();
  await expect(knowledgeBlock).toContainText('Ответ основан на материалах (2)');

  const knowledgeList = page.getByTestId('teacher-ai-assistant-knowledge-list').first();
  await expect(knowledgeList).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-knowledge-toggle').first().click();
  await expect(knowledgeList).toBeVisible();
  await expect(page.getByTestId('teacher-ai-assistant-knowledge-item')).toHaveCount(2);
  await expect(page.getByTestId('teacher-ai-assistant-knowledge-item').nth(0)).toContainText(
    'photosynthesis — chunk 0',
  );
  await expect(page.getByTestId('teacher-ai-assistant-knowledge-item').nth(1)).toContainText(
    'formative_feedback — chunk 1',
  );

  console.log(
    JSON.stringify({
      scenario: 'rag-transparency-visible',
      transparencyLabel: await knowledgeBlock.textContent(),
      firstKnowledgeItem: await page.getByTestId('teacher-ai-assistant-knowledge-item').nth(0).textContent(),
      secondKnowledgeItem: await page.getByTestId('teacher-ai-assistant-knowledge-item').nth(1).textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant hides rag transparency block when no knowledge chunks were used', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Короткий и понятный ответ без обращения к базе знаний.',
        used_knowledge_chunks: [],
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Обычный запрос без knowledge');
  await page.getByTestId('teacher-ai-assistant-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Короткий и понятный ответ без обращения к базе знаний.',
  );
  await expect(page.getByTestId('teacher-ai-assistant-knowledge-usage')).toHaveCount(0);

  console.log(
    JSON.stringify({
      scenario: 'rag-transparency-hidden',
      knowledgeBlocksCount: await page.getByTestId('teacher-ai-assistant-knowledge-usage').count(),
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

test('teacher can save assistant reply as material', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Короткий и понятный адаптированный текст для ученика.',
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '55555555-5555-5555-5555-555555555555',
        title: requestBody.title,
        original_text: requestBody.adapted_text,
        material_type: 'text',
        status: 'draft',
        created_at: '2026-04-17T10:00:00Z',
        updated_at: '2026-04-17T10:00:00Z',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Исходный текст для адаптации');
  await page.getByTestId('teacher-ai-assistant-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Короткий и понятный адаптированный текст для ученика.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await page.getByTestId('teacher-ai-save-material-title').fill('Материал из ИИ');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Материал сохранён.');
    await dialog.accept();
  });
  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Материал сохранён. Он доступен во вкладке "Материалы".',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-success',
      saveSuccessBanner: await page
        .getByTestId('teacher-ai-assistant-save-material-success')
        .textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows save material error', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Ответ ассистента для проверки ошибки сохранения.',
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Save material failed',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Текст для ошибки сохранения');
  await page.getByTestId('teacher-ai-assistant-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toBeVisible();

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await page.getByTestId('teacher-ai-save-material-title').fill('Материал с ошибкой');
  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-save-material-error')).toContainText(
    'Ошибка сервера. Попробуйте ещё раз позже.',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-error',
      saveError: await page.getByTestId('teacher-ai-save-material-error').textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
