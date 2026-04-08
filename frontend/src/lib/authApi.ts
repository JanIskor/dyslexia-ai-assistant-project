export type UserRole = 'student' | 'teacher' | 'admin';

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string | null;
}

interface ApiFieldError {
  loc?: Array<string | number>;
  msg?: string;
}

interface ApiErrorBody {
  detail?: string | ApiFieldError[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

const getValidationErrorMessage = (errors: ApiFieldError[]): string => {
  const hasEmailError = errors.some((error) => error.loc?.includes('email'));
  if (hasEmailError) {
    return 'Проверьте корректность email.';
  }

  const hasPasswordError = errors.some((error) => error.loc?.includes('password'));
  if (hasPasswordError) {
    return 'Проверьте пароль. Он должен соответствовать требованиям формы.';
  }

  return 'Проверьте корректность введённых данных.';
};

const getErrorMessage = (status: number, body: ApiErrorBody | null): string => {
  if (Array.isArray(body?.detail)) {
    return getValidationErrorMessage(body.detail);
  }

  const detail = body?.detail;
  if (detail === 'Email already registered') {
    return 'Пользователь с таким email уже зарегистрирован.';
  }
  if (detail === 'Incorrect email or password') {
    return 'Неверный email или пароль.';
  }
  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
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

export const registerUser = async (payload: RegisterPayload): Promise<AuthUser> =>
  request<AuthUser>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const loginUser = async (payload: LoginPayload): Promise<AuthToken> =>
  request<AuthToken>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getCurrentUser = async (token: string): Promise<AuthUser> =>
  request<AuthUser>('/api/v1/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
