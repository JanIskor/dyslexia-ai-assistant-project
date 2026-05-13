import { buildApiUrl } from '@/lib/apiBaseUrl';
import type { TeacherLearningMaterial } from '@/lib/teacherMaterialsApi';

export type TeacherAiAssistantStrategyMode = 'mode_a' | 'mode_b';

export type TeacherAiAssistantLegacyMode =
  | 'basic_simplify'
  | 'structured_explanation'
  | 'key_points_focus';

export type TeacherAiAssistantMode = TeacherAiAssistantStrategyMode | TeacherAiAssistantLegacyMode;

export type TeacherAiAssistantGenre =
  | 'educational'
  | 'scientific_popular'
  | 'fiction'
  | 'legal'
  | 'instruction'
  | 'other';

export type KnowledgeBaseMethodologyTag = TeacherAiAssistantMode | TeacherAiAssistantGenre;

export interface TeacherAiAssistantMessagePayload {
  message: string;
  mode: TeacherAiAssistantMode;
  genre: TeacherAiAssistantGenre;
}

export interface TeacherAiAssistantMessageResponse {
  reply: string;
  used_knowledge_chunks?: Array<{
    document_title: string;
    chunk_index: number;
  }>;
}

export interface TeacherAiAssistantSaveMaterialPayload {
  title: string;
  original_text: string;
  adapted_text: string;
  source_type: 'manual' | 'material' | 'file';
  source_material_id?: string;
  source_filename?: string;
  adaptation_mode: TeacherAiAssistantMode;
}

export interface TeacherAiAssistantSourceStatusPayload {
  original_text: string;
  source_type: 'manual' | 'material' | 'file';
  source_material_id?: string;
  source_filename?: string;
}

export interface TeacherAiAssistantParsedFileResponse {
  filename: string;
  extracted_text: string;
}

export interface TeacherAiAssistantSaveMaterialResponse extends TeacherLearningMaterial {
  save_type: 'created' | 'updated';
}

export interface TeacherAiAssistantSourceStatusResponse {
  adaptation_group_key?: string | null;
  group_title?: string | null;
}

export const MAX_TEACHER_AI_ASSISTANT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null, fallbackMessage: string): string => {
  const detail = body?.detail;

  if (detail === 'Not authenticated' || detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (typeof detail === 'string' && detail.trim() && status < 500) {
    return detail;
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
): Promise<TeacherAiAssistantSaveMaterialResponse> => {
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

  return parseJson<TeacherAiAssistantSaveMaterialResponse>(response);
};

export const getTeacherAiAssistantSourceStatus = async (
  token: string,
  payload: TeacherAiAssistantSourceStatusPayload,
): Promise<TeacherAiAssistantSourceStatusResponse> => {
  const response = await fetch(buildApiUrl('/api/v1/teacher/ai-assistant/source-status'), {
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
      getErrorMessage(response.status, body, 'Не удалось определить статус сохранения для текущего источника.'),
    );
  }

  return parseJson<TeacherAiAssistantSourceStatusResponse>(response);
};

export const parseTeacherAiAssistantFile = async (
  token: string,
  file: File,
): Promise<TeacherAiAssistantParsedFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildApiUrl('/api/v1/teacher/ai-assistant/parse-file'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
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
      getErrorMessage(response.status, body, 'Не удалось извлечь текст из выбранного файла.'),
    );
  }

  return parseJson<TeacherAiAssistantParsedFileResponse>(response);
};
