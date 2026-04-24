import type { TeacherAiAssistantMode } from '@/lib/teacherAiAssistantApi';

export interface AdaptationModeOption {
  value: TeacherAiAssistantMode;
  label: string;
}

export const ADAPTATION_MODE_OPTIONS: ReadonlyArray<AdaptationModeOption> = [
  { value: 'basic_simplify', label: 'Упростить текст' },
  { value: 'structured_explanation', label: 'Сделать пошаговым' },
  { value: 'key_points_focus', label: 'Выделить главное' },
];

export function getAdaptationModeLabel(mode: string | null | undefined): string {
  if (!mode) {
    return 'Для всех режимов';
  }

  return ADAPTATION_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}
