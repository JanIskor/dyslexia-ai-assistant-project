import { buildApiUrl } from '@/lib/apiBaseUrl';

export type StudentProfileStatus = 'draft' | 'submitted' | 'in_review' | 'needs_completion' | 'approved';
export type StudentMode = 'onboarding' | 'regular';

export interface StudentProfile {
  id: string;
  user_id: string;
  student_mode: StudentMode;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  grade_label: string | null;
  enrollment_date: string | null;
  quote: string | null;
  avatar_url: string | null;
  profile_status: StudentProfileStatus;
  submitted_at: string | null;
}

export interface StudentProfileUpdatePayload {
  full_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  quote?: string | null;
}

interface ApiFieldError {
  loc?: Array<string | number>;
  msg?: string;
}

interface ApiErrorBody {
  detail?: string | ApiFieldError[];
}

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  const detail = body?.detail;

  if (detail === 'Required profile fields are missing') {
    return 'Заполните ФИО, дату рождения и пол перед отправкой на модерацию.';
  }

  if (detail === 'Profile is read-only during moderation') {
    return 'Профиль сейчас находится на модерации и временно недоступен для редактирования.';
  }

  if (detail === 'Profile already submitted') {
    return 'Профиль уже отправлен на модерацию.';
  }

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(path: string, token: string, init: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
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

  return parseJson<T>(response);
}

export const getStudentProfile = async (token: string): Promise<StudentProfile> =>
  request<StudentProfile>('/api/v1/student/profile', token, {
    method: 'GET',
  });

export const updateStudentProfile = async (
  token: string,
  payload: StudentProfileUpdatePayload,
): Promise<StudentProfile> =>
  request<StudentProfile>('/api/v1/student/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const submitStudentProfile = async (token: string): Promise<StudentProfile> =>
  request<StudentProfile>('/api/v1/student/profile/submit', token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
