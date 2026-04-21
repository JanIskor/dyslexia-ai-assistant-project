'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, FilePlus2 } from 'lucide-react';
import {
  assignTeacherMaterial,
  createTeacherMaterial,
  getTeacherMaterialDetail,
  getTeacherMaterials,
  type TeacherAdaptationVersionSummary,
  type TeacherAdaptedMaterialDetail,
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
      compareMode?: boolean;
    };

type TeacherMaterialsTab = 'draft' | 'adapted';

const MATERIAL_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const ADAPTATION_MODE_LABELS: Record<string, string> = {
  basic_simplify: 'Упростить текст',
  structured_explanation: 'Сделать пошаговым',
  key_points_focus: 'Выделить главное',
};

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

function getAdaptationModeLabel(mode: string | null | undefined): string {
  if (!mode) {
    return 'Версия без режима';
  }

  return ADAPTATION_MODE_LABELS[mode] ?? mode;
}

function getMaterialsEmptyStateMessage(tab: TeacherMaterialsTab): string {
  if (tab === 'adapted') {
    return 'Адаптированных материалов пока нет. Сохраните результат из ИИ-ассистента, чтобы он появился в этом разделе.';
  }

  return 'Создайте первый учебный материал, чтобы он появился в списке преподавателя.';
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

function TeacherMaterialsTabs({
  activeTab,
  onChange,
}: {
  activeTab: TeacherMaterialsTab;
  onChange: (tab: TeacherMaterialsTab) => void;
}) {
  return (
    <div
      data-testid="teacher-materials-tabs"
      className="flex items-center gap-2 self-start rounded-full border border-orange-100 bg-white/90 p-1 shadow-[0_10px_24px_rgba(221,156,130,0.08)]"
    >
      {([
        ['draft', 'Черновики'],
        ['adapted', 'Адаптированные материалы'],
      ] as const).map(([tab, label]) => {
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            data-testid={`teacher-materials-tab-${tab}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              isActive
                ? 'bg-orange-100 text-orange-700'
                : 'text-stone-500 hover:bg-orange-50 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TeacherMaterialCard({
  material,
  showStatusBadge,
  onOpen,
}: {
  material: TeacherLearningMaterial;
  showStatusBadge: boolean;
  onOpen: (materialId: string) => void;
}) {
  const previewText =
    material.material_kind === 'adapted' ? material.adapted_text || material.original_text : material.original_text;

  return (
    <button
      type="button"
      onClick={() => onOpen(material.id)}
      data-testid={`teacher-material-card-${material.material_kind}`}
      className="flex w-full flex-col rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-6 text-left shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-medium leading-snug text-stone-700 sm:text-2xl">
          {material.title}
        </h3>
        {showStatusBadge ? <MaterialStatusBadge status={material.status} /> : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
        {buildMaterialPreview(previewText)}
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
  activeTab,
  onChangeTab,
  onOpenMaterial,
  onOpenCreate,
}: {
  materials: TeacherLearningMaterial[];
  isLoading: boolean;
  error: string | null;
  activeTab: TeacherMaterialsTab;
  onChangeTab: (tab: TeacherMaterialsTab) => void;
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
          {getMaterialsEmptyStateMessage(activeTab)}
        </p>
        {activeTab === 'draft' ? (
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
          >
            <FilePlus2 className="h-4 w-4" />
            Создать материал
          </button>
        ) : null}
      </div>
    );
  } else {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {materials.map((material) => (
          <TeacherMaterialCard
            key={material.id}
            material={material}
            showStatusBadge={activeTab === 'draft'}
            onOpen={onOpenMaterial}
          />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Материалы</h2>
          <div className="mt-3">
            <TeacherMaterialsTabs activeTab={activeTab} onChange={onChangeTab} />
          </div>
        </div>

        {activeTab === 'draft' ? (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
          >
            <FilePlus2 className="h-4 w-4" />
            Создать материал
          </button>
        ) : null}
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

function TeacherAdaptedMaterialDetail({
  material,
  selectedVersionId,
  onChangeVersion,
  onBack,
  onCompare,
  onOpenAssign,
  assignmentStatusMessage,
  assignmentStatusType,
}: {
  material: TeacherAdaptedMaterialDetail;
  selectedVersionId: string;
  onChangeVersion: (materialId: string) => void;
  onBack: () => void;
  onCompare: () => void;
  onOpenAssign: () => void;
  assignmentStatusMessage: string | null;
  assignmentStatusType: 'error' | 'success';
}) {
  const versionOptions =
    material.available_adaptation_versions.length > 0
      ? material.available_adaptation_versions
      : [
          {
            id: material.id,
            title: material.title,
            adaptation_mode: material.adaptation_mode ?? null,
            created_at: material.created_at,
            updated_at: material.updated_at,
            is_current: true,
          } satisfies TeacherAdaptationVersionSummary,
        ];

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

      <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-medium leading-tight text-stone-700 sm:text-3xl">
              {material.title}
            </h2>
            <p className="mt-2 text-sm text-stone-400 sm:text-base">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Адаптированная версия</h3>
              <p className="mt-1 text-sm text-stone-500 sm:text-base">
                Источник: {material.source_info?.source_material_title ?? material.source_info?.source_filename ?? 'Ручной текст'}
              </p>
            </div>

            <label className="flex min-w-[15rem] flex-col gap-1 text-sm text-stone-500">
              <span>Метод адаптации</span>
              <div className="relative">
                <select
                  value={selectedVersionId}
                  onChange={(event) => onChangeVersion(event.target.value)}
                  disabled={versionOptions.length <= 1}
                  data-testid="teacher-adapted-material-version-selector"
                  className="w-full appearance-none rounded-2xl border border-orange-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-stone-700 shadow-sm outline-none transition focus:border-orange-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {versionOptions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {getAdaptationModeLabel(version.adaptation_mode)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              </div>
            </label>
          </div>

          <div
            data-testid="teacher-adapted-material-detail-text"
            className="mt-4 rounded-[18px] border border-orange-100/80 bg-white/90 px-4 py-4 text-base leading-relaxed text-stone-600 sm:text-lg"
          >
            <p className="whitespace-pre-wrap">{material.adapted_text}</p>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onCompare}
              data-testid="teacher-adapted-material-open-compare"
              className="rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50"
            >
              Сравнить
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherAdaptedMaterialCompare({
  material,
  selectedVersionId,
  onChangeVersion,
  onBack,
}: {
  material: TeacherAdaptedMaterialDetail;
  selectedVersionId: string;
  onChangeVersion: (materialId: string) => void;
  onBack: () => void;
}) {
  const versionOptions =
    material.available_adaptation_versions.length > 0
      ? material.available_adaptation_versions
      : [
          {
            id: material.id,
            title: material.title,
            adaptation_mode: material.adaptation_mode ?? null,
            created_at: material.created_at,
            updated_at: material.updated_at,
            is_current: true,
          } satisfies TeacherAdaptationVersionSummary,
        ];

  return (
    <section
      data-testid="teacher-adapted-material-compare-view"
      className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10"
    >
      <button
        type="button"
        onClick={onBack}
        data-testid="teacher-adapted-material-compare-back"
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к материалу
      </button>

      <div className="mt-6">
        <h2 className="text-2xl font-medium leading-tight text-stone-700 sm:text-3xl">{material.title}</h2>
        <p className="mt-2 text-sm text-stone-400 sm:text-base">
          Создано: {formatMaterialDate(material.created_at)}
        </p>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-lg font-medium text-stone-700 sm:text-xl">Исходный материал</h4>
            <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-stone-500 sm:text-sm">
              Source
            </span>
          </div>
          <div
            data-testid="teacher-adapted-material-original-text"
            className="mt-4 max-h-[30rem] overflow-y-auto rounded-[18px] border border-orange-100/80 bg-white/90 px-4 py-4 text-base leading-relaxed text-stone-600 sm:text-lg"
          >
            <p className="whitespace-pre-wrap">{material.original_text}</p>
          </div>
        </section>

        <section className="rounded-[24px] border border-orange-100/80 bg-orange-50/35 px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-medium text-stone-700 sm:text-xl">Адаптированная версия</h4>
              <p className="mt-1 text-sm text-stone-500 sm:text-base">
                Источник: {material.source_info?.source_material_title ?? material.source_info?.source_filename ?? 'Ручной текст'}
              </p>
            </div>

            <label className="flex min-w-[15rem] flex-col gap-1 text-sm text-stone-500">
              <span>Версия адаптации</span>
              <div className="relative">
                <select
                  value={selectedVersionId}
                  onChange={(event) => onChangeVersion(event.target.value)}
                  disabled={versionOptions.length <= 1}
                  data-testid="teacher-adapted-material-version-selector"
                  className="w-full appearance-none rounded-2xl border border-orange-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-stone-700 shadow-sm outline-none transition focus:border-orange-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {versionOptions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {getAdaptationModeLabel(version.adaptation_mode)}{version.is_current ? '' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              </div>
            </label>
          </div>

          <div
            data-testid="teacher-adapted-material-adapted-text"
            className="mt-4 max-h-[30rem] overflow-y-auto rounded-[18px] border border-orange-100/80 bg-white/90 px-4 py-4 text-base leading-relaxed text-stone-600 sm:text-lg"
          >
            <p className="whitespace-pre-wrap">{material.adapted_text}</p>
          </div>
        </section>
      </div>
    </section>
  );
}

function TeacherMaterialDetail({
  material,
  onBack,
}: {
  material: TeacherLearningMaterial;
  onBack: () => void;
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
        <div>
          <h2 className="text-2xl font-medium leading-tight text-stone-700 sm:text-3xl">{material.title}</h2>
          <p className="mt-3 text-sm text-stone-400 sm:text-base">
            Создано: {formatMaterialDate(material.created_at)}
          </p>
        </div>

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
  const [activeTab, setActiveTab] = useState<TeacherMaterialsTab>('draft');
  const [materials, setMaterials] = useState<TeacherLearningMaterial[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(true);
  const [viewState, setViewState] = useState<TeacherMaterialsViewState>({ mode: 'list' });
  const [selectedMaterial, setSelectedMaterial] = useState<TeacherAdaptedMaterialDetail | null>(null);
  const [materialDetailError, setMaterialDetailError] = useState<string | null>(null);
  const [isMaterialDetailLoading, setIsMaterialDetailLoading] = useState(false);
  const [selectedAdaptationVersionId, setSelectedAdaptationVersionId] = useState<string | null>(null);
  const [compareOriginalText, setCompareOriginalText] = useState<string | null>(null);
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
        const response = await getTeacherMaterials(accessToken, { kind: activeTab });

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
  }, [accessToken, activeTab]);

  useEffect(() => {
    if (viewState.mode !== 'detail') {
      setSelectedMaterial(null);
      setMaterialDetailError(null);
      setIsMaterialDetailLoading(false);
      setSelectedAdaptationVersionId(null);
      setCompareOriginalText(null);
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
        setSelectedAdaptationVersionId(response.id);
        setCompareOriginalText(response.original_text);
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

  const handleChangeTab = (tab: TeacherMaterialsTab) => {
    setActiveTab(tab);
    setViewState({ mode: 'list' });
    setMaterialDetailError(null);
    setAssignmentStatusMessage(null);
    setSelectedMaterial(null);
    setSelectedAdaptationVersionId(null);
    setCompareOriginalText(null);
  };

  const handleOpenCompareMode = () => {
    if (viewState.mode !== 'detail') {
      return;
    }

    setViewState({
      mode: 'detail',
      materialId: viewState.materialId,
      compareMode: true,
    });
  };

  const handleBackToAdaptedDetail = () => {
    if (viewState.mode !== 'detail') {
      return;
    }

    setViewState({
      mode: 'detail',
      materialId: viewState.materialId,
      compareMode: false,
    });
  };

  const handleOpenCreate = () => {
    setActiveTab('draft');
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

      if (activeTab === 'draft') {
        setMaterials((currentValue) => [createdMaterial, ...currentValue]);
      }
      setSelectedMaterial({
        ...createdMaterial,
        source_info: null,
        available_adaptation_versions: [],
      });
      setActiveTab('draft');
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

    if (selectedMaterial.material_kind === 'adapted') {
      return (
        <>
          {viewState.compareMode ? (
            <TeacherAdaptedMaterialCompare
              material={{
                ...selectedMaterial,
                original_text: compareOriginalText ?? selectedMaterial.original_text,
              }}
              selectedVersionId={selectedAdaptationVersionId ?? selectedMaterial.id}
              onChangeVersion={(materialId) =>
                setViewState({ mode: 'detail', materialId, compareMode: true })
              }
              onBack={handleBackToAdaptedDetail}
            />
          ) : (
            <TeacherAdaptedMaterialDetail
              material={selectedMaterial}
              selectedVersionId={selectedAdaptationVersionId ?? selectedMaterial.id}
              onChangeVersion={(materialId) =>
                setViewState({ mode: 'detail', materialId, compareMode: false })
              }
              onBack={handleBackToList}
              onCompare={handleOpenCompareMode}
              onOpenAssign={() => void handleOpenAssignModal()}
              assignmentStatusMessage={assignmentStatusMessage}
              assignmentStatusType={assignmentStatusType}
            />
          )}
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
      <TeacherMaterialDetail material={selectedMaterial} onBack={handleBackToList} />
    );
  }

  return (
    <TeacherMaterialsList
      materials={materials}
      isLoading={isMaterialsLoading}
      error={materialsError}
      activeTab={activeTab}
      onChangeTab={handleChangeTab}
      onOpenMaterial={(materialId) => setViewState({ mode: 'detail', materialId })}
      onOpenCreate={handleOpenCreate}
    />
  );
}
