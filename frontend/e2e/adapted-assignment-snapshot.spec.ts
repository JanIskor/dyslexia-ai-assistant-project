import { expect, test } from '@playwright/test';

import { createAcceptedStudentForTeacher, createTeacherViaAdmin } from './helpers/adminSeeds';
import { BACKEND_BASE_URL, loginViaApi, loginViaUi } from './helpers/auth';
import { buildUniqueSuffix, buildUniqueTitle } from './helpers/testData';

test('selected adapted version assignment uses snapshot and student does not see later live updates', async ({
  browser,
  request,
  page,
}, testInfo) => {
  const suffix = buildUniqueSuffix(testInfo, 'adapted-snapshot');
  const createdTeacher = await createTeacherViaAdmin(request, {
    suffix,
    firstName: 'Ольга',
    lastNamePrefix: 'E2EМатериалыУчитель',
    password: 'AdaptedSnapshotTeacher123!',
    birthDate: '1988-09-21',
    gender: 'female',
    position: 'Преподаватель',
    phone: '+79009990011',
    subjectName: 'Русский язык',
  });
  const teacherAuth = await loginViaApi(request, createdTeacher.email, createdTeacher.password);
  const createdStudent = await createAcceptedStudentForTeacher(request, {
    suffix,
    password: 'AdaptedSnapshotStudent123!',
    teacherFullName: createdTeacher.fullName,
    teacherEmail: createdTeacher.email,
    teacherPassword: createdTeacher.password,
    firstName: 'Снимок',
    lastNamePrefix: 'E2EМатериал',
  });
  const studentAuth = await loginViaApi(request, createdStudent.email, createdStudent.password);

  const sourceTitle = buildUniqueTitle('Lifecycle source', suffix);
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

  await loginViaUi(page, { email: createdTeacher.email, password: createdTeacher.password }, '/teacher');
  await page.getByRole('button', { name: 'Материалы' }).click();
  await page.getByTestId('teacher-materials-tab-adapted').click();
  await page.getByText(sourceTitle).click();

  await page
    .getByTestId('teacher-adapted-material-version-selector')
    .selectOption({ label: 'Сделать пошаговым' });
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(structuredText);

  await page.getByRole('button', { name: 'Назначить ученику' }).click();
  await page.getByRole('button', { name: new RegExp(createdStudent.fullName) }).click();
  await page.getByRole('button', { name: /^Назначить$/ }).click();
  await expect(page.getByText(`Материал назначен ученику ${createdStudent.fullName}.`)).toBeVisible();

  await page
    .getByTestId('teacher-adapted-material-version-selector')
    .selectOption({ label: 'Упростить текст' });
  await expect(page.getByTestId('teacher-adapted-material-detail-text')).toContainText(basicText);

  await page.getByRole('button', { name: 'Назначить ученику' }).click();
  await page.getByRole('button', { name: new RegExp(createdStudent.fullName) }).click();
  await page.getByRole('button', { name: /^Назначить$/ }).click();
  await expect(page.getByText(`Материал назначен ученику ${createdStudent.fullName}.`)).toBeVisible();

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();

  await loginViaUi(studentPage, {
    email: createdStudent.email,
    password: createdStudent.password,
  }, '/student');
  await studentPage.getByRole('button', { name: 'Учебные материалы' }).click();

  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(basicText)).toBeVisible();

  const structuredCard = studentPage.getByRole('button').filter({ hasText: structuredText });
  await expect(structuredCard).toHaveCount(1);
  await structuredCard.click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText('Сравнить')).toHaveCount(0);
  await expect(studentPage.getByText('Версия адаптации')).toHaveCount(0);
  await studentPage.getByRole('button', { name: 'Назад к материалам' }).click();

  const basicCard = studentPage.getByRole('button').filter({ hasText: basicText });
  await expect(basicCard).toHaveCount(1);
  await basicCard.click();
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

  const studentMeResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${studentAuth.access_token}`,
    },
  });
  expect(studentMeResponse.ok()).toBeTruthy();
  const studentMe = (await studentMeResponse.json()) as { id: string };

  await studentPage.reload();
  await studentPage.getByRole('button', { name: 'Учебные материалы' }).click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(structuredUpdatedText)).toHaveCount(0);

  const reloadedStructuredCard = studentPage.getByRole('button').filter({ hasText: structuredText });
  await expect(reloadedStructuredCard).toHaveCount(1);
  await reloadedStructuredCard.click();
  await expect(studentPage.getByText(structuredText)).toBeVisible();
  await expect(studentPage.getByText(structuredUpdatedText)).toHaveCount(0);

  console.log(
    JSON.stringify({
      scenario: 'adapted-assignment-snapshot',
      sourceTitle,
      basicVersionId: basicVersion.id,
      structuredVersionId: structuredVersion.id,
      studentId: studentMe.id,
      studentFullName: createdStudent.fullName,
      structuredSnapshotVisible: await studentPage.getByText(structuredText).isVisible(),
      structuredLiveUpdateVisible: await studentPage.getByText(structuredUpdatedText).count(),
    }),
  );

  await studentContext.close();
});
