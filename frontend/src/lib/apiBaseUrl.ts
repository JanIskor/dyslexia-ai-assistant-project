const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

export const getApiBaseUrl = (): string => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (envBaseUrl) {
    return normalizeBaseUrl(envBaseUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  return 'http://localhost:8000';
};

export const buildApiUrl = (path: string): string => `${getApiBaseUrl()}${path}`;
