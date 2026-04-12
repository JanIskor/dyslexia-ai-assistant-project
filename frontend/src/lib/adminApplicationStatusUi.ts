export const ADMIN_APPLICATION_STATUS_STYLES: Record<string, string> = {
  Новая: 'bg-yellow-100 text-yellow-700',
  'На рассмотрении': 'bg-stone-100 text-stone-600',
  'На доработке': 'bg-orange-100 text-orange-700',
  Подтверждена: 'bg-blue-100 text-blue-700',
  'Принята преподавателем': 'bg-green-100 text-green-700',
  'Отклонена преподавателем': 'bg-red-100 text-red-700',
};

export const getAdminApplicationStatusStyle = (status: string) =>
  ADMIN_APPLICATION_STATUS_STYLES[status] ?? ADMIN_APPLICATION_STATUS_STYLES['На рассмотрении'];
