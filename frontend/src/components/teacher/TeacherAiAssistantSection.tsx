'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpenText, ChevronDown, FileText, LoaderCircle, Plus, X } from 'lucide-react';
import {
  MAX_TEACHER_AI_ASSISTANT_FILE_SIZE_BYTES,
  saveTeacherAiAssistantMaterial,
  sendTeacherAiAssistantMessage,
  parseTeacherAiAssistantFile,
  type TeacherAiAssistantMode,
  type TeacherAiAssistantMessageResponse,
} from '@/lib/teacherAiAssistantApi';
import { getTeacherMaterials, type TeacherLearningMaterial } from '@/lib/teacherMaterialsApi';

type TeacherAiAssistantMessageRole = 'user' | 'assistant';

interface TeacherAiAssistantMessage {
  id: string;
  role: TeacherAiAssistantMessageRole;
  content: string;
  sourceText?: string;
  source?: TeacherAiAssistantSource;
  adaptationMode?: TeacherAiAssistantMode;
  usedKnowledgeChunks?: TeacherAiAssistantMessageResponse['used_knowledge_chunks'];
}

type TeacherAiAssistantSource =
  | { kind: 'manual'; label: 'Ручной текст' }
  | { kind: 'material'; label: string; materialId: string }
  | { kind: 'file'; label: string; filename: string };

interface TeacherAiAssistantSectionProps {
  accessToken: string;
}

const EMPTY_STATE_TEXT = 'Введите текст, который нужно адаптировать';
const MAX_COMPOSER_HEIGHT_PX = 224;
const ACCEPTED_ASSISTANT_FILE_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'] as const;

const ADAPTATION_MODES: ReadonlyArray<{
  value: TeacherAiAssistantMode;
  label: string;
}> = [
  { value: 'basic_simplify', label: 'Упростить текст' },
  { value: 'structured_explanation', label: 'Сделать пошаговым' },
  { value: 'key_points_focus', label: 'Выделить главное' },
];

type ComposerActionMenu = 'actions' | 'mode' | null;

function formatBytesToMegabytes(bytes: number) {
  return `${Math.floor(bytes / (1024 * 1024))}MB`;
}

function getAssistantInputFileExtension(filename: string) {
  const match = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

function validateAssistantInputFile(file: File): string | null {
  const extension = getAssistantInputFileExtension(file.name);

  if (!ACCEPTED_ASSISTANT_FILE_EXTENSIONS.includes(extension as (typeof ACCEPTED_ASSISTANT_FILE_EXTENSIONS)[number])) {
    return 'Поддерживаются только файлы PDF, DOCX, TXT и MD.';
  }

  if (file.size === 0) {
    return 'Файл пустой. Выберите документ с текстом.';
  }

  if (file.size > MAX_TEACHER_AI_ASSISTANT_FILE_SIZE_BYTES) {
    return `Размер файла должен быть не больше ${formatBytesToMegabytes(MAX_TEACHER_AI_ASSISTANT_FILE_SIZE_BYTES)}.`;
  }

  return null;
}

function SaveMaterialModal({
  isOpen,
  title,
  onTitleChange,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  isOpen: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/20 px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-8">
      <div className="w-full max-w-xl rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)]">
        <div className="border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">
                Сохранить как материал
              </h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                Укажите название, и ответ ассистента будет сохранён в черновики материалов.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Закрыть modal сохранения материала"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <label
            htmlFor="teacher-ai-save-material-title"
            className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
          >
            Название
          </label>
          <input
            id="teacher-ai-save-material-title"
            data-testid="teacher-ai-save-material-title"
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={isSubmitting}
            placeholder="Введите название материала"
            className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          />

          {errorMessage ? (
            <p
              data-testid="teacher-ai-save-material-error"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="border-t border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || title.trim().length === 0}
              data-testid="teacher-ai-save-material-submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MaterialSourceModal({
  isOpen,
  materials,
  isLoading,
  errorMessage,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  materials: TeacherLearningMaterial[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSelect: (material: TeacherLearningMaterial) => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/20 px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-8">
      <div className="w-full max-w-2xl rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)]">
        <div className="border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">
                Выбрать материал
              </h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                Выберите один из ваших материалов, и его текст станет текущим источником для ассистента.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть выбор материала"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-[24px] border border-orange-100 bg-orange-50/60 px-4 py-10 text-stone-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Загружаем материалы...
            </div>
          ) : errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 sm:text-base">
              {errorMessage}
            </div>
          ) : materials.length === 0 ? (
            <div
              data-testid="teacher-ai-assistant-material-empty-state"
              className="rounded-[24px] border border-dashed border-orange-200 bg-orange-50/40 px-5 py-10 text-center text-sm text-stone-500 sm:text-base"
            >
              У вас пока нет материалов, которые можно использовать как источник текста.
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => onSelect(material)}
                  data-testid="teacher-ai-assistant-material-option"
                  className="flex w-full flex-col rounded-[22px] border border-orange-100 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-orange-50/60"
                >
                  <span className="text-base font-medium text-stone-700">{material.title}</span>
                  <span className="mt-2 line-clamp-3 text-sm text-stone-500">
                    {material.original_text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      data-testid="teacher-ai-assistant-loading"
      className="inline-flex items-center gap-2 rounded-[24px] border border-orange-100 bg-orange-50/80 px-4 py-3 text-stone-500 shadow-sm"
      aria-label="Ассистент печатает"
    >
      <div className="flex items-center gap-1.5" data-testid="teacher-ai-assistant-typing-dots">
        {[0, 1, 2].map((index) => (
          <span
            // Staggered pulse keeps the typing state visible without adding noisy motion.
            key={index}
            className="h-2.5 w-2.5 rounded-full bg-orange-300/90 animate-pulse"
            style={{ animationDelay: `${index * 180}ms`, animationDuration: '1s' }}
          />
        ))}
      </div>
      <span className="text-sm sm:text-base">Ассистент печатает...</span>
    </div>
  );
}

export function TeacherAiAssistantSection({ accessToken }: TeacherAiAssistantSectionProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState<TeacherAiAssistantMessage[]>([]);
  const [currentSource, setCurrentSource] = useState<TeacherAiAssistantSource>({
    kind: 'manual',
    label: 'Ручной текст',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedAssistantMessageId, setSelectedAssistantMessageId] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TeacherAiAssistantMode>('basic_simplify');
  const [openComposerMenu, setOpenComposerMenu] = useState<ComposerActionMenu>(null);
  const [expandedKnowledgeMessageIds, setExpandedKnowledgeMessageIds] = useState<string[]>([]);
  const [isMaterialSourceModalOpen, setIsMaterialSourceModalOpen] = useState(false);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialSourceError, setMaterialSourceError] = useState<string | null>(null);
  const [availableMaterials, setAvailableMaterials] = useState<TeacherLearningMaterial[]>([]);
  const [isParsingFileSource, setIsParsingFileSource] = useState(false);
  const activeFileParseRequestIdRef = useRef(0);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerActionsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';

    const nextHeight = Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_COMPOSER_HEIGHT_PX ? 'auto' : 'hidden';
  }, [draftMessage]);

  useEffect(() => {
    const viewport = chatViewportRef.current;

    if (!viewport) {
      return;
    }

    requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, [messages, isSubmitting]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!composerActionsRef.current) {
        return;
      }

      if (composerActionsRef.current.contains(event.target as Node)) {
        return;
      }

      setOpenComposerMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenComposerMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSubmit = async () => {
    const trimmedMessage = draftMessage.trim();

    if (!trimmedMessage || isSubmitting || isParsingFileSource) {
      return;
    }

    const userMessage: TeacherAiAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraftMessage('');
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await sendTeacherAiAssistantMessage(accessToken, {
        message: trimmedMessage,
        mode: selectedMode,
      });

      const assistantMessage: TeacherAiAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        sourceText: trimmedMessage,
        source: currentSource,
        adaptationMode: selectedMode,
        usedKnowledgeChunks: response.used_knowledge_chunks,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не удалось получить ответ ассистента.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAssistantMessage =
    selectedAssistantMessageId === null
      ? null
      : messages.find((message) => message.id === selectedAssistantMessageId && message.role === 'assistant') ??
        null;

  const handleOpenSaveModal = (message: TeacherAiAssistantMessage) => {
    setSelectedAssistantMessageId(message.id);
    setMaterialTitle('');
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsSaveModalOpen(true);
  };

  const handleCloseSaveModal = () => {
    if (isSavingMaterial) {
      return;
    }

    setIsSaveModalOpen(false);
    setSelectedAssistantMessageId(null);
    setMaterialTitle('');
    setSaveErrorMessage(null);
  };

  const handleSaveMaterial = async () => {
    if (!selectedAssistantMessage) {
      setSaveErrorMessage('Не удалось определить ответ ассистента для сохранения.');
      return;
    }

    if (!selectedAssistantMessage.sourceText?.trim()) {
      setSaveErrorMessage('Не удалось определить исходный текст для сохранения материала.');
      return;
    }

    if (!materialTitle.trim()) {
      setSaveErrorMessage('Введите название материала.');
      return;
    }

    setIsSavingMaterial(true);
    setSaveErrorMessage(null);

    try {
      await saveTeacherAiAssistantMaterial(accessToken, {
        title: materialTitle,
        original_text: selectedAssistantMessage.sourceText,
        adapted_text: selectedAssistantMessage.content,
        source_type: selectedAssistantMessage.source?.kind ?? 'manual',
        source_material_id:
          selectedAssistantMessage.source?.kind === 'material'
            ? selectedAssistantMessage.source.materialId
            : undefined,
        source_filename:
          selectedAssistantMessage.source?.kind === 'file'
            ? selectedAssistantMessage.source.filename
            : undefined,
        adaptation_mode: selectedAssistantMessage.adaptationMode ?? selectedMode,
      });

      setIsSaveModalOpen(false);
      setSelectedAssistantMessageId(null);
      setMaterialTitle('');
      setSaveSuccessMessage('Адаптированный материал добавлен в материалы.');
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error ? error.message : 'Не удалось сохранить материал из ответа ассистента.',
      );
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const toggleComposerMenu = (menu: Exclude<ComposerActionMenu, null>) => {
    setOpenComposerMenu((currentMenu) => (currentMenu === menu ? null : menu));
  };

  const handleSelectMode = (mode: TeacherAiAssistantMode) => {
    setSelectedMode(mode);
    setOpenComposerMenu(null);
  };

  const toggleKnowledgeUsage = (messageId: string) => {
    setExpandedKnowledgeMessageIds((currentIds) =>
      currentIds.includes(messageId)
        ? currentIds.filter((id) => id !== messageId)
        : [...currentIds, messageId],
    );
  };

  const handleResetSource = () => {
    setCurrentSource({ kind: 'manual', label: 'Ручной текст' });
  };

  const handleOpenMaterialSource = async () => {
    setOpenComposerMenu(null);
    setMaterialSourceError(null);
    setIsMaterialSourceModalOpen(true);
    setIsLoadingMaterials(true);

    try {
      const response = await getTeacherMaterials(accessToken, { kind: 'draft' });
      setAvailableMaterials(response.items);
    } catch (error) {
      setMaterialSourceError(
        error instanceof Error ? error.message : 'Не удалось загрузить материалы.',
      );
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleSelectMaterialSource = (material: TeacherLearningMaterial) => {
    setDraftMessage(material.original_text);
    setCurrentSource({
      kind: 'material',
      label: `Материал: ${material.title}`,
      materialId: material.id,
    });
    setIsMaterialSourceModalOpen(false);
    setMaterialSourceError(null);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
  };

  const handleCloseMaterialSourceModal = () => {
    if (isLoadingMaterials) {
      return;
    }

    setIsMaterialSourceModalOpen(false);
    setMaterialSourceError(null);
  };

  const handleOpenFileSource = () => {
    if (isParsingFileSource) {
      return;
    }

    setOpenComposerMenu(null);
    fileInputRef.current?.click();
  };

  const handleSelectFileSource = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    const validationError = validateAssistantInputFile(selectedFile);
    if (validationError) {
      setErrorMessage(validationError);
      setSaveSuccessMessage(null);
      return;
    }

    const requestId = activeFileParseRequestIdRef.current + 1;
    activeFileParseRequestIdRef.current = requestId;
    setIsParsingFileSource(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const response = await parseTeacherAiAssistantFile(accessToken, selectedFile);
      if (activeFileParseRequestIdRef.current !== requestId) {
        return;
      }

      setDraftMessage(response.extracted_text);
      setCurrentSource({
        kind: 'file',
        label: `Файл: ${response.filename}`,
        filename: response.filename,
      });
      setOpenComposerMenu(null);
    } catch (error) {
      if (activeFileParseRequestIdRef.current !== requestId) {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'Не удалось извлечь текст из выбранного файла.',
      );
    } finally {
      if (activeFileParseRequestIdRef.current === requestId) {
        setIsParsingFileSource(false);
      }
    }
  };

  const selectedModeLabel =
    ADAPTATION_MODES.find((modeOption) => modeOption.value === selectedMode)?.label ??
    'Упростить текст';

  return (
    <>
      <section
        data-testid="teacher-ai-assistant-section"
        className="flex h-[min(760px,calc(100vh-10rem))] min-h-[560px] flex-col overflow-hidden rounded-[30px] border border-orange-100/80 bg-white/92 shadow-[0_18px_50px_rgba(221,156,130,0.12)]"
      >
        <header className="border-b border-orange-100/80 px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">ИИ-ассистент</h2>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">
            Вставьте учебный текст и получите ответ в формате диалога.
          </p>
        </header>

        <div
          ref={chatViewportRef}
          data-testid="teacher-ai-assistant-chat"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
        >
          {messages.length === 0 ? (
            <div
              data-testid="teacher-ai-assistant-empty-state"
              className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-orange-200 bg-orange-50/40 px-6 text-center text-base text-stone-500 sm:text-lg"
            >
              {EMPTY_STATE_TEXT}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isUserMessage = message.role === 'user';
                const isSaveButtonDisabled = isSavingMaterial || isSubmitting;
                const hasKnowledgeUsage = Boolean(message.usedKnowledgeChunks?.length);
                const isKnowledgeExpanded = expandedKnowledgeMessageIds.includes(message.id);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${isUserMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      <article
                        data-testid={`teacher-ai-assistant-message-${message.role}`}
                        className={`w-full rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm sm:px-5 sm:py-4 sm:text-base ${
                          isUserMessage
                            ? 'bg-orange-300 text-white'
                            : 'border border-orange-100 bg-orange-50/70 text-stone-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </article>

                      {message.role === 'assistant' ? (
                        <>
                          {hasKnowledgeUsage ? (
                            <div
                              data-testid="teacher-ai-assistant-knowledge-usage"
                              className="mt-2 w-full rounded-[20px] border border-stone-200/90 bg-stone-50/90 px-3 py-2.5 text-stone-500 shadow-sm"
                            >
                              <button
                                type="button"
                                onClick={() => toggleKnowledgeUsage(message.id)}
                                data-testid="teacher-ai-assistant-knowledge-toggle"
                                aria-expanded={isKnowledgeExpanded}
                                className="flex w-full items-center justify-between gap-3 text-left text-xs font-medium sm:text-sm"
                              >
                                <span className="inline-flex min-w-0 items-center gap-2">
                                  <BookOpenText className="h-4 w-4 shrink-0 text-stone-400" />
                                  <span className="truncate">
                                    Ответ основан на материалах ({message.usedKnowledgeChunks?.length ?? 0})
                                  </span>
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 transition ${
                                    isKnowledgeExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {isKnowledgeExpanded ? (
                                <ul
                                  data-testid="teacher-ai-assistant-knowledge-list"
                                  className="mt-2 space-y-1.5 border-t border-stone-200/80 pt-2 text-xs text-stone-500 sm:text-sm"
                                >
                                  {message.usedKnowledgeChunks?.map((chunk, index) => (
                                    <li
                                      key={`${message.id}-knowledge-${chunk.document_title}-${chunk.chunk_index}-${index}`}
                                      data-testid="teacher-ai-assistant-knowledge-item"
                                      className="break-words"
                                    >
                                      • {chunk.document_title} — chunk {chunk.chunk_index}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleOpenSaveModal(message)}
                            disabled={isSaveButtonDisabled}
                            data-testid="teacher-ai-assistant-save-material-trigger"
                            className="mt-2 inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Сохранить как материал
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {isSubmitting ? (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-orange-100/80 bg-white/95 px-4 py-4 sm:px-6">
          {errorMessage ? (
            <p
              data-testid="teacher-ai-assistant-error"
              className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {errorMessage}
            </p>
          ) : null}

          {saveSuccessMessage ? (
            <p
              data-testid="teacher-ai-assistant-save-material-success"
              className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {saveSuccessMessage}
            </p>
          ) : null}

          {isParsingFileSource ? (
            <p
              data-testid="teacher-ai-assistant-file-processing"
              className="mb-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-stone-600"
            >
              Файл обрабатывается...
            </p>
          ) : null}

          <div className="rounded-[26px] border border-orange-100 bg-orange-50/45 p-3 shadow-inner">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
              <span
                data-testid="teacher-ai-assistant-source-badge"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm sm:text-sm"
              >
                <FileText className="h-4 w-4 text-stone-400" />
                {currentSource.label}
              </span>

              {currentSource.kind !== 'manual' ? (
                <button
                  type="button"
                  onClick={handleResetSource}
                  data-testid="teacher-ai-assistant-source-reset"
                  className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 shadow-sm transition hover:bg-orange-50 sm:text-sm"
                >
                  Переключить на ручной текст
                </button>
              ) : null}
            </div>

            <textarea
              ref={textareaRef}
              data-testid="teacher-ai-assistant-input"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Вставьте учебный текст для адаптации..."
              rows={1}
              className="max-h-[224px] min-h-[52px] w-full resize-none border-0 bg-transparent px-2 py-3 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400 sm:text-base"
            />

            <div className="mt-3 flex items-end justify-between gap-3">
              <div
                ref={composerActionsRef}
                className="flex min-w-0 flex-wrap items-center gap-2"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleComposerMenu('actions')}
                    data-testid="teacher-ai-assistant-actions-trigger"
                    aria-label="Открыть действия ассистента"
                    aria-expanded={openComposerMenu === 'actions'}
                    disabled={isParsingFileSource}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  {openComposerMenu === 'actions' ? (
                    <div
                      data-testid="teacher-ai-assistant-actions-menu"
                      className="absolute bottom-[calc(100%+0.65rem)] left-0 z-20 w-56 rounded-[24px] border border-orange-100/90 bg-white p-2 shadow-[0_16px_40px_rgba(221,156,130,0.16)]"
                    >
                      <button
                        type="button"
                        onClick={() => void handleOpenMaterialSource()}
                        data-testid="teacher-ai-assistant-action-material"
                        disabled={isParsingFileSource}
                        className="flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left text-sm text-stone-600 transition hover:bg-orange-50/70"
                      >
                        <span>Материал</span>
                        <span className="text-xs text-stone-400">Выбрать</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenFileSource}
                        data-testid="teacher-ai-assistant-action-file"
                        disabled={isParsingFileSource}
                        className="flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left text-sm text-stone-600 transition hover:bg-orange-50/70"
                      >
                        <span>Файл</span>
                        <span className="text-xs text-stone-400">
                          {isParsingFileSource ? 'Обработка...' : 'Выбрать'}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleComposerMenu('mode')}
                    data-testid="teacher-ai-assistant-mode-button"
                    aria-expanded={openComposerMenu === 'mode'}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-200"
                  >
                    <span className="truncate">{selectedModeLabel}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition ${openComposerMenu === 'mode' ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openComposerMenu === 'mode' ? (
                    <div
                      data-testid="teacher-ai-assistant-mode-menu"
                      className="absolute bottom-[calc(100%+0.65rem)] left-0 z-20 w-60 rounded-[24px] border border-orange-100/90 bg-white p-2 shadow-[0_16px_40px_rgba(221,156,130,0.16)]"
                    >
                      {ADAPTATION_MODES.map((mode) => {
                        const isSelected = mode.value === selectedMode;

                        return (
                          <button
                            key={mode.value}
                            type="button"
                            onClick={() => handleSelectMode(mode.value)}
                            data-testid={`teacher-ai-assistant-mode-option-${mode.value}`}
                            className={`flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left text-sm transition ${
                              isSelected
                                ? 'bg-orange-50 text-orange-700'
                                : 'text-stone-600 hover:bg-orange-50/70'
                            }`}
                          >
                            <span>{mode.label}</span>
                            {isSelected ? (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-orange-600">
                                Активно
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || isParsingFileSource || draftMessage.trim().length === 0}
                data-testid="teacher-ai-assistant-submit"
                aria-label="Отправить сообщение"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-300 text-white shadow-[0_10px_24px_rgba(251,146,60,0.28)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:text-white/75 disabled:shadow-none"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        onChange={(event) => void handleSelectFileSource(event)}
        className="hidden"
        data-testid="teacher-ai-assistant-file-input"
      />

      <SaveMaterialModal
        isOpen={isSaveModalOpen}
        title={materialTitle}
        onTitleChange={setMaterialTitle}
        onClose={handleCloseSaveModal}
        onSubmit={() => void handleSaveMaterial()}
        isSubmitting={isSavingMaterial}
        errorMessage={saveErrorMessage}
      />

      <MaterialSourceModal
        isOpen={isMaterialSourceModalOpen}
        materials={availableMaterials}
        isLoading={isLoadingMaterials}
        errorMessage={materialSourceError}
        onClose={handleCloseMaterialSourceModal}
        onSelect={handleSelectMaterialSource}
      />
    </>
  );
}
