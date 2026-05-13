import { expect, type APIRequestContext } from '@playwright/test';

import {
  ADMIN_CREDENTIALS,
  BACKEND_BASE_URL,
  TEACHER_SEED_CREDENTIALS,
  loginViaApi,
} from './auth';
import { buildUniqueEmail, buildUniquePersonName } from './testData';

export interface CreatedStudentSeed {
  email: string;
  password: string;
  userId: string;
  applicationId: string;
  fullName: string;
  surname: string;
}

export interface CreatedTeacherSeed {
  id: string;
  email: string;
  password: string;
  fullName: string;
  surname: string;
}

export async function createTeacherViaAdmin(
  request: APIRequestContext,
  {
    suffix,
    firstName,
    lastNamePrefix,
    password,
    birthDate = '1989-04-12',
    gender = 'female',
    position = 'Преподаватель',
    phone = '+79001234567',
    subjectName = 'Русский язык',
  }: {
    suffix: string;
    firstName: string;
    lastNamePrefix: string;
    password: string;
    birthDate?: string;
    gender?: string;
    position?: string;
    phone?: string;
    subjectName?: string;
  },
): Promise<CreatedTeacherSeed> {
  const adminAuth = await loginViaApi(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  const person = buildUniquePersonName(lastNamePrefix, firstName, suffix);
  const email = buildUniqueEmail('teacher.e2e', suffix);

  const response = await request.post(`${BACKEND_BASE_URL}/api/v1/admin/teachers`, {
    headers: {
      Authorization: `Bearer ${adminAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
      first_name: person.firstName,
      last_name: person.lastName,
      birth_date: birthDate,
      gender,
      phone,
      position,
      subject_name: subjectName,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { id: string };

  return {
    id: payload.id,
    email,
    password,
    fullName: person.fullName,
    surname: person.lastName,
  };
}

export async function createStudentApplicationViaApi(
  request: APIRequestContext,
  {
    suffix,
    password,
    firstName = 'Ученик',
    lastNamePrefix = 'E2EУченик',
    birthDate = '2011-04-12',
    gender = 'Мужской',
    quote = 'E2E student profile.',
    gradeLabel = '5Б класс',
    enrollmentDate = '2018-09-03',
  }: {
    suffix: string;
    password: string;
    firstName?: string;
    lastNamePrefix?: string;
    birthDate?: string;
    gender?: string;
    quote?: string;
    gradeLabel?: string;
    enrollmentDate?: string;
  },
): Promise<CreatedStudentSeed> {
  const email = buildUniqueEmail('student.e2e', suffix);
  const person = buildUniquePersonName(lastNamePrefix, firstName, suffix);

  const registerResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/auth/register`, {
    data: { email, password },
  });
  expect(registerResponse.ok()).toBeTruthy();

  const studentAuth = await loginViaApi(request, email, password);
  const adminAuth = await loginViaApi(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

  const patchProfileResponse = await request.patch(`${BACKEND_BASE_URL}/api/v1/student/profile`, {
    headers: {
      Authorization: `Bearer ${studentAuth.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      full_name: person.fullName,
      birth_date: birthDate,
      gender,
      quote,
    },
  });
  expect(patchProfileResponse.ok()).toBeTruthy();
  const patchedProfile = (await patchProfileResponse.json()) as { user_id: string };

  const submitProfileResponse = await request.post(`${BACKEND_BASE_URL}/api/v1/student/profile/submit`, {
    headers: { Authorization: `Bearer ${studentAuth.access_token}` },
  });
  expect(submitProfileResponse.ok()).toBeTruthy();

  const applicationsResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/admin/applications`, {
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  expect(applicationsResponse.ok()).toBeTruthy();
  const applicationsPayload = (await applicationsResponse.json()) as {
    items: Array<{ id: string; full_name: string }>;
  };
  const application = applicationsPayload.items.find((item) => item.full_name === person.fullName);
  expect(application).toBeTruthy();

  const patchApplicationResponse = await request.patch(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${application?.id}`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: {
        grade_label: gradeLabel,
        enrollment_date: enrollmentDate,
      },
    },
  );
  expect(patchApplicationResponse.ok()).toBeTruthy();

  return {
    email,
    password,
    userId: patchedProfile.user_id,
    applicationId: application!.id,
    fullName: person.fullName,
    surname: person.lastName,
  };
}

export async function assignStudentApplicationToTeacher(
  request: APIRequestContext,
  {
    applicationId,
    teacherFullName,
  }: {
    applicationId: string;
    teacherFullName: string;
  },
): Promise<string> {
  const adminAuth = await loginViaApi(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

  const assignmentOptionsResponse = await request.get(
    `${BACKEND_BASE_URL}/api/v1/admin/teachers/assignment-options?application_id=${applicationId}`,
    {
      headers: { Authorization: `Bearer ${adminAuth.access_token}` },
    },
  );
  expect(assignmentOptionsResponse.ok()).toBeTruthy();
  const assignmentOptionsPayload = (await assignmentOptionsResponse.json()) as {
    items: Array<{ teacher_user_id: string; full_name: string }>;
  };
  const teacherOption = assignmentOptionsPayload.items.find((item) => item.full_name === teacherFullName);
  expect(teacherOption).toBeTruthy();

  const assignResponse = await request.post(
    `${BACKEND_BASE_URL}/api/v1/admin/applications/${applicationId}/assign-teacher`,
    {
      headers: {
        Authorization: `Bearer ${adminAuth.access_token}`,
        'Content-Type': 'application/json',
      },
      data: { teacher_user_id: teacherOption?.teacher_user_id },
    },
  );
  expect(assignResponse.ok()).toBeTruthy();
  return teacherOption!.teacher_user_id;
}

export async function createAssignedStudentForTeacher(
  request: APIRequestContext,
  {
    suffix,
    password,
    teacherFullName,
    firstName = 'Ученик',
    lastNamePrefix = 'E2EНазначенный',
  }: {
    suffix: string;
    password: string;
    teacherFullName: string;
    firstName?: string;
    lastNamePrefix?: string;
  },
): Promise<CreatedStudentSeed> {
  const student = await createStudentApplicationViaApi(request, {
    suffix,
    password,
    firstName,
    lastNamePrefix,
  });
  await assignStudentApplicationToTeacher(request, {
    applicationId: student.applicationId,
    teacherFullName,
  });
  return student;
}

export async function acceptTeacherIncomingStudent(
  request: APIRequestContext,
  {
    teacherEmail,
    teacherPassword,
    studentUserId,
  }: {
    teacherEmail: string;
    teacherPassword: string;
    studentUserId: string;
  },
): Promise<void> {
  const teacherAuth = await loginViaApi(request, teacherEmail, teacherPassword);
  const response = await request.post(
    `${BACKEND_BASE_URL}/api/v1/teacher/incoming-students/${studentUserId}/accept`,
    {
      headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
    },
  );
  expect(response.ok()).toBeTruthy();
}

export async function createAcceptedStudentForTeacher(
  request: APIRequestContext,
  {
    suffix,
    password,
    teacherFullName,
    teacherEmail,
    teacherPassword,
    firstName = 'Ученик',
    lastNamePrefix = 'E2EПринятый',
  }: {
    suffix: string;
    password: string;
    teacherFullName: string;
    teacherEmail: string;
    teacherPassword: string;
    firstName?: string;
    lastNamePrefix?: string;
  },
): Promise<CreatedStudentSeed> {
  const student = await createAssignedStudentForTeacher(request, {
    suffix,
    password,
    teacherFullName,
    firstName,
    lastNamePrefix,
  });
  await acceptTeacherIncomingStudent(request, {
    teacherEmail,
    teacherPassword,
    studentUserId: student.userId,
  });
  return student;
}

export async function getTeacherNotificationsCount(
  request: APIRequestContext,
  teacherToken: string,
): Promise<number> {
  const response = await request.get(`${BACKEND_BASE_URL}/api/v1/notifications`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { items: Array<{ id: string }> };
  return payload.items.length;
}

export async function createAssignedStudentForSeedTeacher(
  request: APIRequestContext,
  {
    suffix,
    password,
    firstName = 'Ученик',
    lastNamePrefix = 'E2EУчитель',
  }: {
    suffix: string;
    password: string;
    firstName?: string;
    lastNamePrefix?: string;
  },
): Promise<CreatedStudentSeed> {
  const teacherAuth = await loginViaApi(
    request,
    TEACHER_SEED_CREDENTIALS.email,
    TEACHER_SEED_CREDENTIALS.password,
  );
  const teacherProfileResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/profile`, {
    headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
  });
  expect(teacherProfileResponse.ok()).toBeTruthy();
  const teacherProfile = (await teacherProfileResponse.json()) as { full_name: string };

  return createAssignedStudentForTeacher(request, {
    suffix,
    password,
    teacherFullName: teacherProfile.full_name,
    firstName,
    lastNamePrefix,
  });
}

export async function createAcceptedStudentForSeedTeacher(
  request: APIRequestContext,
  {
    suffix,
    password,
    firstName = 'Ученик',
    lastNamePrefix = 'E2EУчитель',
  }: {
    suffix: string;
    password: string;
    firstName?: string;
    lastNamePrefix?: string;
  },
): Promise<CreatedStudentSeed> {
  const teacherAuth = await loginViaApi(
    request,
    TEACHER_SEED_CREDENTIALS.email,
    TEACHER_SEED_CREDENTIALS.password,
  );
  const teacherProfileResponse = await request.get(`${BACKEND_BASE_URL}/api/v1/teacher/profile`, {
    headers: { Authorization: `Bearer ${teacherAuth.access_token}` },
  });
  expect(teacherProfileResponse.ok()).toBeTruthy();
  const teacherProfile = (await teacherProfileResponse.json()) as { full_name: string };

  return createAcceptedStudentForTeacher(request, {
    suffix,
    password,
    teacherFullName: teacherProfile.full_name,
    teacherEmail: TEACHER_SEED_CREDENTIALS.email,
    teacherPassword: TEACHER_SEED_CREDENTIALS.password,
    firstName,
    lastNamePrefix,
  });
}
