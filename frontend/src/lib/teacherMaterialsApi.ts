import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface TeacherLearningMaterial {
  id: string;
  title: string;
  original_text: string;
  material_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherLearningMaterialsListResponse {
  items: TeacherLearningMaterial[];
}

export interface TeacherCreateLearningMaterialPayload {
  title: string;
  original_text: string;
}

interface ApiErrorBody {
  detail?: string;
}

const getTeacherMaterialsErrorMessage = (
  status: number,
  fallbackMessage: string,
  body: ApiErrorBody | null,
): string => {
  if (status === 401 || status === 403) {
    return fallbackMessage;
  }

  if (status === 404 && typeof body?.detail === 'string') {
    return 'Материал не найден';
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

    throw new Error(getTeacherMaterialsErrorMessage(response.status, fallbackMessage, body));
  }

  return parseJson<T>(response);
}

export const getTeacherMaterials = async (
  token: string,
): Promise<TeacherLearningMaterialsListResponse> =>
  request<TeacherLearningMaterialsListResponse>(
    '/api/v1/teacher/materials',
    token,
    'Не удалось загрузить материалы',
  );

export const getTeacherMaterialDetail = async (
  token: string,
  materialId: string,
): Promise<TeacherLearningMaterial> =>
  request<TeacherLearningMaterial>(
    `/api/v1/teacher/materials/${materialId}`,
    token,
    'Не удалось загрузить материал',
  );

export const createTeacherMaterial = async (
  token: string,
  payload: TeacherCreateLearningMaterialPayload,
): Promise<TeacherLearningMaterial> =>
  request<TeacherLearningMaterial>(
    '/api/v1/teacher/materials',
    token,
    'Не удалось создать материал',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
