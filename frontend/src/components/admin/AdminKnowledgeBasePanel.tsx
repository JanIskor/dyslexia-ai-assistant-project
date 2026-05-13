'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  deleteKnowledgeDocument,
  getKnowledgeDocumentDetail,
  getKnowledgeDocuments,
  updateKnowledgeDocumentControls,
  uploadKnowledgeDocument,
  type KnowledgeDocument,
} from '@/lib/adminKnowledgeBaseApi';
import {
  KNOWLEDGE_BASE_GENRE_TAG_OPTIONS,
  KNOWLEDGE_BASE_PRODUCT_MODE_TAG_OPTIONS,
  KNOWLEDGE_BASE_STRATEGY_MODE_TAG_OPTIONS,
  getKnowledgeBaseMethodologyTagLabel,
} from '@/lib/adaptationModes';

type MessageTone = 'success' | 'error';

const SUPPORTED_FILE_TYPES = '.pdf,.docx,.txt,.md';

function formatDisplayDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

function getDocumentFormatLabel(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    case 'text/plain':
      return 'TXT';
    case 'text/markdown':
      return 'MD';
    default:
      return mimeType;
  }
}

function getKnowledgeStatusUi(status: string): { label: string; toneClassName: string } {
  switch (status) {
    case 'uploaded':
      return {
        label: 'Загружен',
        toneClassName: 'bg-sky-50 text-sky-700 border border-sky-100',
      };
    case 'parsed':
      return {
        label: 'Текст извлечён',
        toneClassName: 'bg-amber-50 text-amber-700 border border-amber-100',
      };
    case 'chunked':
      return {
        label: 'Разбит на чанки',
        toneClassName: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      };
    case 'embedded':
      return {
        label: 'Готов для RAG',
        toneClassName: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      };
    case 'failed':
      return {
        label: 'Ошибка обработки',
        toneClassName: 'bg-rose-50 text-rose-700 border border-rose-100',
      };
    default:
      return {
        label: status,
        toneClassName: 'bg-stone-100 text-stone-600 border border-stone-200',
      };
  }
}

function getMessageClassName(tone: MessageTone): string {
  return tone === 'success'
    ? 'border-emerald-100 bg-emerald-50/90 text-emerald-700'
    : 'border-rose-100 bg-rose-50/90 text-rose-600';
}

function buildPreview(text: string | null): string {
  if (!text) {
    return 'Текст ещё не извлечён.';
  }

  return text.length > 1400 ? `${text.slice(0, 1400).trim()}...` : text;
}

export function AdminKnowledgeBasePanel({ token }: { token: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingControls, setIsSavingControls] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>('success');

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);

      try {
        const response = await getKnowledgeDocuments(token);

        if (!isMounted) {
          return;
        }

        setDocuments(response.items);
        setSelectedDocumentId((currentSelectedId) => {
          if (currentSelectedId && response.items.some((item) => item.id === currentSelectedId)) {
            return currentSelectedId;
          }

          return null;
        });
      } catch (error) {
        if (isMounted) {
          setDocuments([]);
          setMessageTone('error');
          setMessage(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить документы базы правил.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!selectedDocumentId) {
        setSelectedDocument(null);
        return;
      }

      setIsLoadingDetail(true);

      try {
        const response = await getKnowledgeDocumentDetail(token, selectedDocumentId);

        if (isMounted) {
          setSelectedDocument(response);
          setDocuments((currentDocuments) =>
            currentDocuments.map((document) =>
              document.id === response.id ? response : document,
            ),
          );
        }
      } catch (error) {
        if (isMounted) {
          setMessageTone('error');
          setMessage(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить документ базы правил.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedDocumentId, token]);

  const handleUploadTrigger = () => {
    fileInputRef.current?.click();
  };

  const replaceDocumentInState = (updatedDocument: KnowledgeDocument) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === updatedDocument.id ? updatedDocument : document,
      ),
    );
    setSelectedDocument(updatedDocument);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const uploadedDocument = await uploadKnowledgeDocument(token, file);
      const response = await getKnowledgeDocuments(token);

      setDocuments(response.items);
      setSelectedDocumentId(uploadedDocument.id);
      setSelectedDocument(uploadedDocument);
      setMessageTone('success');
      setMessage(`Документ «${uploadedDocument.title}» загружен в базу правил.`);
    } catch (error) {
      setMessageTone('error');
      setMessage(
        error instanceof Error ? error.message : 'Не удалось загрузить документ в базу правил.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateControls = async (payload: {
    use_in_rag?: boolean;
    adaptation_modes?: KnowledgeDocument['adaptation_modes'];
  }) => {
    if (!selectedDocument) {
      return;
    }

    setIsSavingControls(true);
    setMessage(null);

    try {
      const updatedDocument = await updateKnowledgeDocumentControls(token, selectedDocument.id, payload);
      replaceDocumentInState(updatedDocument);
      setMessageTone('success');
      setMessage(`Настройки документа «${updatedDocument.title}» обновлены.`);
    } catch (error) {
      setMessageTone('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить настройки документа базы правил.',
      );
    } finally {
      setIsSavingControls(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) {
      return;
    }

    const documentToDelete = selectedDocument;
    setIsDeletingDocument(true);
    setMessage(null);

    try {
      const result = await deleteKnowledgeDocument(token, documentToDelete.id);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== documentToDelete.id),
      );
      setSelectedDocument(null);
      setSelectedDocumentId((currentSelectedId) =>
        currentSelectedId === documentToDelete.id ? null : currentSelectedId,
      );
      setMessageTone('success');
      setMessage(
        result.storage_cleanup_warning
          ? `${result.storage_cleanup_warning}`
          : `Документ «${documentToDelete.title}» удалён.`,
      );
    } catch (error) {
      setMessageTone('error');
      setMessage(
        error instanceof Error ? error.message : 'Не удалось удалить документ базы правил.',
      );
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const renderListState = () => {
    if (isLoading) {
      return (
        <div className="rounded-[24px] border border-orange-50/80 bg-white/90 px-5 py-8 text-base text-stone-400 sm:text-lg">
          Загружаем документы базы правил...
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <div
          className="rounded-[26px] border border-dashed border-orange-200 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(255,246,240,0.92))] px-6 py-10 text-center"
          data-testid="admin-knowledge-base-empty-state"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-400">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-stone-700 sm:text-2xl">
            База правил пока пуста
          </h3>
          <p className="mt-3 text-sm leading-6 text-stone-500 sm:text-base">
            Загрузите методический документ, чтобы он прошёл ingestion, chunking и embedding для
            RAG. Файлы teacher assistant сюда не попадают автоматически.
          </p>
          <button
            type="button"
            onClick={handleUploadTrigger}
            disabled={isUploading}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(251,146,60,0.25)] transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-200"
          >
            <UploadCloud className="h-4 w-4" />
            Загрузить документ
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3" data-testid="admin-knowledge-base-list">
        {documents.map((document) => {
          const statusUi = getKnowledgeStatusUi(document.status);
          const isActive = document.id === selectedDocumentId;

          return (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedDocumentId(document.id)}
              className={`w-full rounded-[24px] border px-5 py-4 text-left transition ${
                isActive
                  ? 'border-orange-200 bg-orange-50/70 shadow-[0_12px_30px_rgba(251,146,60,0.12)]'
                  : 'border-orange-100/70 bg-white/95 hover:border-orange-200 hover:bg-orange-50/40'
              }`}
              data-testid="admin-knowledge-base-document-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-stone-700">{document.title}</h3>
                  <p className="mt-1 truncate text-sm text-stone-500">{document.original_filename}</p>
                </div>
                <StatusBadge
                  label={statusUi.label}
                  toneClassName={statusUi.toneClassName}
                  className="self-start"
                />
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-stone-500 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Формат</dt>
                  <dd className="mt-1 text-sm font-medium text-stone-600">
                    {getDocumentFormatLabel(document.mime_type)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Статус</dt>
                  <dd className="mt-1 text-sm font-medium text-stone-600">{document.status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Создан</dt>
                  <dd className="mt-1 text-sm font-medium text-stone-600">
                    {formatDisplayDate(document.created_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    document.use_in_rag
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-stone-200 bg-stone-100 text-stone-500'
                  }`}
                >
                  {document.use_in_rag ? 'Используется в RAG' : 'Не используется в RAG'}
                </span>
                <span className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-stone-600">
                  {document.adaptation_modes.length === 0
                    ? 'Общие правила для всех стратегий и жанров'
                    : document.adaptation_modes.map((mode) => getKnowledgeBaseMethodologyTagLabel(mode)).join(', ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (isLoadingDetail) {
      return (
        <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-6 py-7 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
          <p className="text-base text-stone-500 sm:text-lg">Загружаем документ базы правил...</p>
        </section>
      );
    }

    if (!selectedDocument) {
      return (
        <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-6 py-7 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
          <h3 className="text-xl font-semibold text-stone-700 sm:text-2xl">Методическая база RAG</h3>
          <p className="mt-3 text-sm leading-6 text-stone-500 sm:text-base">
            Выберите документ слева, чтобы посмотреть extracted text preview, количество chunk-ов и
            готовность embeddings. Knowledge base хранит правила адаптации, а не teacher source
            content.
          </p>
        </section>
      );
    }

    const statusUi = getKnowledgeStatusUi(selectedDocument.status);

    return (
      <section
        className="rounded-[30px] border border-orange-100/80 bg-white/92 px-6 py-7 shadow-[0_18px_50px_rgba(221,156,130,0.10)]"
        data-testid="admin-knowledge-base-detail"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-semibold text-stone-700">
              {selectedDocument.title}
            </h3>
            <p className="mt-2 text-sm text-stone-500">{selectedDocument.original_filename}</p>
          </div>
          <div data-testid="admin-knowledge-base-status">
            <StatusBadge label={statusUi.label} toneClassName={statusUi.toneClassName} />
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Формат</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">
              {selectedDocument.mime_type} ({getDocumentFormatLabel(selectedDocument.mime_type)})
            </dd>
          </div>
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Статус pipeline</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">{selectedDocument.status}</dd>
          </div>
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Chunks</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">
              {selectedDocument.chunks_count}
            </dd>
          </div>
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Embedded chunks</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">
              {selectedDocument.embedded_chunks_count}
            </dd>
          </div>
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Создан</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">
              {formatDisplayDate(selectedDocument.created_at)}
            </dd>
          </div>
          <div className="rounded-[22px] border border-orange-50 bg-orange-50/40 px-4 py-4">
            <dt className="text-xs uppercase tracking-[0.16em] text-stone-400">Обновлён</dt>
            <dd className="mt-2 text-base font-medium text-stone-700">
              {formatDisplayDate(selectedDocument.updated_at)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-[24px] border border-orange-50 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-5 py-5">
          <div className="flex flex-col gap-4 rounded-[22px] border border-orange-100/70 bg-white/80 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-stone-700">RAG controls</h4>
                <p className="mt-1 text-sm leading-6 text-stone-500">
                  Документ может быть загружен и embedded, но участвует в retrieval только если
                  включён для глобального RAG.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={selectedDocument.use_in_rag}
                  disabled={isSavingControls || isDeletingDocument}
                  onChange={(event) =>
                    void handleUpdateControls({ use_in_rag: event.target.checked })
                  }
                  data-testid="admin-knowledge-base-use-in-rag-toggle"
                  className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
                />
                Использовать в RAG
              </label>
            </div>

            <div>
              <h5 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-400">
                Теги применения
              </h5>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Если ничего не выбрано, документ считается общим методическим правилом и доступен
                для всех методов, стратегий и жанров.
              </p>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Методы адаптации
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {KNOWLEDGE_BASE_PRODUCT_MODE_TAG_OPTIONS.map((option) => {
                    const isChecked = selectedDocument.adaptation_modes.includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 rounded-[18px] border border-orange-100 bg-orange-50/35 px-4 py-3 text-sm font-medium text-stone-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSavingControls || isDeletingDocument}
                          onChange={(event) => {
                            const nextModes = event.target.checked
                              ? [...selectedDocument.adaptation_modes, option.value]
                              : selectedDocument.adaptation_modes.filter((mode) => mode !== option.value);

                            void handleUpdateControls({ adaptation_modes: nextModes });
                          }}
                          data-testid={`admin-knowledge-base-product-mode-${option.value}`}
                          className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Стратегии адаптации
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {KNOWLEDGE_BASE_STRATEGY_MODE_TAG_OPTIONS.map((option) => {
                    const isChecked = selectedDocument.adaptation_modes.includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 rounded-[18px] border border-orange-100 bg-orange-50/35 px-4 py-3 text-sm font-medium text-stone-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSavingControls || isDeletingDocument}
                          onChange={(event) => {
                            const nextModes = event.target.checked
                              ? [...selectedDocument.adaptation_modes, option.value]
                              : selectedDocument.adaptation_modes.filter((mode) => mode !== option.value);

                            void handleUpdateControls({ adaptation_modes: nextModes });
                          }}
                          data-testid={`admin-knowledge-base-mode-${option.value}`}
                          className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Жанры
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {KNOWLEDGE_BASE_GENRE_TAG_OPTIONS.map((option) => {
                  const isChecked = selectedDocument.adaptation_modes.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-[18px] border border-orange-100 bg-orange-50/35 px-4 py-3 text-sm font-medium text-stone-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSavingControls || isDeletingDocument}
                        onChange={(event) => {
                          const nextModes = event.target.checked
                            ? [...selectedDocument.adaptation_modes, option.value]
                            : selectedDocument.adaptation_modes.filter((mode) => mode !== option.value);

                          void handleUpdateControls({ adaptation_modes: nextModes });
                        }}
                        data-testid={`admin-knowledge-base-genre-${option.value}`}
                        className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-400"
                      />
                      {option.label}
                    </label>
                  );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleDeleteDocument()}
                disabled={isDeletingDocument || isSavingControls}
                data-testid="admin-knowledge-base-delete-button"
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {isDeletingDocument ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone-700">
            <FileText className="h-5 w-5 text-orange-400" />
            <h4 className="text-lg font-semibold">Extracted text preview</h4>
          </div>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600">
            {buildPreview(selectedDocument.extracted_text)}
          </pre>
        </div>
      </section>
    );
  };

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-stone-700 sm:text-3xl">Правила адаптации</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500 sm:text-base">
            Здесь администратор загружает методические материалы для knowledge base RAG. Teacher
            input files и материалы для обработки остаются отдельным контуром и не попадают сюда
            автоматически.
          </p>
        </div>
        <button
          type="button"
          onClick={handleUploadTrigger}
          disabled={isUploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(251,146,60,0.25)] transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-200"
          data-testid="admin-knowledge-base-upload-trigger"
        >
          <UploadCloud className="h-4 w-4" />
          {isUploading ? 'Загрузка...' : 'Загрузить документ'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FILE_TYPES}
          onChange={handleFileChange}
          className="hidden"
          data-testid="admin-knowledge-base-file-input"
        />
      </div>

      {message ? (
        <div
          className={`mt-5 rounded-[20px] border px-4 py-3 text-sm font-medium ${getMessageClassName(messageTone)}`}
          data-testid={
            messageTone === 'success' ? 'admin-knowledge-base-success' : 'admin-knowledge-base-error'
          }
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
        <div>{renderListState()}</div>
        <div>{renderDetailPanel()}</div>
      </div>
    </section>
  );
}
