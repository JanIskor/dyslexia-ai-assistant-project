import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface TeacherProfile {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  gender: string;
  position: string;
  phone: string;
  work_email: string;
  subject_name: string;
  avatar_url: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const getTeacherProfileErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  if (status === 401 || status === 403) {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (body?.detail === 'Teacher profile not found') {
    return 'Профиль преподавателя не найден.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось загрузить профиль преподавателя.';
};

export const getTeacherProfile = async (token: string): Promise<TeacherProfile> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/profile'), {
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

    throw new Error(getTeacherProfileErrorMessage(response.status, body));
  }

  return parseJson<TeacherProfile>(response);
};
