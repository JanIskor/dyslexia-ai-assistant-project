import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface StudentLearningMaterialListItem {
  id: string;
  title: string;
  preview_text: string;
  is_adapted: boolean;
  created_at: string;
}

export interface StudentLearningMaterialsListResponse {
  items: StudentLearningMaterialListItem[];
}

export interface StudentLearningMaterialDetail {
  id: string;
  title: string;
  original_text: string;
  is_adapted: boolean;
  created_at: string;
}

interface ApiErrorBody {
  detail?: string;
}

const getStudentMaterialsErrorMessage = (
  status: number,
  body: ApiErrorBody | null,
  fallbackMessage: string,
): string => {
  if (body?.detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (body?.detail === 'Learning material not found') {
    return 'Материал не найден.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return fallbackMessage;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

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

    throw new Error(getStudentMaterialsErrorMessage(response.status, body, fallbackMessage));
  }

  return parseJson<T>(response);
}

export const getStudentMaterials = async (
  token: string,
): Promise<StudentLearningMaterialsListResponse> =>
  request<StudentLearningMaterialsListResponse>(
    '/api/v1/student/materials',
    token,
    'Не удалось загрузить учебные материалы.',
  );

export const getStudentMaterialDetail = async (
  token: string,
  materialId: string,
): Promise<StudentLearningMaterialDetail> =>
  request<StudentLearningMaterialDetail>(
    `/api/v1/student/materials/${materialId}`,
    token,
    'Не удалось загрузить материал.',
  );
