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
  profile_edit_status: string | null;
  profile_edit_admin_comment: string | null;
}

export interface TeacherProfileEditState {
  id: string | null;
  teacher_user_id: string;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  position: string | null;
  phone: string | null;
  work_email: string | null;
  subject_name: string | null;
  avatar_url: string | null;
  status: 'draft' | 'submitted' | 'in_review' | 'revision_requested' | 'approved';
  admin_comment: string | null;
  updated_at: string | null;
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

  if (body?.detail === 'Required profile fields are missing') {
    return 'Заполните обязательные поля профиля преподавателя.';
  }

  if (body?.detail === 'Gender must be either Мужской or Женский') {
    return 'Пол можно выбрать только из значений «Мужской» или «Женский».';
  }

  if (body?.detail === 'Profile changes are read-only during moderation') {
    return 'Изменения профиля сейчас находятся на модерации и временно недоступны для редактирования.';
  }

  if (body?.detail === 'Profile changes already submitted') {
    return 'Изменения профиля уже отправлены на модерацию.';
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

export const getTeacherProfileEditState = async (token: string): Promise<TeacherProfileEditState> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/profile-edit'), {
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

  return parseJson<TeacherProfileEditState>(response);
};

export const updateTeacherProfileEditState = async (
  token: string,
  payload: Omit<TeacherProfileEditState, 'id' | 'teacher_user_id' | 'status' | 'admin_comment' | 'updated_at'>,
): Promise<TeacherProfileEditState> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/profile-edit'), {
    method: 'PUT',
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

    throw new Error(getTeacherProfileErrorMessage(response.status, body));
  }

  return parseJson<TeacherProfileEditState>(response);
};

export const submitTeacherProfileEditState = async (token: string): Promise<TeacherProfileEditState> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/profile-edit/submit'), {
    method: 'POST',
    headers: {
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

    throw new Error(getTeacherProfileErrorMessage(response.status, body));
  }

  return parseJson<TeacherProfileEditState>(response);
};
