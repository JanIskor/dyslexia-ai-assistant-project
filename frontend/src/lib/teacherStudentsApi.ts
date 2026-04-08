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

interface ApiErrorBody {
  detail?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

const getTeacherStudentsErrorMessage = (
  status: number,
  fallbackMessage: string,
  body: ApiErrorBody | null,
): string => {
  if (status === 401 || status === 403) {
    return fallbackMessage;
  }

  if (status === 404 && typeof body?.detail === 'string') {
    return 'Не удалось загрузить профиль ученика';
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
  const response = await fetch(buildUrl(path), {
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

export const getTeacherStudents = async (token: string): Promise<TeacherStudentListItem[]> =>
  request<TeacherStudentListItem[]>(
    '/api/v1/teacher/students',
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
