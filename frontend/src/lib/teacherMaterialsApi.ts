import { buildApiUrl } from '@/lib/apiBaseUrl';

import type { TeacherAiAssistantMode } from '@/lib/teacherAiAssistantApi';

export type TeacherMaterialKind = 'draft' | 'adapted';

export interface TeacherLearningMaterial {
  id: string;
  title: string;
  original_text: string;
  adapted_text?: string | null;
  material_kind: TeacherMaterialKind;
  material_type: string;
  status: string;
  source_type?: 'manual' | 'material' | 'file' | null;
  source_material_id?: string | null;
  source_filename?: string | null;
  adaptation_mode?: TeacherAiAssistantMode | null;
  adaptation_group_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherLearningMaterialsListResponse {
  items: TeacherLearningMaterial[];
}

export interface TeacherAdaptedMaterialSourceInfo {
  source_type: 'manual' | 'material' | 'file';
  source_material_id?: string | null;
  source_material_title?: string | null;
  source_filename?: string | null;
  adaptation_group_key: string;
}

export interface TeacherAdaptationVersionSummary {
  id: string;
  title: string;
  adaptation_mode?: TeacherAiAssistantMode | null;
  created_at: string;
  updated_at: string;
  is_current: boolean;
}

export interface TeacherAdaptedMaterialDetail extends TeacherLearningMaterial {
  source_info?: TeacherAdaptedMaterialSourceInfo | null;
  available_adaptation_versions: TeacherAdaptationVersionSummary[];
}

export interface TeacherCreateLearningMaterialPayload {
  title: string;
  original_text: string;
}

export interface GetTeacherMaterialsOptions {
  kind?: 'all' | 'draft' | 'adapted';
}

export interface TeacherAssignLearningMaterialPayload {
  student_user_id: string;
}

export interface TeacherLearningMaterialAssignment {
  id: string;
  student_user_id: string;
  learning_material_id: string;
  assigned_by_teacher_user_id: string;
  created_at: string;
}

export interface TeacherDeleteLearningMaterialResponse {
  detail: string;
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
    if (body.detail === 'Student not found') {
      return 'Ученик не найден.';
    }

    return 'Материал не найден';
  }

  if (status === 409 && body?.detail === 'Material already assigned to this student') {
    return 'Этот материал уже назначен выбранному ученику.';
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
  options?: GetTeacherMaterialsOptions,
): Promise<TeacherLearningMaterialsListResponse> =>
  request<TeacherLearningMaterialsListResponse>(
    `/api/v1/teacher/materials${options?.kind ? `?kind=${options.kind}` : ''}`,
    token,
    'Не удалось загрузить материалы',
  );

export const getTeacherMaterialDetail = async (
  token: string,
  materialId: string,
): Promise<TeacherAdaptedMaterialDetail> =>
  request<TeacherAdaptedMaterialDetail>(
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

export const assignTeacherMaterial = async (
  token: string,
  materialId: string,
  payload: TeacherAssignLearningMaterialPayload,
): Promise<TeacherLearningMaterialAssignment> =>
  request<TeacherLearningMaterialAssignment>(
    `/api/v1/teacher/materials/${materialId}/assign`,
    token,
    'Не удалось назначить материал',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

export const deleteTeacherMaterial = async (
  token: string,
  materialId: string,
): Promise<TeacherDeleteLearningMaterialResponse> =>
  request<TeacherDeleteLearningMaterialResponse>(
    `/api/v1/teacher/materials/${materialId}`,
    token,
    'Не удалось удалить материал',
    {
      method: 'DELETE',
    },
  );
