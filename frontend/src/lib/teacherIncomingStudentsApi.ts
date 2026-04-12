import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface TeacherIncomingStudentListItem {
  id: string;
  full_name: string;
  grade_label: string;
  birth_date: string;
  gender: string;
  enrollment_date: string;
  avatar_url: string | null;
}

export interface TeacherIncomingStudentDetail {
  id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  grade_label: string;
  enrollment_date: string;
  quote: string | null;
  avatar_url: string | null;
}

export interface TeacherIncomingStudentsListResponse {
  items: TeacherIncomingStudentListItem[];
}

interface ApiErrorBody {
  detail?: string;
}

const getTeacherIncomingStudentsErrorMessage = (
  status: number,
  fallbackMessage: string,
  body: ApiErrorBody | null,
): string => {
  if (status === 401 || status === 403) {
    return fallbackMessage;
  }

  if (status === 404 && typeof body?.detail === 'string') {
    return 'Ученик не найден';
  }

  if (status >= 500) {
    return fallbackMessage;
  }

  return fallbackMessage;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(
  path: string,
  token: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body,
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getTeacherIncomingStudentsErrorMessage(response.status, fallbackMessage, body));
  }

  return parseJson<T>(response);
}

export const getTeacherIncomingStudents = async (
  token: string,
): Promise<TeacherIncomingStudentsListResponse> =>
  request<TeacherIncomingStudentsListResponse>(
    '/api/v1/teacher/incoming-students',
    token,
    'Не удалось загрузить новых учеников',
  );

export const getTeacherIncomingStudentDetail = async (
  token: string,
  studentId: string,
): Promise<TeacherIncomingStudentDetail> =>
  request<TeacherIncomingStudentDetail>(
    `/api/v1/teacher/incoming-students/${studentId}`,
    token,
    'Не удалось загрузить карточку ученика',
  );

export const acceptTeacherIncomingStudent = async (
  token: string,
  studentId: string,
): Promise<TeacherIncomingStudentDetail> =>
  request<TeacherIncomingStudentDetail>(
    `/api/v1/teacher/incoming-students/${studentId}/accept`,
    token,
    'Не удалось принять ученика',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const rejectTeacherIncomingStudent = async (
  token: string,
  studentId: string,
): Promise<TeacherIncomingStudentDetail> =>
  request<TeacherIncomingStudentDetail>(
    `/api/v1/teacher/incoming-students/${studentId}/reject`,
    token,
    'Не удалось отклонить ученика',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
