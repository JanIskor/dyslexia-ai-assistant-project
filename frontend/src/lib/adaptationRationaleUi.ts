export type AdaptationIntensity = 'low' | 'medium' | 'high';

export interface AdaptationRationale {
  mode?: string | null;
  genre?: string | null;
  adaptation_strategy: string;
  applied_transformations: string[];
  semantic_preservation_notes: string[];
  methodology_references: string[];
  adaptation_intensity: AdaptationIntensity;
  warnings: string[];
  output_contract_title?: string | null;
  output_contract_status?: 'ok' | 'needs_review' | null;
  output_contract_summary?: string | null;
  is_fallback: boolean;
}

export function getAdaptationIntensityLabel(intensity: AdaptationIntensity): string {
  switch (intensity) {
    case 'low':
      return 'Низкая';
    case 'medium':
      return 'Средняя';
    case 'high':
      return 'Высокая';
    default:
      return intensity;
  }
}

export function getMethodologyReferenceLabel(reference: string): string {
  switch (reference) {
    case 'lexical adaptation':
      return 'Лексическая адаптация';
    case 'syntax adaptation':
      return 'Синтаксическая адаптация';
    case 'visual segmentation':
      return 'Визуальная сегментация';
    case 'genre restrictions':
      return 'Жанровые ограничения';
    default:
      return reference;
  }
}

export function getTeacherVisibleSemanticNotes(notes: string[]): string[] {
  const filtered = notes.filter(
    (item) =>
      !/критическ|риски и ограничения|high risk|protected span|repair-pass/i.test(item),
  );

  return filtered.length > 0 ? filtered : ['Выполнена автоматическая проверка структуры и согласованности текста.'];
}
