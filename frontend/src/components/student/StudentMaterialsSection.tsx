'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  getStudentMaterialDetail,
  getStudentMaterials,
  type StudentLearningMaterialDetail,
  type StudentLearningMaterialListItem,
} from '@/lib/studentMaterialsApi';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';

type StudentMaterialsViewState =
  | {
      mode: 'list';
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

function StudentMaterialsState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-orange-100/80 bg-white/90 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
      {message}
    </div>
  );
}

function StudentMaterialCard({
  material,
  onOpen,
}: {
  material: StudentLearningMaterialListItem;
  onOpen: (materialId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(material.id)}
      className="w-full rounded-[24px] border border-orange-100/80 bg-white/92 px-5 py-5 text-left shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)]"
    >
      {material.is_adapted ? (
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium tracking-[0.02em] text-emerald-700 sm:text-sm">
          Адаптированный материал
        </span>
      ) : null}
      <h3 className="text-lg font-medium text-stone-700 sm:text-xl">{material.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-500 sm:text-base">
        {material.preview_text}
      </p>
      <p className="mt-4 text-sm text-stone-400 sm:text-base">{formatMaterialDate(material.created_at)}</p>
    </button>
  );
}

function StudentMaterialDetailCard({
  material,
  onBack,
}: {
  material: StudentLearningMaterialDetail;
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
        Назад к материалам
      </button>

      <div className="mx-auto mt-6 w-full max-w-3xl rounded-[28px] border border-orange-100/70 bg-white/80 px-5 py-6 sm:px-6 sm:py-7">
        <p className="text-sm text-stone-400 sm:text-base">{formatMaterialDate(material.created_at)}</p>
        {material.is_adapted ? (
          <span className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium tracking-[0.02em] text-emerald-700 sm:text-sm">
            Адаптированный материал
          </span>
        ) : null}
        <h2 className="mt-3 text-2xl font-medium text-stone-700 sm:text-3xl">{material.title}</h2>
        <div className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg">
          {material.is_adapted ? (
            <SafeMarkdown content={material.original_text} />
          ) : (
            <div className="whitespace-pre-wrap">{material.original_text}</div>
          )}
        </div>
      </div>
    </section>
  );
}

export function StudentMaterialsSection({
  accessToken,
}: {
  accessToken: string;
}) {
  const [materials, setMaterials] = useState<StudentLearningMaterialListItem[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(true);
  const [viewState, setViewState] = useState<StudentMaterialsViewState>({ mode: 'list' });
  const [selectedMaterial, setSelectedMaterial] = useState<StudentLearningMaterialDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMaterials = async () => {
      setIsMaterialsLoading(true);
      setMaterialsError(null);

      try {
        const response = await getStudentMaterials(accessToken);
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
          error instanceof Error ? error.message : 'Не удалось загрузить учебные материалы.',
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
      setDetailError(null);
      setIsDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadMaterialDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getStudentMaterialDetail(accessToken, viewState.materialId);
        if (!isMounted) {
          return;
        }

        setSelectedMaterial(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedMaterial(null);
        setDetailError(error instanceof Error ? error.message : 'Не удалось загрузить материал.');
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    };

    void loadMaterialDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, viewState]);

  if (viewState.mode === 'detail') {
    if (isDetailLoading) {
      return <StudentMaterialsState message="Загрузка материала..." />;
    }

    if (detailError) {
      return <StudentMaterialsState message={detailError} />;
    }

    if (!selectedMaterial) {
      return <StudentMaterialsState message="Не удалось загрузить материал." />;
    }

    return <StudentMaterialDetailCard material={selectedMaterial} onBack={() => setViewState({ mode: 'list' })} />;
  }

  let content;

  if (isMaterialsLoading) {
    content = <StudentMaterialsState message="Загрузка учебных материалов..." />;
  } else if (materialsError) {
    content = <StudentMaterialsState message={materialsError} />;
  } else if (materials.length === 0) {
    content = <StudentMaterialsState message="Учебные материалы пока не назначены" />;
  } else {
    content = (
      <div className="space-y-4">
        {materials.map((material) => (
          <StudentMaterialCard
            key={material.id}
            material={material}
            onOpen={(materialId) => setViewState({ mode: 'detail', materialId })}
          />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Мои учебные материалы</h2>
      <div className="mt-6">{content}</div>
    </section>
  );
}
