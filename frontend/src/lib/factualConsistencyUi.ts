export type FactualIssueType =
  | 'missing_fact'
  | 'changed_number'
  | 'changed_unit'
  | 'formula_changed'
  | 'added_fact'
  | 'terminology_changed'
  | 'possible_semantic_drift';

export type FactualIssueSeverity = 'info' | 'warning' | 'critical';
export type FactualSummaryStatus = 'ok' | 'warning' | 'critical';

export interface FactualConsistencyIssue {
  type: FactualIssueType;
  severity: FactualIssueSeverity;
  source_value?: string | null;
  adapted_value?: string | null;
  message: string;
}

export interface FactualConsistencyReport {
  summary_status: FactualSummaryStatus;
  summary_message: string;
  strict_mode: boolean;
  issues: FactualConsistencyIssue[];
}

export function getFactualConsistencyStatusTone(summaryStatus: FactualSummaryStatus | undefined): string {
  switch (summaryStatus) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'ok':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-stone-200 bg-stone-50 text-stone-600';
  }
}

export function getCompactFactualConsistencyStatus(summaryStatus: FactualSummaryStatus | undefined): string {
  switch (summaryStatus) {
    case 'critical':
      return 'Обнаружен высокий риск смыслового искажения.';
    case 'warning':
      return 'Требуется проверка преподавателем.';
    case 'ok':
      return 'Критических расхождений не найдено.';
    default:
      return 'Проверка фактов не выполнялась для этой версии.';
  }
}

export function getMissingFactualReportMessage(): string {
  return 'Проверка фактов не выполнялась для этой версии.';
}
