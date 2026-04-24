import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('http://127.0.0.1:3000/login');
  await page.getByPlaceholder('example@site.ru').fill('admin.seed@example.com');
  await page.getByPlaceholder('Введите пароль').fill('AdminSeed123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/admin');
}

test('admin manages knowledge base documents from dedicated admin tab', async ({ page }) => {
  const supportedFixturePath = path.resolve(
    process.cwd(),
    'e2e/fixtures/knowledge-base-methodology.md',
  );
  const unsupportedFixturePath = path.resolve(
    process.cwd(),
    'e2e/fixtures/knowledge-base-invalid.json',
  );

  await loginAsAdmin(page);

  const sidebarTab = page.getByTestId('admin-sidebar-knowledge-base-tab');
  await expect(sidebarTab).toContainText('Правила адаптации');
  await sidebarTab.click();

  await expect(page.getByTestId('admin-knowledge-base-empty-state')).toBeVisible();

  await page.getByTestId('admin-knowledge-base-file-input').setInputFiles(supportedFixturePath);

  await expect(page.getByTestId('admin-knowledge-base-success')).toContainText(
    'загружен в базу правил',
    { timeout: 30000 },
  );
  await expect(page.getByTestId('admin-knowledge-base-empty-state')).toHaveCount(0);
  await expect(page.getByTestId('admin-knowledge-base-document-card')).toHaveCount(1);
  await expect(page.getByTestId('admin-knowledge-base-document-card').first()).toContainText(
    'knowledge-base-methodology',
  );

  await page.getByTestId('admin-knowledge-base-document-card').first().click();

  await expect(page.getByTestId('admin-knowledge-base-detail')).toBeVisible();
  await expect(page.getByTestId('admin-knowledge-base-detail')).toContainText(
    'knowledge-base-methodology.md',
  );
  await expect(page.getByTestId('admin-knowledge-base-detail')).toContainText(
    'Короткие предложения помогают снизить нагрузку на чтение.',
  );
  await expect(page.getByTestId('admin-knowledge-base-status')).toContainText(/Готов для RAG|Разбит на чанки|Текст извлечён|Загружен/);

  await page.getByTestId('admin-knowledge-base-file-input').setInputFiles(unsupportedFixturePath);

  await expect(page.getByTestId('admin-knowledge-base-error')).toContainText(
    'Неподдерживаемый формат файла',
  );
});
