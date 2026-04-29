import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface AdminStudentRemovalRequestItem {
  id: string;
  teacher: {
    user_id: string;
    full_name: string;
  };
  student: {
    user_id: string;
    full_name: string;
    grade_label: string | null;
  };
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  admin_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_admin_user_id: string | null;
}

export interface AdminStudentRemovalRequestsResponse {
  items: AdminStudentRemovalRequestItem[];
}

export interface AdminStudentRemovalRequestUpdatePayload {
  action: 'approve' | 'reject';
  admin_comment?: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null, fallbackMessage: string): string => {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к откреплению учеников есть только у администратора.';
  }

  if (detail === 'Removal request not found') {
    return 'Заявка на открепление не найдена.';
  }

  if (detail === 'Removal request already resolved') {
    return 'Эта заявка уже была обработана.';
  }

  if (detail === 'Teacher student relation not found') {
    return 'Связь преподавателя и ученика уже неактивна.';
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
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
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

export const getAdminStudentRemovalRequests = async (
  token: string,
): Promise<AdminStudentRemovalRequestsResponse> =>
  request<AdminStudentRemovalRequestsResponse>(
    '/api/v1/admin/student-removal-requests',
    token,
    'Не удалось загрузить заявки на открепление.',
    { method: 'GET' },
  );

export const updateAdminStudentRemovalRequest = async (
  token: string,
  requestId: string,
  payload: AdminStudentRemovalRequestUpdatePayload,
): Promise<AdminStudentRemovalRequestItem> =>
  request<AdminStudentRemovalRequestItem>(
    `/api/v1/admin/student-removal-requests/${requestId}`,
    token,
    'Не удалось обработать заявку на открепление.',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
