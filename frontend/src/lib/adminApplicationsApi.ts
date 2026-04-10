export interface AdminApplication {
  id: string;
  full_name: string;
  status: string;
}

export interface AdminApplicationsResponse {
  items: AdminApplication[];
}

interface ApiErrorBody {
  detail?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к списку заявок есть только у администратора.';
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
): Promise<AdminApplicationsResponse> => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const path = params.toString()
    ? `/api/v1/admin/applications?${params.toString()}`
    : '/api/v1/admin/applications';

  const response = await fetch(buildUrl(path), {
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
