export interface AdminModerationStatusUi {
  label: string;
  toneClassName: string;
}

const ADMIN_MODERATION_STATUS_MAP: Record<string, AdminModerationStatusUi> = {
  Новая: {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  'На рассмотрении': {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  submitted: {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  in_review: {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  NEW: {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  'На доработке': {
    label: 'На доработке',
    toneClassName: 'bg-orange-100 text-orange-700',
  },
  Подтверждена: {
    label: 'Подтверждена',
    toneClassName: 'bg-blue-100 text-blue-700',
  },
  NEEDS_ASSIGNMENT: {
    label: 'Требует назначения',
    toneClassName: 'bg-sky-100 text-sky-700',
  },
  'Требует назначения': {
    label: 'Требует назначения',
    toneClassName: 'bg-sky-100 text-sky-700',
  },
  'Принята преподавателем': {
    label: 'Принята преподавателем',
    toneClassName: 'bg-green-100 text-green-700',
  },
  'Отклонена преподавателем': {
    label: 'На рассмотрении',
    toneClassName: 'bg-stone-100 text-stone-600',
  },
  Отклонена: {
    label: 'Отклонена',
    toneClassName: 'bg-red-100 text-red-700',
  },
  pending: {
    label: 'Ожидает решения',
    toneClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  approved: {
    label: 'Подтверждена',
    toneClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: {
    label: 'Отклонена',
    toneClassName: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

export function getAdminModerationStatusUi(status: string): AdminModerationStatusUi {
  return (
    ADMIN_MODERATION_STATUS_MAP[status] ?? {
      label: status,
      toneClassName: 'bg-stone-100 text-stone-600',
    }
  );
}
