import { expect, test, type Page } from '@playwright/test';

async function loginAsTeacher(page: Page) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByPlaceholder('example@site.ru').fill('teacher.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('TeacherSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: 'Материалы' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Материалы' }).click();
}

test('teacher materials shows draft and adapted tabs under materials header', async ({ page }) => {
  await loginAsTeacher(page);

  await expect(page.getByTestId('teacher-materials-tabs')).toBeVisible();
  await expect(page.getByTestId('teacher-materials-tab-draft')).toContainText('Черновики');
  await expect(page.getByTestId('teacher-materials-tab-adapted')).toContainText(
    'Адаптированные материалы',
  );
  await expect(page.getByText('Assistant Source Material Real')).toBeVisible();
  await expect(page.getByText('Source-aware material 20260421-1')).toHaveCount(0);

  console.log(
    JSON.stringify({
      scenario: 'materials-tabs-visible',
      draftTabText: await page.getByTestId('teacher-materials-tab-draft').textContent(),
      adaptedTabText: await page.getByTestId('teacher-materials-tab-adapted').textContent(),
    }),
  );
});

test('teacher draft detail stays simple and does not show compare or assign actions', async ({
  page,
}) => {
  await loginAsTeacher(page);

  await page.getByText('Assistant Source Material Real').click();

  await expect(page.getByTestId('teacher-materials-tabs')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Назначить ученику' })).toHaveCount(0);
  await expect(page.getByTestId('teacher-adapted-material-compare-view')).toHaveCount(0);
  await expect(page.getByText('Исходный текст')).toBeVisible();
  await expect(
    page.getByText('Текст реального материала для assistant input source. Его нужно подставить в поле ввода.'),
  ).toBeVisible();

  console.log(
    JSON.stringify({
      scenario: 'draft-detail-simple',
      hasTabsInDetail: await page.getByTestId('teacher-materials-tabs').count(),
      assignButtonCount: await page.getByRole('button', { name: 'Назначить ученику' }).count(),
      compareViewCount: await page.getByTestId('teacher-adapted-material-compare-view').count(),
    }),
  );
});

test('teacher adapted material opens normal detail before compare mode', async ({ page }) => {
  await loginAsTeacher(page);

  await page.getByTestId('teacher-materials-tab-adapted').click();
  await page.getByText('Source-aware material 20260421-1').click();

  await expect(page.getByTestId('teacher-materials-tabs')).toHaveCount(0);
  await expect(page.getByTestId('teacher-adapted-material-compare-view')).toHaveCount(0);
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(
    'Адаптированная версия на основе existing material source.',
  );
  await expect(page.getByTestId('teacher-adapted-material-version-selector')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сравнить' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Назначить ученику' })).toBeVisible();

  console.log(
    JSON.stringify({
      scenario: 'adapted-detail-default',
      hasTabsInDetail: await page.getByTestId('teacher-materials-tabs').count(),
      compareButtonVisible: await page.getByRole('button', { name: 'Сравнить' }).isVisible(),
      assignButtonVisible: await page.getByRole('button', { name: 'Назначить ученику' }).isVisible(),
      detailText: (await page.getByTestId('teacher-adapted-material-detail-text').textContent())?.trim(),
    }),
  );
});

test('teacher adapted materials compare view switches versions and keeps original text fixed', async ({
  page,
}) => {
  await loginAsTeacher(page);

  await page.getByTestId('teacher-materials-tab-adapted').click();
  await expect(page.getByText('Source-aware material 20260421-1')).toBeVisible();
  await expect(page.getByText('Assistant Source Material Real')).toHaveCount(0);

  await page.getByText('Source-aware material 20260421-1').click();
  await page.getByRole('button', { name: 'Сравнить' }).click();
  await expect(page.getByTestId('teacher-adapted-material-compare-view')).toBeVisible();

  const originalText = await page.getByTestId('teacher-adapted-material-original-text').textContent();
  const firstAdaptedText = await page.getByTestId('teacher-adapted-material-adapted-text').textContent();

  await page
    .getByTestId('teacher-adapted-material-version-selector')
    .selectOption({ label: 'Выделить главное' });

  await expect(page.getByTestId('teacher-adapted-material-adapted-text')).toContainText(
    'Вторая адаптированная версия для того же existing material source.',
  );

  const switchedOriginalText = await page
    .getByTestId('teacher-adapted-material-original-text')
    .textContent();
  const secondAdaptedText = await page
    .getByTestId('teacher-adapted-material-adapted-text')
    .textContent();

  expect(originalText?.trim()).toBe(switchedOriginalText?.trim());
  expect(firstAdaptedText?.trim()).not.toBe(secondAdaptedText?.trim());
  await page.getByTestId('teacher-adapted-material-compare-back').click();
  await expect(page.getByTestId('teacher-adapted-material-compare-view')).toHaveCount(0);
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(
    'Вторая адаптированная версия для того же existing material source.',
  );

  console.log(
    JSON.stringify({
      scenario: 'adapted-compare-switch',
      originalText: originalText?.trim(),
      firstAdaptedText: firstAdaptedText?.trim(),
      secondAdaptedText: secondAdaptedText?.trim(),
      selectorValue: await page.getByTestId('teacher-adapted-material-version-selector').inputValue(),
      compareClosed: await page.getByTestId('teacher-adapted-material-compare-view').count(),
    }),
  );
});
