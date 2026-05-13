import type {
  KnowledgeBaseMethodologyTag,
  TeacherAiAssistantGenre,
  TeacherAiAssistantMode,
  TeacherAiAssistantStrategyMode,
} from '@/lib/teacherAiAssistantApi';

export interface AdaptationModeOption {
  value: TeacherAiAssistantStrategyMode;
  label: string;
  shortLabel: string;
}

export interface AdaptationGenreOption {
  value: TeacherAiAssistantGenre;
  label: string;
}

export interface MethodologyTagOption {
  value: KnowledgeBaseMethodologyTag;
  label: string;
}

export const ADAPTATION_MODE_OPTIONS: ReadonlyArray<AdaptationModeOption> = [
  { value: 'mode_a', label: 'Mode A — сильное упрощение', shortLabel: 'Mode A' },
  { value: 'mode_b', label: 'Mode B — бережная адаптация', shortLabel: 'Mode B' },
];

export const ADAPTATION_GENRE_OPTIONS: ReadonlyArray<AdaptationGenreOption> = [
  { value: 'educational', label: 'Учебный' },
  { value: 'scientific_popular', label: 'Научно-популярный' },
  { value: 'fiction', label: 'Художественный' },
  { value: 'legal', label: 'Юридический' },
  { value: 'instruction', label: 'Инструкция' },
  { value: 'other', label: 'Другое' },
];

export const KNOWLEDGE_BASE_MODE_TAG_OPTIONS: ReadonlyArray<MethodologyTagOption> = [
  { value: 'mode_a', label: 'Mode A — сильное упрощение' },
  { value: 'mode_b', label: 'Mode B — бережная адаптация' },
];

export const KNOWLEDGE_BASE_GENRE_TAG_OPTIONS: ReadonlyArray<MethodologyTagOption> = ADAPTATION_GENRE_OPTIONS;

const LEGACY_MODE_LABELS: Record<string, string> = {
  basic_simplify: 'Упростить текст',
  structured_explanation: 'Сделать пошаговым',
  key_points_focus: 'Выделить главное',
};

export function getAdaptationModeLabel(mode: string | null | undefined): string {
  if (!mode) {
    return 'Для всех режимов';
  }

  return (
    ADAPTATION_MODE_OPTIONS.find((option) => option.value === mode)?.label ??
    LEGACY_MODE_LABELS[mode] ??
    mode
  );
}

export function getAdaptationGenreLabel(genre: string | null | undefined): string {
  if (!genre) {
    return 'Не указан';
  }

  return ADAPTATION_GENRE_OPTIONS.find((option) => option.value === genre)?.label ?? genre;
}

export function getKnowledgeBaseMethodologyTagLabel(tag: string | null | undefined): string {
  if (!tag) {
    return 'Общее правило';
  }

  return getAdaptationModeLabel(tag) === tag ? getAdaptationGenreLabel(tag) : getAdaptationModeLabel(tag);
}

export function shouldShowGenreAwareWarning(
  mode: TeacherAiAssistantMode,
  genre: TeacherAiAssistantGenre,
): boolean {
  return mode === 'mode_a' && (genre === 'fiction' || genre === 'legal');
}

export function getAdaptationStrategyExplanation(
  mode: TeacherAiAssistantMode,
  genre: TeacherAiAssistantGenre,
): string[] {
  const modeItems =
    mode === 'mode_b'
      ? [
          'Семантическое сохранение без агрессивного переписывания.',
          'Деление перегруженных фрагментов и визуальная сегментация.',
          'Поддержка читаемости важнее, чем свободное перефразирование.',
        ]
      : [
          'Деление длинных предложений на короткие смысловые шаги.',
          'Синтаксическое упрощение и перестройка структуры, если это помогает чтению.',
          'Краткое пояснение терминов и выделение ключевых опор.',
        ];

  const genreItem = (() => {
    switch (genre) {
      case 'educational':
        return 'Сохраняется учебная логика и последовательность объяснения.';
      case 'scientific_popular':
        return 'Сохраняется научная корректность при доступной подаче.';
      case 'fiction':
        return 'Учитывается риск потери авторского стиля и интонации.';
      case 'legal':
        return 'Особый контроль точности формулировок и нормативного смысла.';
      case 'instruction':
        return 'Сохраняются порядок действий, условия и предупреждения.';
      default:
        return 'Стратегия подстраивается под функцию текста без смены его назначения.';
    }
  })();

  return [...modeItems, genreItem];
}
