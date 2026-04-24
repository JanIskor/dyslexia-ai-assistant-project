import { expect, test, type Page } from '@playwright/test';

async function loginAsTeacher(
  page: Page,
  credentials: { email: string; password: string } = {
    email: 'teacher.seed@example.com',
    password: 'TeacherSeed123!',
  },
) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByPlaceholder('example@site.ru').fill(credentials.email);
  await page.getByPlaceholder('Введите пароль').fill(credentials.password);
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

test('teacher ai assistant can use existing material as input source', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: `Source received: ${requestBody.message}`,
        used_knowledge_chunks: [],
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-material').click();
  await expect(page.getByText('Source-aware material 20260421-1')).toHaveCount(0);
  await page
    .getByTestId('teacher-ai-assistant-material-option')
    .filter({ hasText: 'Assistant Source Material Real' })
    .click();

  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText(
    'Материал: Assistant Source Material Real',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-collapsed')).toContainText(
    'Материал: Assistant Source Material Real',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-expanded')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-source-preview-toggle').click();
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-expanded')).toBeVisible();
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveValue(
    'Текст реального материала для assistant input source. Его нужно подставить в поле ввода.',
  );
  await page.getByTestId('teacher-ai-assistant-source-preview-toggle').click();
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-expanded')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Source received: Текст реального материала для assistant input source. Его нужно подставить в поле ввода.',
  );

  await page.getByTestId('teacher-ai-assistant-source-reset').click();
  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText('Ручной текст');
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveValue(
    'Текст реального материала для assistant input source. Его нужно подставить в поле ввода.',
  );

  console.log(
    JSON.stringify({
      scenario: 'material-source',
      adaptedSourceCountInPicker: await page.getByText('Source-aware material 20260421-1').count(),
      sourceBadge: await page.getByTestId('teacher-ai-assistant-source-badge').textContent(),
      sourcePreviewCollapsedVisible:
        (await page.getByTestId('teacher-ai-assistant-source-preview-collapsed').count()) > 0,
      assistantReply: await page.getByTestId('teacher-ai-assistant-message-assistant').first().textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant can use uploaded file as input source', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: `Source received: ${requestBody.message}`,
        used_knowledge_chunks: [
          {
            document_title: 'methodics',
            chunk_index: 0,
          },
        ],
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-file').click();
  await page.getByTestId('teacher-ai-assistant-file-input').setInputFiles(
    '/tmp/assistant-input-fixtures/assistant-input.md',
  );

  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText(
    'Файл: assistant-input.md',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-collapsed')).toContainText(
    'Файл: assistant-input.md',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-expanded')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-source-preview-toggle').click();
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveValue(
    '# Текст для адаптации\n\nКлетки растений получают энергию от света и используют её для важных процессов.',
  );
  await page.getByTestId('teacher-ai-assistant-source-preview-toggle').click();
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-expanded')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Source received: # Текст для адаптации\n\nКлетки растений получают энергию от света и используют её для важных процессов.',
  );
  await expect(page.getByTestId('teacher-ai-assistant-knowledge-usage').first()).toContainText(
    'Ответ основан на материалах (1)',
  );

  console.log(
    JSON.stringify({
      scenario: 'file-source',
      sourceBadge: await page.getByTestId('teacher-ai-assistant-source-badge').textContent(),
      sourcePreviewCollapsedVisible:
        (await page.getByTestId('teacher-ai-assistant-source-preview-collapsed').count()) > 0,
      assistantReply: await page.getByTestId('teacher-ai-assistant-message-assistant').first().textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows file processing state and blocks send while parsing', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/parse-file', async (route) => {
    await page.waitForTimeout(600);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        filename: 'delayed-source.md',
        extracted_text: 'Подготовленный текст после обработки файла.',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Временный текст');
  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-file').click();
  await page.getByTestId('teacher-ai-assistant-file-input').setInputFiles(
    '/tmp/assistant-input-fixtures/assistant-input.md',
  );

  await expect(page.getByTestId('teacher-ai-assistant-file-processing')).toContainText(
    'Файл обрабатывается...',
  );
  await expect(page.getByTestId('teacher-ai-assistant-submit')).toBeDisabled();

  await expect(page.getByTestId('teacher-ai-assistant-file-processing')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText(
    'Файл: delayed-source.md',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-preview-collapsed')).toContainText(
    'Файл: delayed-source.md',
  );
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveCount(0);

  await page.getByTestId('teacher-ai-assistant-source-preview-toggle').click();
  await expect(page.getByTestId('teacher-ai-assistant-input')).toHaveValue(
    'Подготовленный текст после обработки файла.',
  );

  console.log(
    JSON.stringify({
      scenario: 'file-processing-state',
      processingMessageHiddenAfterCompletion:
        (await page.getByTestId('teacher-ai-assistant-file-processing').count()) === 0,
      sourceBadge: await page.getByTestId('teacher-ai-assistant-source-badge').textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows file parsing error in UI', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/parse-file', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Parsing failed for the uploaded document.',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-file').click();
  await page.getByTestId('teacher-ai-assistant-file-input').setInputFiles(
    '/tmp/assistant-input-fixtures/assistant-input.md',
  );

  await expect(page.getByTestId('teacher-ai-assistant-error')).toContainText(
    'Parsing failed for the uploaded document.',
  );
  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText('Ручной текст');

  console.log(
    JSON.stringify({
      scenario: 'file-parsing-error-ui',
      displayedError: await page.getByTestId('teacher-ai-assistant-error').textContent(),
      sourceBadge: await page.getByTestId('teacher-ai-assistant-source-badge').textContent(),
    }),
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher without materials sees assistant material empty state', async ({ page }) => {
  await loginAsTeacher(page, {
    email: 'teacher.empty@example.com',
    password: 'TeacherEmpty123!',
  });

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-material').click();

  await expect(page.getByTestId('teacher-ai-assistant-material-empty-state')).toContainText(
    'У вас пока нет материалов',
  );

  console.log(
    JSON.stringify({
      scenario: 'material-empty-state',
      emptyStateText: await page.getByTestId('teacher-ai-assistant-material-empty-state').textContent(),
    }),
  );
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

test('teacher ai assistant disables unchanged re-submit in current session and re-enables after mode change', async ({
  page,
}) => {
  let messageRequestCount = 0;

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    messageRequestCount += 1;
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: `Mode received: ${requestBody.mode}`,
        used_knowledge_chunks: [],
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-material').click();
  await page
    .getByTestId('teacher-ai-assistant-material-option')
    .filter({ hasText: 'Assistant Source Material Real' })
    .click();

  const submitButton = page.getByTestId('teacher-ai-assistant-submit');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').last()).toContainText(
    'Mode received: basic_simplify',
  );
  await expect(submitButton).toBeDisabled();

  await page.getByTestId('teacher-ai-assistant-mode-button').click();
  await page.getByTestId('teacher-ai-assistant-mode-option-structured_explanation').click();
  await expect(submitButton).toBeEnabled();

  await submitButton.click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').last()).toContainText(
    'Mode received: structured_explanation',
  );
  await expect(submitButton).toBeDisabled();

  console.log(
    JSON.stringify({
      scenario: 'session-duplicate-prevention',
      messageRequestCount,
      submitDisabledAfterFirstRun: await submitButton.isDisabled(),
      currentModeLabel: await page.getByTestId('teacher-ai-assistant-mode-button').textContent(),
    }),
  );

  expect(messageRequestCount).toBe(2);

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
  let dialogShown = false;
  let capturedSavePayload: Record<string, unknown> | null = null;
  let sourceStatusRequestCount = 0;

  page.on('dialog', async (dialog) => {
    dialogShown = true;
    await dialog.dismiss();
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Короткий и понятный адаптированный текст для ученика.',
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    sourceStatusRequestCount += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: null,
        group_title: null,
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    const requestBody = route.request().postDataJSON();
    capturedSavePayload = requestBody as Record<string, unknown>;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '55555555-5555-5555-5555-555555555555',
        title: requestBody.title,
        original_text: requestBody.original_text,
        adapted_text: requestBody.adapted_text,
        material_type: 'text',
        status: 'draft',
        source_type: requestBody.source_type,
        source_material_id: requestBody.source_material_id ?? null,
        source_filename: requestBody.source_filename ?? null,
        adaptation_mode: requestBody.adaptation_mode,
        adaptation_group_key: 'manual:test-group',
        save_type: 'created',
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
  await expect(page.getByTestId('teacher-ai-save-material-title')).toBeVisible();
  await page.getByTestId('teacher-ai-save-material-title').fill('Материал из ИИ');
  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированный материал добавлен в материалы.',
  );
  expect(dialogShown).toBe(false);

  console.log(
    JSON.stringify({
      scenario: 'save-material-success',
      dialogShown,
      sourceStatusRequestCount,
      capturedSavePayload,
      saveSuccessBanner: await page
        .getByTestId('teacher-ai-assistant-save-material-success')
        .textContent(),
    }),
  );

  expect(capturedSavePayload).not.toBeNull();
  expect(capturedSavePayload?.source_type).toBe('manual');
  expect(capturedSavePayload?.source_material_id ?? null).toBeNull();
  expect(capturedSavePayload?.source_filename ?? null).toBeNull();
  expect(capturedSavePayload?.adaptation_mode).toBe('basic_simplify');
  expect(sourceStatusRequestCount).toBe(1);

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant sends source-aware save payload for existing material', async ({ page }) => {
  let capturedSavePayload: Record<string, unknown> | null = null;

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Адаптированный ответ для existing material source.',
        used_knowledge_chunks: [],
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: null,
        group_title: null,
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    capturedSavePayload = route.request().postDataJSON() as Record<string, unknown>;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '66666666-6666-6666-6666-666666666666',
        title: capturedSavePayload?.title,
        original_text: capturedSavePayload?.original_text,
        adapted_text: capturedSavePayload?.adapted_text,
        material_type: 'text',
        status: 'draft',
        source_type: capturedSavePayload?.source_type,
        source_material_id: capturedSavePayload?.source_material_id,
        source_filename: capturedSavePayload?.source_filename ?? null,
        adaptation_mode: capturedSavePayload?.adaptation_mode,
        adaptation_group_key: 'material:test-group',
        save_type: 'created',
        created_at: '2026-04-21T12:00:00Z',
        updated_at: '2026-04-21T12:00:00Z',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-material').click();
  await page
    .getByTestId('teacher-ai-assistant-material-option')
    .filter({ hasText: 'Assistant Source Material Real' })
    .click();

  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Адаптированный ответ для existing material source.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await page.getByTestId('teacher-ai-save-material-title').fill('Источник материал');
  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированный материал добавлен в материалы.',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-source-aware-material',
      capturedSavePayload,
    }),
  );

  expect(capturedSavePayload).not.toBeNull();
  expect(capturedSavePayload?.source_type).toBe('material');
  expect(capturedSavePayload?.source_material_id).toBeTruthy();
  expect(capturedSavePayload?.original_text).toBe(
    'Текст реального материала для assistant input source. Его нужно подставить в поле ввода.',
  );

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant sends source-aware save payload for uploaded file', async ({ page }) => {
  let capturedSavePayload: Record<string, unknown> | null = null;

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Адаптированный ответ для uploaded file source.',
        used_knowledge_chunks: [],
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: null,
        group_title: null,
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    capturedSavePayload = route.request().postDataJSON() as Record<string, unknown>;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '77777777-7777-7777-7777-777777777777',
        title: capturedSavePayload?.title,
        original_text: capturedSavePayload?.original_text,
        adapted_text: capturedSavePayload?.adapted_text,
        material_type: 'text',
        status: 'draft',
        source_type: capturedSavePayload?.source_type,
        source_material_id: null,
        source_filename: capturedSavePayload?.source_filename,
        adaptation_mode: capturedSavePayload?.adaptation_mode,
        adaptation_group_key: 'file:test-group',
        save_type: 'created',
        created_at: '2026-04-21T12:00:00Z',
        updated_at: '2026-04-21T12:00:00Z',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-file').click();
  await page.getByTestId('teacher-ai-assistant-file-input').setInputFiles(
    '/tmp/assistant-input-fixtures/assistant-input.md',
  );

  await expect(page.getByTestId('teacher-ai-assistant-source-badge')).toContainText(
    'Файл: assistant-input.md',
  );

  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Адаптированный ответ для uploaded file source.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await page.getByTestId('teacher-ai-save-material-title').fill('Источник файл');
  await page.getByTestId('teacher-ai-save-material-submit').click();

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированный материал добавлен в материалы.',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-source-aware-file',
      capturedSavePayload,
    }),
  );

  expect(capturedSavePayload).not.toBeNull();
  expect(capturedSavePayload?.source_type).toBe('file');
  expect(capturedSavePayload?.source_filename).toBe('assistant-input.md');
  expect(capturedSavePayload?.original_text).toBe('# Assistant input markdown\n\nУчебный текст из markdown файла.');

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('teacher ai assistant shows update success message when save updates existing version', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Обновлённый адаптированный ответ.',
        used_knowledge_chunks: [],
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '88888888-8888-8888-8888-888888888888',
        title: requestBody.title,
        original_text: requestBody.original_text,
        adapted_text: requestBody.adapted_text,
        material_type: 'text',
        status: 'draft',
        material_kind: 'adapted',
        source_type: requestBody.source_type,
        source_material_id: requestBody.source_material_id ?? null,
        source_filename: requestBody.source_filename ?? null,
        adaptation_mode: requestBody.adaptation_mode,
        adaptation_group_key: 'material:test-source',
        save_type: 'updated',
        created_at: '2026-04-21T12:00:00Z',
        updated_at: '2026-04-21T12:30:00Z',
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: 'material:test-source',
        group_title: 'Материал для обновления',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-input').fill('Исходный текст для update save.');
  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').first()).toContainText(
    'Обновлённый адаптированный ответ.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').first().click();
  await expect(page.getByTestId('teacher-ai-save-material-title')).toHaveCount(0);

  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированная версия обновлена.',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-updated',
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

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: null,
        group_title: null,
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

test('teacher ai assistant skips title modal for existing adaptation group and still creates new mode version', async ({
  page,
}) => {
  const saveRequests: Array<Record<string, unknown>> = [];

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/messages', async (route) => {
    const requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: `Новая версия для режима ${requestBody.mode}.`,
        used_knowledge_chunks: [],
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/source-status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adaptation_group_key: 'material:test-group',
        group_title: 'Общая группа адаптаций',
      }),
    });
  });

  await page.route('http://127.0.0.1:8000/api/v1/teacher/ai-assistant/save-material', async (route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>;
    saveRequests.push(requestBody);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: saveRequests.length === 1 ? '99999999-9999-9999-9999-999999999991' : '99999999-9999-9999-9999-999999999992',
        title: 'Общая группа адаптаций',
        original_text: requestBody.original_text,
        adapted_text: requestBody.adapted_text,
        material_type: 'text',
        status: 'draft',
        material_kind: 'adapted',
        source_type: requestBody.source_type,
        source_material_id: requestBody.source_material_id ?? null,
        source_filename: requestBody.source_filename ?? null,
        adaptation_mode: requestBody.adaptation_mode,
        adaptation_group_key: 'material:test-group',
        save_type: 'created',
        created_at: '2026-04-22T10:00:00Z',
        updated_at: '2026-04-22T10:00:00Z',
      }),
    });
  });

  await loginAsTeacher(page);

  await page.getByTestId('teacher-ai-assistant-actions-trigger').click();
  await page.getByTestId('teacher-ai-assistant-action-material').click();
  await page
    .getByTestId('teacher-ai-assistant-material-option')
    .filter({ hasText: 'Assistant Source Material Real' })
    .click();

  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').last()).toContainText(
    'Новая версия для режима basic_simplify.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').last().click();
  await expect(page.getByTestId('teacher-ai-save-material-title')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированный материал добавлен в материалы.',
  );

  await page.getByTestId('teacher-ai-assistant-mode-button').click();
  await page.getByTestId('teacher-ai-assistant-mode-option-structured_explanation').click();
  await page.getByTestId('teacher-ai-assistant-submit').click();
  await expect(page.getByTestId('teacher-ai-assistant-message-assistant').last()).toContainText(
    'Новая версия для режима structured_explanation.',
  );

  await page.getByTestId('teacher-ai-assistant-save-material-trigger').last().click();
  await expect(page.getByTestId('teacher-ai-save-material-title')).toHaveCount(0);
  await expect(page.getByTestId('teacher-ai-assistant-save-material-success')).toContainText(
    'Адаптированный материал добавлен в материалы.',
  );

  console.log(
    JSON.stringify({
      scenario: 'save-material-existing-group-no-modal',
      saveRequestsCount: saveRequests.length,
      firstSaveMode: saveRequests[0]?.adaptation_mode,
      secondSaveMode: saveRequests[1]?.adaptation_mode,
      modalVisibleAfterSaveClick: await page.getByTestId('teacher-ai-save-material-title').count(),
    }),
  );

  expect(saveRequests).toHaveLength(2);
  expect(saveRequests[0]?.title).toBe('Общая группа адаптаций');
  expect(saveRequests[1]?.title).toBe('Общая группа адаптаций');
  expect(saveRequests[0]?.adaptation_mode).toBe('basic_simplify');
  expect(saveRequests[1]?.adaptation_mode).toBe('structured_explanation');

  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
