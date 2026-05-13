import type {
  KnowledgeBaseMethodologyTag,
  TeacherAiAssistantGenre,
  TeacherAiAssistantMode,
  TeacherAiAssistantStrategyMode,
} from '@/lib/teacherAiAssistantApi';

export interface AdaptationModeOption {
  value: TeacherAiAssistantMode;
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

export const ADAPTATION_PRODUCT_MODE_OPTIONS: ReadonlyArray<AdaptationModeOption> = [
  { value: 'basic_simplify', label: 'Упростить текст', shortLabel: 'Упростить текст' },
  { value: 'structured_explanation', label: 'Сделать пошаговым', shortLabel: 'Сделать пошаговым' },
  { value: 'key_points_focus', label: 'Выделить главное', shortLabel: 'Выделить главное' },
];

export const ADAPTATION_STRATEGY_MODE_OPTIONS: ReadonlyArray<MethodologyTagOption> = [
  { value: 'mode_a', label: 'Mode A — сильное упрощение' },
  { value: 'mode_b', label: 'Mode B — бережная адаптация' },
];

export const ADAPTATION_GENRE_OPTIONS: ReadonlyArray<AdaptationGenreOption> = [
  { value: 'educational', label: 'Учебный' },
  { value: 'scientific_popular', label: 'Научно-популярный' },
  { value: 'fiction', label: 'Художественный' },
  { value: 'legal', label: 'Юридический' },
  { value: 'instruction', label: 'Инструкция' },
  { value: 'other', label: 'Другое' },
];

export const KNOWLEDGE_BASE_PRODUCT_MODE_TAG_OPTIONS: ReadonlyArray<MethodologyTagOption> =
  ADAPTATION_PRODUCT_MODE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

export const KNOWLEDGE_BASE_STRATEGY_MODE_TAG_OPTIONS: ReadonlyArray<MethodologyTagOption> =
  ADAPTATION_STRATEGY_MODE_OPTIONS;

export const KNOWLEDGE_BASE_GENRE_TAG_OPTIONS: ReadonlyArray<MethodologyTagOption> = ADAPTATION_GENRE_OPTIONS;

const STRATEGY_MODE_LABELS: Record<TeacherAiAssistantStrategyMode, string> = {
  mode_a: 'Mode A — сильное упрощение',
  mode_b: 'Mode B — бережная адаптация',
};

const PRODUCT_MODE_LABELS: Record<string, string> = {
  basic_simplify: 'Упростить текст',
  structured_explanation: 'Сделать пошаговым',
  key_points_focus: 'Выделить главное',
};

export function isStrategyMode(mode: string | null | undefined): mode is TeacherAiAssistantStrategyMode {
  return mode === 'mode_a' || mode === 'mode_b';
}

export function resolveStrategyMode(
  mode: TeacherAiAssistantMode,
  genre: TeacherAiAssistantGenre,
): TeacherAiAssistantStrategyMode {
  if (mode === 'mode_a' || mode === 'mode_b') {
    return mode;
  }

  if (genre === 'legal' || genre === 'fiction') {
    return 'mode_b';
  }

  if (mode === 'key_points_focus') {
    return 'mode_b';
  }

  return 'mode_a';
}

export function getStrategyModeLabel(mode: TeacherAiAssistantStrategyMode): string {
  return STRATEGY_MODE_LABELS[mode];
}

export function getAdaptationModeLabel(mode: string | null | undefined): string {
  if (!mode) {
    return 'Для всех методов';
  }

  return (
    ADAPTATION_PRODUCT_MODE_OPTIONS.find((option) => option.value === mode)?.label ??
    STRATEGY_MODE_LABELS[mode as TeacherAiAssistantStrategyMode] ??
    PRODUCT_MODE_LABELS[mode] ??
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

  if (tag in PRODUCT_MODE_LABELS) {
    return PRODUCT_MODE_LABELS[tag];
  }

  if (tag === 'mode_a' || tag === 'mode_b') {
    return STRATEGY_MODE_LABELS[tag];
  }

  return getAdaptationGenreLabel(tag);
}

export function shouldShowGenreAwareWarning(
  mode: TeacherAiAssistantMode,
  genre: TeacherAiAssistantGenre,
): boolean {
  return resolveStrategyMode(mode, genre) === 'mode_a' && (genre === 'fiction' || genre === 'legal');
}

export function getAdaptationStrategyExplanation(
  mode: TeacherAiAssistantMode,
  genre: TeacherAiAssistantGenre,
): string[] {
  const strategyMode = resolveStrategyMode(mode, genre);
  const modeItems =
    strategyMode === 'mode_b'
      ? [
          'Семантическое сохранение без агрессивного переписывания.',
          'Поддержка читаемости через структуру, сегментацию и выделение опор.',
          'Перефразирование и замена терминов сведены к минимуму.',
        ]
      : [
          'Допускается упрощение структуры и деление длинных предложений.',
          'Можно сделать подачу более пошаговой и читаемой.',
          'Краткие пояснения и перестройка структуры допустимы без потери учебного смысла.',
        ];

  const productItem = (() => {
    switch (mode) {
      case 'basic_simplify':
        return 'Главная цель: упростить формулировки и снизить языковую перегрузку.';
      case 'structured_explanation':
        return 'Главная цель: сделать объяснение последовательным и пошаговым.';
      case 'key_points_focus':
        return 'Главная цель: выделить главные идеи и не перегружать второстепенными деталями.';
      default:
        return strategyMode === 'mode_b'
          ? 'Главная цель: бережная адаптация без потери смысла.'
          : 'Главная цель: сделать текст заметно доступнее для чтения.';
    }
  })();

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

  return [productItem, ...modeItems, genreItem];
}
