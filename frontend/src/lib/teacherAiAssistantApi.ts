import { buildApiUrl } from '@/lib/apiBaseUrl';
import type { TeacherLearningMaterial } from '@/lib/teacherMaterialsApi';

export interface TeacherAiAssistantMessagePayload {
  message: string;
}

export interface TeacherAiAssistantMessageResponse {
  reply: string;
}

export interface TeacherAiAssistantSaveMaterialPayload {
  title: string;
  original_text: string;
  adapted_text: string;
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null, fallbackMessage: string): string => {
  const detail = body?.detail;

  if (detail === 'Not authenticated' || detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if ((status === 502 || status === 503) && typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return fallbackMessage;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export const sendTeacherAiAssistantMessage = async (
  token: string,
  payload: TeacherAiAssistantMessagePayload,
): Promise<TeacherAiAssistantMessageResponse> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/ai-assistant/messages'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body, 'Не удалось получить ответ ассистента.'));
  }

  return parseJson<TeacherAiAssistantMessageResponse>(response);
};

export const saveTeacherAiAssistantMaterial = async (
  token: string,
  payload: TeacherAiAssistantSaveMaterialPayload,
): Promise<TeacherLearningMaterial> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/ai-assistant/save-material'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(
      getErrorMessage(response.status, body, 'Не удалось сохранить материал из ответа ассистента.'),
    );
  }

  return parseJson<TeacherLearningMaterial>(response);
};
