'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import {
  assignTeacherMaterial,
  createTeacherMaterial,
  getTeacherMaterialDetail,
  getTeacherMaterials,
  type TeacherLearningMaterial,
} from '@/lib/teacherMaterialsApi';
import { TeacherMaterialAssignmentModal } from '@/components/teacher/TeacherMaterialAssignmentModal';
import { getTeacherStudents, type TeacherStudentListItem } from '@/lib/teacherStudentsApi';

type TeacherMaterialsViewState =
  | {
      mode: 'list';
    }
  | {
      mode: 'create';
    }
  | {
      mode: 'detail';
      materialId: string;
    };

const MATERIAL_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatMaterialDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return MATERIAL_DATE_FORMATTER.format(parsedDate);
}

function buildMaterialPreview(text: string): string {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= 140) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 140).trimEnd()}...`;
}

function TeacherMaterialsState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-orange-100/80 bg-white/90 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
      {message}
    </div>
  );
}

function MaterialStatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-orange-600 sm:text-sm">
      {status}
    </span>
  );
}

function TeacherMaterialCard({
  material,
  onOpen,
}: {
  material: TeacherLearningMaterial;
  onOpen: (materialId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(material.id)}
      className="flex w-full flex-col rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-6 text-left shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-medium leading-snug text-stone-700 sm:text-2xl">
          {material.title}
        </h3>
        <MaterialStatusBadge status={material.status} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
        {buildMaterialPreview(material.original_text)}
      </p>

      <p className="mt-5 text-sm text-stone-400 sm:text-base">
        Создано: {formatMaterialDate(material.created_at)}
      </p>
    </button>
  );
}

function TeacherMaterialsList({
  materials,
  isLoading,
  error,
  onOpenMaterial,
  onOpenCreate,
}: {
  materials: TeacherLearningMaterial[];
  isLoading: boolean;
  error: string | null;
  onOpenMaterial: (materialId: string) => void;
  onOpenCreate: () => void;
}) {
  let content: React.ReactNode;

  if (isLoading) {
    content = <TeacherMaterialsState message="Загрузка материалов..." />;
  } else if (error) {
    content = <TeacherMaterialsState message={error} />;
  } else if (materials.length === 0) {
    content = (
      <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[28px] border border-dashed border-orange-200 bg-white/88 px-6 py-10 text-center shadow-[0_18px_40px_rgba(221,156,130,0.08)]">
        <h3 className="text-xl font-medium text-stone-700 sm:text-2xl">Материалов пока нет</h3>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-500 sm:text-lg">
          Создайте первый учебный материал, чтобы он появился в списке преподавателя.
        </p>
        <button
          type="button"
          onClick={onOpenCreate}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
        >
          <FilePlus2 className="h-4 w-4" />
          Создать материал
        </button>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {materials.map((material) => (
          <TeacherMaterialCard key={material.id} material={material} onOpen={onOpenMaterial} />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Материалы</h2>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
        >
          <FilePlus2 className="h-4 w-4" />
          Создать материал
        </button>
      </div>

      <div className="mt-6">{content}</div>
    </section>
  );
}

function TeacherMaterialCreateForm({
  title,
  originalText,
  onTitleChange,
  onOriginalTextChange,
  onBack,
  onSave,
  isSaving,
  statusMessage,
  statusType,
}: {
  title: string;
  originalText: string;
  onTitleChange: (value: string) => void;
  onOriginalTextChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
}) {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку
      </button>

      <div className="mx-auto mt-6 max-w-3xl">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Создать материал</h2>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="teacher-material-title"
              className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
            >
              Название
            </label>
            <input
              id="teacher-material-title"
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
              placeholder="Введите название материала"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-material-original-text"
              className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
            >
              Исходный текст
            </label>
            <textarea
              id="teacher-material-original-text"
              value={originalText}
              onChange={(event) => onOriginalTextChange(event.target.value)}
              rows={12}
              className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
              placeholder="Введите исходный текст учебного материала"
            />
          </div>
        </div>

        {statusMessage ? (
          <p
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
              statusType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50"
          >
            Назад к списку
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </section>
  );
}

function TeacherMaterialDetail({
  material,
  onBack,
  onOpenAssign,
  assignmentStatusMessage,
  assignmentStatusType,
}: {
  material: TeacherLearningMaterial;
  onBack: () => void;
  onOpenAssign: () => void;
  assignmentStatusMessage: string | null;
  assignmentStatusType: 'error' | 'success';
}) {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку
      </button>

      <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-medium leading-tight text-stone-700 sm:text-3xl">
              {material.title}
            </h2>
            <p className="mt-3 text-sm text-stone-400 sm:text-base">
              Создано: {formatMaterialDate(material.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAssign}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
          >
            Назначить ученику
          </button>
        </div>

        {assignmentStatusMessage ? (
          <p
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
              assignmentStatusType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {assignmentStatusMessage}
          </p>
        ) : null}

        <div className="mt-6 rounded-[24px] border border-orange-100/70 bg-white/75 px-4 py-5 sm:px-5 sm:py-6">
          <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Исходный текст</h3>
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-stone-600 sm:text-lg">
            {material.original_text}
          </p>
        </div>
      </div>
    </section>
  );
}

export function TeacherMaterialsSection({
  accessToken,
}: {
  accessToken: string;
}) {
  const [materials, setMaterials] = useState<TeacherLearningMaterial[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(true);
  const [viewState, setViewState] = useState<TeacherMaterialsViewState>({ mode: 'list' });
  const [selectedMaterial, setSelectedMaterial] = useState<TeacherLearningMaterial | null>(null);
  const [materialDetailError, setMaterialDetailError] = useState<string | null>(null);
  const [isMaterialDetailLoading, setIsMaterialDetailLoading] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createOriginalText, setCreateOriginalText] = useState('');
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [createStatusMessage, setCreateStatusMessage] = useState<string | null>(null);
  const [createStatusType, setCreateStatusType] = useState<'error' | 'success'>('success');
  const [teacherStudents, setTeacherStudents] = useState<TeacherStudentListItem[]>([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string | null>(null);
  const [isTeacherStudentsLoading, setIsTeacherStudentsLoading] = useState(false);
  const [teacherStudentsError, setTeacherStudentsError] = useState<string | null>(null);
  const [isAssigningMaterial, setIsAssigningMaterial] = useState(false);
  const [assignmentStatusMessage, setAssignmentStatusMessage] = useState<string | null>(null);
  const [assignmentStatusType, setAssignmentStatusType] = useState<'error' | 'success'>('success');

  useEffect(() => {
    let isMounted = true;

    const loadMaterials = async () => {
      setIsMaterialsLoading(true);
      setMaterialsError(null);

      try {
        const response = await getTeacherMaterials(accessToken);

        if (!isMounted) {
          return;
        }

        setMaterials(response.items);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMaterials([]);
        setMaterialsError(
          error instanceof Error ? error.message : 'Не удалось загрузить материалы',
        );
      } finally {
        if (isMounted) {
          setIsMaterialsLoading(false);
        }
      }
    };

    void loadMaterials();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (viewState.mode !== 'detail') {
      setSelectedMaterial(null);
      setMaterialDetailError(null);
      setIsMaterialDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadMaterialDetail = async () => {
      setIsMaterialDetailLoading(true);
      setMaterialDetailError(null);

      try {
        const response = await getTeacherMaterialDetail(accessToken, viewState.materialId);

        if (!isMounted) {
          return;
        }

        setSelectedMaterial(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedMaterial(null);
        setMaterialDetailError(
          error instanceof Error ? error.message : 'Не удалось загрузить материал',
        );
      } finally {
        if (isMounted) {
          setIsMaterialDetailLoading(false);
        }
      }
    };

    void loadMaterialDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, viewState]);

  const handleOpenCreate = () => {
    setViewState({ mode: 'create' });
    setCreateStatusMessage(null);
  };

  const handleBackToList = () => {
    setViewState({ mode: 'list' });
    setCreateStatusMessage(null);
    setMaterialDetailError(null);
    setAssignmentStatusMessage(null);
  };

  const handleOpenAssignModal = async () => {
    setIsAssignmentModalOpen(true);
    setSelectedStudentUserId(null);
    setTeacherStudentsError(null);

    if (teacherStudents.length > 0) {
      return;
    }

    setIsTeacherStudentsLoading(true);

    try {
      const response = await getTeacherStudents(accessToken, {
        page: 1,
        page_size: 100,
      });
      setTeacherStudents(response.items);
    } catch (error) {
      setTeacherStudents([]);
      setTeacherStudentsError(
        error instanceof Error ? error.message : 'Не удалось загрузить учеников',
      );
    } finally {
      setIsTeacherStudentsLoading(false);
    }
  };

  const handleCloseAssignmentModal = () => {
    if (isAssigningMaterial) {
      return;
    }

    setIsAssignmentModalOpen(false);
    setSelectedStudentUserId(null);
    setTeacherStudentsError(null);
  };

  const handleCreateMaterial = async () => {
    if (!createTitle.trim() || !createOriginalText.trim()) {
      setCreateStatusType('error');
      setCreateStatusMessage('Заполните название и исходный текст материала.');
      return;
    }

    setIsCreatingMaterial(true);
    setCreateStatusMessage(null);

    try {
      const createdMaterial = await createTeacherMaterial(accessToken, {
        title: createTitle,
        original_text: createOriginalText,
      });

      setMaterials((currentValue) => [createdMaterial, ...currentValue]);
      setSelectedMaterial(createdMaterial);
      setCreateTitle('');
      setCreateOriginalText('');
      setCreateStatusType('success');
      setCreateStatusMessage('Материал успешно создан.');
      setAssignmentStatusMessage(null);
      setViewState({
        mode: 'detail',
        materialId: createdMaterial.id,
      });
    } catch (error) {
      setCreateStatusType('error');
      setCreateStatusMessage(
        error instanceof Error ? error.message : 'Не удалось создать материал',
      );
    } finally {
      setIsCreatingMaterial(false);
    }
  };

  const handleAssignMaterial = async () => {
    if (!selectedMaterial || !selectedStudentUserId) {
      setTeacherStudentsError('Выберите ученика для назначения материала.');
      return;
    }

    setIsAssigningMaterial(true);
    setTeacherStudentsError(null);

    try {
      await assignTeacherMaterial(accessToken, selectedMaterial.id, {
        student_user_id: selectedStudentUserId,
      });
      const assignedStudent = teacherStudents.find((student) => student.id === selectedStudentUserId);
      setAssignmentStatusType('success');
      setAssignmentStatusMessage(
        assignedStudent
          ? `Материал назначен ученику ${assignedStudent.full_name}.`
          : 'Материал успешно назначен ученику.',
      );
      setIsAssignmentModalOpen(false);
      setSelectedStudentUserId(null);
    } catch (error) {
      setTeacherStudentsError(
        error instanceof Error ? error.message : 'Не удалось назначить материал',
      );
      setAssignmentStatusType('error');
      setAssignmentStatusMessage(null);
    } finally {
      setIsAssigningMaterial(false);
    }
  };

  if (viewState.mode === 'create') {
    return (
      <TeacherMaterialCreateForm
        title={createTitle}
        originalText={createOriginalText}
        onTitleChange={setCreateTitle}
        onOriginalTextChange={setCreateOriginalText}
        onBack={handleBackToList}
        onSave={() => void handleCreateMaterial()}
        isSaving={isCreatingMaterial}
        statusMessage={createStatusMessage}
        statusType={createStatusType}
      />
    );
  }

  if (viewState.mode === 'detail') {
    if (isMaterialDetailLoading && !selectedMaterial) {
      return <TeacherMaterialsState message="Загрузка материала..." />;
    }

    if (materialDetailError) {
      return <TeacherMaterialsState message={materialDetailError} />;
    }

    if (!selectedMaterial) {
      return <TeacherMaterialsState message="Не удалось загрузить материал" />;
    }

    return (
      <>
        <TeacherMaterialDetail
          material={selectedMaterial}
          onBack={handleBackToList}
          onOpenAssign={() => void handleOpenAssignModal()}
          assignmentStatusMessage={assignmentStatusMessage}
          assignmentStatusType={assignmentStatusType}
        />
        <TeacherMaterialAssignmentModal
          isOpen={isAssignmentModalOpen}
          students={teacherStudents}
          selectedStudentUserId={selectedStudentUserId}
          onSelectStudent={setSelectedStudentUserId}
          onClose={handleCloseAssignmentModal}
          onSubmit={() => void handleAssignMaterial()}
          isLoading={isTeacherStudentsLoading}
          isSubmitting={isAssigningMaterial}
          errorMessage={teacherStudentsError}
        />
      </>
    );
  }

  return (
    <TeacherMaterialsList
      materials={materials}
      isLoading={isMaterialsLoading}
      error={materialsError}
      onOpenMaterial={(materialId) => setViewState({ mode: 'detail', materialId })}
      onOpenCreate={handleOpenCreate}
    />
  );
}
