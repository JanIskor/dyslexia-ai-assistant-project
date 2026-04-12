import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface TeacherStudentMessage {
  id: string;
  teacher_user_id: string;
  student_user_id: string;
  title: string;
  body: string;
  is_read_by_student: boolean;
  created_at: string;
}

export interface TeacherStudentMessagesResponse {
  items: TeacherStudentMessage[];
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null, fallbackMessage: string): string => {
  const detail = body?.detail;

  if (detail === 'Not authenticated' || detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Student not found') {
    return 'Ученик не найден.';
  }

  if (detail === 'Message not found') {
    return 'Сообщение не найдено.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return fallbackMessage;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(path: string, token: string, fallbackMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
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

export const sendTeacherStudentMessage = async (
  token: string,
  studentId: string,
  payload: { title: string; body: string },
): Promise<TeacherStudentMessage> =>
  request<TeacherStudentMessage>(
    `/api/v1/teacher/students/${studentId}/messages`,
    token,
    'Не удалось отправить сообщение.',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

export const getStudentMessages = async (token: string): Promise<TeacherStudentMessagesResponse> =>
  request<TeacherStudentMessagesResponse>('/api/v1/student/messages', token, 'Не удалось загрузить сообщения.', {
    method: 'GET',
  });

export const getStudentMessageDetail = async (
  token: string,
  messageId: string,
): Promise<TeacherStudentMessage> =>
  request<TeacherStudentMessage>(
    `/api/v1/student/messages/${messageId}`,
    token,
    'Не удалось загрузить сообщение.',
    { method: 'GET' },
  );

export const markStudentMessageAsRead = async (
  token: string,
  messageId: string,
): Promise<TeacherStudentMessage> =>
  request<TeacherStudentMessage>(
    `/api/v1/student/messages/${messageId}/read`,
    token,
    'Не удалось отметить сообщение прочитанным.',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
