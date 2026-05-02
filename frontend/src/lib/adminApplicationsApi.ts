import { buildApiUrl } from '@/lib/apiBaseUrl';

export type AdminApplicationRequestKind =
  | 'initial_profile'
  | 'profile_update'
  | 'student_profile_update'
  | 'teacher_profile_update'
  | 'system_assignment_event'
  | `system_${string}`;

export interface AdminApplication {
  id: string;
  full_name: string;
  status: string;
  request_kind: AdminApplicationRequestKind;
  request_kind_label: string;
  current_teacher_user_id: string | null;
  teacher_review_status: string | null;
  can_assign_teacher: boolean;
}

export interface AdminApplicationDetail {
  id: string;
  request_kind: AdminApplicationRequestKind;
  request_kind_label: string;
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  quote: string | null;
  avatar_url: string | null;
  position: string | null;
  phone: string | null;
  work_email: string | null;
  subject_name: string | null;
  status: string;
  grade_label: string | null;
  enrollment_date: string | null;
  current_teacher_user_id: string | null;
  current_teacher_full_name: string | null;
  current_teacher_subject_name: string | null;
  teacher_review_status: string | null;
  current_profile_full_name: string | null;
  current_profile_birth_date: string | null;
  current_profile_gender: string | null;
  current_profile_quote: string | null;
  current_profile_position: string | null;
  current_profile_phone: string | null;
  current_profile_work_email: string | null;
  current_profile_subject_name: string | null;
  can_edit_admin_fields: boolean;
  can_assign_teacher: boolean;
}

export interface AdminApplicationStatusFilterOption {
  value: string;
  label: string;
}

export interface AdminTeacherAssignmentOption {
  teacher_user_id: string;
  full_name: string;
  subject_name: string;
  student_count: number;
  capacity: number;
  is_available: boolean;
  unavailable_reason: 'full_capacity' | 'already_rejected_this_student' | null;
}

export interface AdminApplicationsResponse {
  items: AdminApplication[];
}

export interface AdminApplicationsBulkDeletePayload {
  ids?: string[];
  delete_all?: boolean;
}

export interface AdminApplicationsBulkDeleteResponse {
  detail: string;
  deleted_count: number;
}

export interface AdminApplicationFiltersResponse {
  statuses: AdminApplicationStatusFilterOption[];
}

export interface AdminTeacherAssignmentOptionsResponse {
  items: AdminTeacherAssignmentOption[];
}

export interface AdminApplicationUpdatePayload {
  grade_label?: string | null;
  enrollment_date?: string | null;
}

export interface AdminAssignTeacherPayload {
  teacher_user_id: string;
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к списку заявок есть только у администратора.';
  }

  if (detail === 'Application not found') {
    return 'Заявка не найдена.';
  }

  if (detail === 'Invalid application id') {
    return 'Некорректный идентификатор заявки.';
  }

  if (detail === 'Student profile not found') {
    return 'Профиль ученика не найден.';
  }

  if (detail === 'Student profile is incomplete') {
    return 'Не все обязательные поля профиля ученика заполнены.';
  }

  if (detail === 'Application cannot be sent for revision') {
    return 'Эту заявку сейчас нельзя отправить на доработку.';
  }

  if (detail === 'Application cannot be approved') {
    return 'Эту заявку сейчас нельзя подтвердить.';
  }

  if (detail === 'Profile update request does not support admin fields editing') {
    return 'Для обновления профиля поля администратора не редактируются.';
  }

  if (detail === 'Application cannot be assigned') {
    return 'Эту заявку сейчас нельзя отправить преподавателю.';
  }

  if (detail === 'Application is in needs completion state') {
    return 'Заявка находится на доработке и пока не может быть отправлена преподавателю.';
  }

  if (detail === 'Teacher not found') {
    return 'Преподаватель не найден.';
  }

  if (detail === 'Teacher is at full capacity') {
    return 'У выбранного преподавателя уже 15 из 15 учеников.';
  }

  if (detail === 'Teacher already rejected this student') {
    return 'Этот преподаватель уже отклонил данного ученика.';
  }

  if (detail === 'Student already assigned') {
    return 'Ученик уже назначен преподавателю.';
  }

  if (detail === 'Student is already assigned to this teacher') {
    return 'Этот ученик уже назначен выбранному преподавателю.';
  }

  if (detail === 'Application status transition is not supported by the current database schema') {
    return 'Статусы заявок в базе данных не обновлены для review flow. Примените последние миграции backend.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось загрузить список заявок.';
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export const getAdminApplications = async (
  token: string,
  search: string,
  statuses: string[],
): Promise<AdminApplicationsResponse> => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  statuses.forEach((status) => {
    params.append('status', status);
  });

  const path = params.toString()
    ? `/api/v1/admin/applications?${params.toString()}`
    : '/api/v1/admin/applications';

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationsResponse>(response);
};

export const deleteAdminApplications = async (
  token: string,
  payload: AdminApplicationsBulkDeletePayload,
): Promise<AdminApplicationsBulkDeleteResponse> => {
  const response = await fetch(buildApiUrl('/api/v1/admin/applications'), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationsBulkDeleteResponse>(response);
};

export const getAdminApplicationFilters = async (
  token: string,
): Promise<AdminApplicationFiltersResponse> => {
  const response = await fetch(buildApiUrl('/api/v1/admin/applications/filters'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationFiltersResponse>(response);
};

export const getAdminTeacherAssignmentOptions = async (
  token: string,
  applicationId?: string,
): Promise<AdminTeacherAssignmentOptionsResponse> => {
  const params = new URLSearchParams();

  if (applicationId) {
    params.set('application_id', applicationId);
  }

  const path = params.toString()
    ? `/api/v1/admin/teachers/assignment-options?${params.toString()}`
    : '/api/v1/admin/teachers/assignment-options';

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminTeacherAssignmentOptionsResponse>(response);
};

export const getAdminApplicationDetail = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const updateAdminApplication = async (
  token: string,
  applicationId: string,
  payload: AdminApplicationUpdatePayload,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const requestAdminApplicationChanges = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}/request-changes`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const approveAdminApplication = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}/approve`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const assignTeacherToApplication = async (
  token: string,
  applicationId: string,
  payload: AdminAssignTeacherPayload,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}/assign-teacher`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};
