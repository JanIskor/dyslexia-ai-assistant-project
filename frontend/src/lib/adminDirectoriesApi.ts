import { buildApiUrl } from '@/lib/apiBaseUrl';

export type AdminTeachersSort = 'surname_asc' | 'surname_desc';
export type AdminStudentsSort = 'surname_asc' | 'surname_desc' | 'grade_asc' | 'grade_desc';

export interface AdminTeacherDirectoryItem {
  id: string;
  full_name: string;
  subject_name: string;
  work_email: string;
  avatar_url: string | null;
}

export interface AdminTeachersDirectoryResponse {
  items: AdminTeacherDirectoryItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminTeacherDirectoryDetail {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  position: string;
  phone: string;
  work_email: string;
  subject_name: string;
  avatar_url: string | null;
}

export interface AdminStudentDirectoryItem {
  id: string;
  full_name: string;
  grade_label: string | null;
  avatar_url: string | null;
}

export interface AdminStudentsDirectoryResponse {
  items: AdminStudentDirectoryItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AdminStudentDirectoryDetail {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  grade_label: string | null;
  enrollment_date: string | null;
  quote: string | null;
  avatar_url: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

interface ListParams<TSort extends string> {
  search?: string;
  sort?: TSort;
  page?: number;
  page_size?: number;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const getErrorMessage = (
  status: number,
  body: ApiErrorBody | null,
  fallbackMessage: string,
): string => {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к этому разделу есть только у администратора.';
  }

  if (detail === 'Teacher not found') {
    return 'Преподаватель не найден.';
  }

  if (detail === 'Student not found') {
    return 'Ученик не найден.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return fallbackMessage;
};

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

    throw new Error(getErrorMessage(response.status, body, fallbackMessage));
  }

  return parseJson<T>(response);
}

function buildDirectoryQuery<TSort extends string>(params: ListParams<TSort>): string {
  const searchParams = new URLSearchParams();
  const trimmedSearch = params.search?.trim();

  if (trimmedSearch) {
    searchParams.set('search', trimmedSearch);
  }

  if (params.sort) {
    searchParams.set('sort', params.sort);
  }

  if (typeof params.page === 'number') {
    searchParams.set('page', String(params.page));
  }

  if (typeof params.page_size === 'number') {
    searchParams.set('page_size', String(params.page_size));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const getAdminTeachersDirectory = async (
  token: string,
  params: ListParams<AdminTeachersSort>,
): Promise<AdminTeachersDirectoryResponse> =>
  request<AdminTeachersDirectoryResponse>(
    `/api/v1/admin/teachers${buildDirectoryQuery(params)}`,
    token,
    'Не удалось загрузить список преподавателей.',
  );

export const getAdminTeacherDirectoryDetail = async (
  token: string,
  teacherId: string,
): Promise<AdminTeacherDirectoryDetail> =>
  request<AdminTeacherDirectoryDetail>(
    `/api/v1/admin/teachers/${teacherId}`,
    token,
    'Не удалось загрузить профиль преподавателя.',
  );

export const getAdminStudentsDirectory = async (
  token: string,
  params: ListParams<AdminStudentsSort>,
): Promise<AdminStudentsDirectoryResponse> =>
  request<AdminStudentsDirectoryResponse>(
    `/api/v1/admin/students${buildDirectoryQuery(params)}`,
    token,
    'Не удалось загрузить список учеников.',
  );

export const getAdminStudentDirectoryDetail = async (
  token: string,
  studentId: string,
): Promise<AdminStudentDirectoryDetail> =>
  request<AdminStudentDirectoryDetail>(
    `/api/v1/admin/students/${studentId}`,
    token,
    'Не удалось загрузить профиль ученика.',
  );
