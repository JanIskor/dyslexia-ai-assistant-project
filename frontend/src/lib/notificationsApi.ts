import { buildApiUrl } from '@/lib/apiBaseUrl';

export interface NotificationItem {
  id: string;
  role: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
}

export interface NotificationUnreadCountResponse {
  unread_count: number;
}

interface ApiErrorBody {
  detail?: string;
}

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  const detail = body?.detail;

  if (detail === 'Not authenticated' || detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Notification not found') {
    return 'Уведомление не найдено.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось загрузить уведомления.';
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
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

  return parseJson<T>(response);
}

export const getNotifications = async (token: string): Promise<NotificationsResponse> =>
  request<NotificationsResponse>('/api/v1/notifications', token, { method: 'GET' });

export const getUnreadNotificationsCount = async (
  token: string,
): Promise<NotificationUnreadCountResponse> =>
  request<NotificationUnreadCountResponse>('/api/v1/notifications/unread-count', token, { method: 'GET' });

export const markNotificationAsRead = async (
  token: string,
  notificationId: string,
): Promise<NotificationItem> =>
  request<NotificationItem>(`/api/v1/notifications/${notificationId}/read`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const markAllNotificationsAsRead = async (
  token: string,
): Promise<NotificationUnreadCountResponse> =>
  request<NotificationUnreadCountResponse>('/api/v1/notifications/read-all', token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
