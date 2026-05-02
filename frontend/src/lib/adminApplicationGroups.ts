import type { AdminApplication } from '@/lib/adminApplicationsApi';
import { getApplicationDisplayStatus } from '@/lib/adminApplicationTaskUi';

export type AdminApplicationGroup =
  | 'INITIAL'
  | 'PROFILE_UPDATES'
  | 'NEEDS_ASSIGNMENT'
  | 'ACCEPTED'
  | 'REJECTED';

const GROUP_LABELS: Record<AdminApplicationGroup, string> = {
  INITIAL: 'Первичные заявки',
  PROFILE_UPDATES: 'Изменения профиля',
  NEEDS_ASSIGNMENT: 'Требуют назначения',
  ACCEPTED: 'Принятые',
  REJECTED: 'Отклонённые',
};
const PROFILE_UPDATE_REQUEST_KINDS = new Set([
  'profile_update',
  'student_profile_update',
  'teacher_profile_update',
]);

export function getAdminApplicationGroup(application: AdminApplication): AdminApplicationGroup {
  const displayStatus = getApplicationDisplayStatus(application);

  if (displayStatus === 'Требует назначения') {
    return 'NEEDS_ASSIGNMENT';
  }

  if (displayStatus === 'Принята преподавателем') {
    return 'ACCEPTED';
  }

  if (displayStatus === 'Отклонена') {
    return 'REJECTED';
  }

  if (PROFILE_UPDATE_REQUEST_KINDS.has(application.request_kind)) {
    return 'PROFILE_UPDATES';
  }

  return 'INITIAL';
}

export function getAdminApplicationGroupLabel(group: AdminApplicationGroup): string {
  return GROUP_LABELS[group];
}

export function filterApplicationsByGroup(
  applications: AdminApplication[],
  group: AdminApplicationGroup,
): AdminApplication[] {
  return applications.filter((application) => getAdminApplicationGroup(application) === group);
}

export function searchApplicationsInGroup(
  applications: AdminApplication[],
  query: string,
): AdminApplication[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return applications;
  }

  return applications.filter((application) =>
    application.full_name.toLowerCase().includes(normalizedQuery)
  );
}

export function getVisibleApplicationGroups(
  applications: AdminApplication[],
): AdminApplicationGroup[] {
  void applications;
  return [
    'INITIAL',
    'PROFILE_UPDATES',
    'NEEDS_ASSIGNMENT',
    'ACCEPTED',
    'REJECTED',
  ];
}
