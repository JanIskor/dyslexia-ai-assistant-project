import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface TeacherStudentListItem {
  id: string;
  full_name: string;
  grade_label: string;
  avatar_url: string | null;
}

export interface TeacherStudentDetail {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  grade_label: string;
  enrollment_date: string;
  quote: string | null;
  avatar_url: string | null;
}

export interface TeacherStudentRemovalRequestPayload {
  reason?: string | null;
}

export interface TeacherStudentRemovalRequestItem {
  id: string;
  teacher: {
    user_id: string;
    full_name: string;
  };
  student: {
    user_id: string;
    full_name: string;
    grade_label: string | null;
  };
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  admin_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_admin_user_id: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

export type TeacherStudentsSortBy = 'full_name' | 'grade_label';
export type TeacherStudentsSortOrder = 'asc' | 'desc';

export interface TeacherStudentsListParams {
  search?: string;
  sort_by?: TeacherStudentsSortBy;
  sort_order?: TeacherStudentsSortOrder;
  page?: number;
  page_size?: number;
}

export interface TeacherStudentsListResponse {
  items: TeacherStudentListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

const getTeacherStudentsErrorMessage = (
  status: number,
  fallbackMessage: string,
  body: ApiErrorBody | null,
): string => {
  if (status === 401 || status === 403) {
    return fallbackMessage;
  }

  if (status === 404 && typeof body?.detail === 'string') {
    if (body.detail === 'Teacher student not found') {
      return 'Ученик не найден в вашем списке.';
    }

    return 'Не удалось загрузить профиль ученика';
  }

  if (status === 400 && body?.detail === 'Removal request already exists') {
    return 'Заявка на открепление уже отправлена и ожидает решения администратора.';
  }

  if (status >= 500) {
    return fallbackMessage;
  }

  return fallbackMessage;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(path: string, token: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getTeacherStudentsErrorMessage(response.status, fallbackMessage, body));
  }

  return parseJson<T>(response);
}

async function requestWithInit<T>(
  path: string,
  token: string,
  fallbackMessage: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getTeacherStudentsErrorMessage(response.status, fallbackMessage, body));
  }

  return parseJson<T>(response);
}

const buildTeacherStudentsQuery = (params: TeacherStudentsListParams): string => {
  const searchParams = new URLSearchParams();

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    searchParams.set('search', trimmedSearch);
  }

  if (params.sort_by) {
    searchParams.set('sort_by', params.sort_by);
  }

  if (params.sort_order) {
    searchParams.set('sort_order', params.sort_order);
  }

  if (typeof params.page === 'number') {
    searchParams.set('page', String(params.page));
  }

  if (typeof params.page_size === 'number') {
    searchParams.set('page_size', String(params.page_size));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const getTeacherStudents = async (
  token: string,
  params: TeacherStudentsListParams = {},
): Promise<TeacherStudentsListResponse> =>
  request<TeacherStudentsListResponse>(
    `/api/v1/teacher/students${buildTeacherStudentsQuery(params)}`,
    token,
    'Не удалось загрузить учеников',
  );

export const getTeacherStudentDetail = async (
  token: string,
  studentId: string,
): Promise<TeacherStudentDetail> =>
  request<TeacherStudentDetail>(
    `/api/v1/teacher/students/${studentId}`,
    token,
    'Не удалось загрузить профиль ученика',
  );

export const createTeacherStudentRemovalRequest = async (
  token: string,
  studentId: string,
  payload: TeacherStudentRemovalRequestPayload,
): Promise<TeacherStudentRemovalRequestItem> =>
  requestWithInit<TeacherStudentRemovalRequestItem>(
    `/api/v1/teacher/students/${studentId}/removal-requests`,
    token,
    'Не удалось отправить заявку на открепление.',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
