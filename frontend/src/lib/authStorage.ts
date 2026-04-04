const ACCESS_TOKEN_KEY = 'auth.access_token';

const isBrowser = (): boolean => typeof window !== 'undefined';

export const saveAccessToken = (token: string, remember: boolean): void => {
  if (!isBrowser()) {
    return;
  }

  const primaryStorage = remember ? window.localStorage : window.sessionStorage;
  const secondaryStorage = remember ? window.sessionStorage : window.localStorage;

  primaryStorage.setItem(ACCESS_TOKEN_KEY, token);
  secondaryStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const getAccessToken = (): string | null => {
  if (!isBrowser()) {
    return null;
  }

  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
};

export const clearAccessToken = (): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};
