import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface AdminApplication {
  id: string;
  full_name: string;
  status: string;
}

export interface AdminApplicationDetail {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  quote: string | null;
  avatar_url: string | null;
  status: string;
  grade_label: string | null;
  enrollment_date: string | null;
}

export interface AdminApplicationStatusFilterOption {
  value: string;
  label: string;
}

export interface AdminApplicationsResponse {
  items: AdminApplication[];
}

export interface AdminApplicationFiltersResponse {
  statuses: AdminApplicationStatusFilterOption[];
}

export interface AdminApplicationUpdatePayload {
  grade_label?: string | null;
  enrollment_date?: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к списку заявок есть только у администратора.';
  }

  if (detail === 'Application not found') {
    return 'Заявка не найдена.';
  }

  if (detail === 'Application cannot be sent for revision') {
    return 'Эту заявку сейчас нельзя отправить на доработку.';
  }

  if (detail === 'Application cannot be approved') {
    return 'Эту заявку сейчас нельзя подтвердить.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось загрузить список заявок.';
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export const getAdminApplications = async (
  token: string,
  search: string,
  statuses: string[],
): Promise<AdminApplicationsResponse> => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  statuses.forEach((status) => {
    params.append('status', status);
  });

  const path = params.toString()
    ? `/api/v1/admin/applications?${params.toString()}`
    : '/api/v1/admin/applications';

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationsResponse>(response);
};

export const getAdminApplicationFilters = async (
  token: string,
): Promise<AdminApplicationFiltersResponse> => {
  const response = await fetch(buildApiUrl('/api/v1/admin/applications/filters'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationFiltersResponse>(response);
};

export const getAdminApplicationDetail = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const updateAdminApplication = async (
  token: string,
  applicationId: string,
  payload: AdminApplicationUpdatePayload,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}`), {
    method: 'PATCH',
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

    throw new Error(getErrorMessage(response.status, body));
  }

  return parseJson<AdminApplicationDetail>(response);
};

export const requestAdminApplicationChanges = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}/request-changes`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
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

  return parseJson<AdminApplicationDetail>(response);
};

export const approveAdminApplication = async (
  token: string,
  applicationId: string,
): Promise<AdminApplicationDetail> => {
  const response = await fetch(buildApiUrl(`/api/v1/admin/applications/${applicationId}/approve`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
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

  return parseJson<AdminApplicationDetail>(response);
};
