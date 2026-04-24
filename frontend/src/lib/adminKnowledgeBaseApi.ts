'use client';

import { buildApiUrl } from '@/lib/apiBaseUrl';
import type { TeacherAiAssistantMode } from '@/lib/teacherAiAssistantApi';

export interface KnowledgeDocument {
  id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_object_key: string;
  uploaded_by_user_id: string;
  status: string;
  extracted_text: string | null;
  use_in_rag: boolean;
  adaptation_modes: TeacherAiAssistantMode[];
  chunks_count: number;
  embedded_chunks_count: number;
  created_at: string;
  updated_at: string;
}

interface KnowledgeDocumentsListResponse {
  items: KnowledgeDocument[];
}

interface KnowledgeDocumentDeleteResponse {
  id: string;
  deleted: boolean;
  storage_cleanup_warning?: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

function getErrorMessage(status: number, body: ApiErrorBody | null, fallbackMessage: string): string {
  const detail = body?.detail;

  if (detail === 'Could not validate credentials') {
    return 'Не удалось подтвердить авторизацию. Войдите снова.';
  }

  if (detail === 'Admin access required') {
    return 'Доступ к этому разделу есть только у администратора.';
  }

  if (detail === 'Unsupported file type. Allowed formats: pdf, docx, txt, md.') {
    return 'Неподдерживаемый формат файла. Загрузите PDF, DOCX, TXT или MD.';
  }

  if (detail === 'Uploaded file is empty.') {
    return 'Файл пустой. Выберите документ с текстовым содержимым.';
  }

  if (detail === 'Uploaded file must have a filename.') {
    return 'Не удалось определить имя файла.';
  }

  if (detail === 'Knowledge base file size must be 15MB or less.') {
    return 'Размер файла для базы правил не должен превышать 15 МБ.';
  }

  if (detail === 'Empty extracted text. The document does not contain readable text.') {
    return 'Не удалось извлечь текст из документа. Проверьте, что файл содержит читаемый текст.';
  }

  if (detail === 'Parsing failed for the uploaded document.') {
    return 'Не удалось обработать документ. Проверьте файл и попробуйте снова.';
  }

  if (detail === 'Embedding generation failed for the uploaded document.') {
    return 'Документ загружен, но подготовка embeddings временно недоступна. Попробуйте позже.';
  }

  if (detail === 'Knowledge document not found') {
    return 'Документ базы правил не найден.';
  }

  if (detail === 'Failed to delete knowledge document from storage.') {
    return 'Документ удалён из базы, но очистить storage не удалось.';
  }

  if (status >= 500) {
    return 'Ошибка сервера. Попробуйте ещё раз позже.';
  }

  return detail ?? fallbackMessage;
}

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

    throw new Error(getErrorMessage(response.status, body, fallbackMessage));
  }

  return parseJson<T>(response);
}

export const getKnowledgeDocuments = async (token: string): Promise<KnowledgeDocumentsListResponse> =>
  request<KnowledgeDocumentsListResponse>(
    '/api/v1/admin/knowledge-base/documents',
    token,
    'Не удалось загрузить список документов базы правил.',
  );

export const getKnowledgeDocumentDetail = async (
  token: string,
  documentId: string,
): Promise<KnowledgeDocument> =>
  request<KnowledgeDocument>(
    `/api/v1/admin/knowledge-base/documents/${documentId}`,
    token,
    'Не удалось загрузить документ базы правил.',
  );

export async function uploadKnowledgeDocument(token: string, file: File): Promise<KnowledgeDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildApiUrl('/api/v1/admin/knowledge-base/documents'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(
      getErrorMessage(response.status, body, 'Не удалось загрузить документ в базу правил.'),
    );
  }

  return parseJson<KnowledgeDocument>(response);
}

export async function updateKnowledgeDocumentControls(
  token: string,
  documentId: string,
  payload: {
    use_in_rag?: boolean;
    adaptation_modes?: TeacherAiAssistantMode[];
  },
): Promise<KnowledgeDocument> {
  const response = await fetch(buildApiUrl(`/api/v1/admin/knowledge-base/documents/${documentId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = await parseJson<ApiErrorBody>(response);
    } catch {
      body = null;
    }

    throw new Error(getErrorMessage(response.status, body, 'Не удалось обновить настройки документа.'));
  }

  return parseJson<KnowledgeDocument>(response);
}

export async function deleteKnowledgeDocument(
  token: string,
  documentId: string,
): Promise<KnowledgeDocumentDeleteResponse> {
  const response = await fetch(buildApiUrl(`/api/v1/admin/knowledge-base/documents/${documentId}`), {
    method: 'DELETE',
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

    throw new Error(getErrorMessage(response.status, body, 'Не удалось удалить документ базы правил.'));
  }

  return parseJson<KnowledgeDocumentDeleteResponse>(response);
}
