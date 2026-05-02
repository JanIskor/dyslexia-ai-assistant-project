import type { AdminApplication, AdminApplicationDetail } from '@/lib/adminApplicationsApi';

export type ApplicationResponsibleLabel =
  | 'Ожидает администратора'
  | 'Ожидает ученика'
  | 'Ожидает преподавателя'
  | 'Завершено';

export type ApplicationAvailableAction =
  | 'approve'
  | 'request_changes'
  | 'assign_teacher'
  | 'reject_profile_update';
export interface ApplicationDeleteAvailability {
  canDelete: boolean;
  reason: string | null;
}

type TaskAwareApplication = Pick<
  AdminApplicationDetail,
  | 'status'
  | 'request_kind'
  | 'current_teacher_user_id'
  | 'teacher_review_status'
  | 'can_assign_teacher'
> &
  Partial<Pick<AdminApplicationDetail, 'id'>>;

const REVIEW_STATUSES = new Set(['Новая', 'На рассмотрении', 'submitted', 'in_review', 'NEW']);
const REVISION_STATUSES = new Set(['На доработке', 'needs_completion', 'revision_requested']);
const COMPLETED_ACCEPTED_STATUSES = new Set(['Принята преподавателем', 'teacher_accepted']);
const COMPLETED_REJECTED_STATUSES = new Set(['Отклонена', 'rejected']);
const NEEDS_ASSIGNMENT_STATUSES = new Set(['Требует назначения', 'NEEDS_ASSIGNMENT', 'needs_assignment']);
const REJECTED_BY_TEACHER_STATUSES = new Set(['Отклонена преподавателем', 'teacher_rejected']);
const WAITING_TEACHER_REVIEW_STATUSES = new Set(['pending', 'Ожидает решения преподавателя']);
const APPROVED_STATUSES = new Set(['Подтверждена', 'approved']);

function isTeacherProfileRequest(application: TaskAwareApplication): boolean {
  return application.request_kind === 'teacher_profile_update';
}

function isProfileUpdateRequest(application: TaskAwareApplication): boolean {
  return (
    application.request_kind === 'profile_update' ||
    application.request_kind === 'student_profile_update' ||
    application.request_kind === 'teacher_profile_update'
  );
}

function isWaitingTeacherReview(application: TaskAwareApplication): boolean {
  return (
    application.current_teacher_user_id !== null &&
    application.current_teacher_user_id !== undefined &&
    application.teacher_review_status !== null &&
    application.teacher_review_status !== undefined &&
    WAITING_TEACHER_REVIEW_STATUSES.has(application.teacher_review_status)
  );
}

function isNeedsAssignment(application: TaskAwareApplication): boolean {
  if (application.can_assign_teacher === false) {
    return false;
  }

  if (NEEDS_ASSIGNMENT_STATUSES.has(application.status)) {
    return true;
  }

  if (
    REJECTED_BY_TEACHER_STATUSES.has(application.status) &&
    !application.current_teacher_user_id
  ) {
    return true;
  }

  if (
    APPROVED_STATUSES.has(application.status) &&
    !application.current_teacher_user_id &&
    !application.teacher_review_status
  ) {
    return true;
  }

  if (application.request_kind === 'system_assignment_event') {
    return true;
  }

  return false;
}

export function getApplicationDisplayStatus(
  application: TaskAwareApplication,
): 'На рассмотрении' | 'На доработке' | 'Требует назначения' | 'Принята преподавателем' | 'Подтверждена' | 'Отклонена' {
  if (isNeedsAssignment(application)) {
    return 'Требует назначения';
  }

  if (isWaitingTeacherReview(application)) {
    return 'На рассмотрении';
  }

  if (COMPLETED_ACCEPTED_STATUSES.has(application.status)) {
    return 'Принята преподавателем';
  }

  if (COMPLETED_REJECTED_STATUSES.has(application.status)) {
    return 'Отклонена';
  }

  if (REVISION_STATUSES.has(application.status)) {
    return 'На доработке';
  }

  if (REVIEW_STATUSES.has(application.status) || REJECTED_BY_TEACHER_STATUSES.has(application.status)) {
    return 'На рассмотрении';
  }

  if (APPROVED_STATUSES.has(application.status)) {
    return 'Подтверждена';
  }

  return 'На рассмотрении';
}

export function getApplicationResponsibleLabel(
  application: TaskAwareApplication,
): ApplicationResponsibleLabel {
  const displayStatus = getApplicationDisplayStatus(application);

  if (displayStatus === 'Требует назначения') {
    return 'Ожидает администратора';
  }

  if (displayStatus === 'На доработке') {
    return isTeacherProfileRequest(application) ? 'Ожидает преподавателя' : 'Ожидает ученика';
  }

  if (isWaitingTeacherReview(application)) {
    return 'Ожидает преподавателя';
  }

  if (displayStatus === 'На рассмотрении') {
    return 'Ожидает администратора';
  }

  return 'Завершено';
}

export function getApplicationAvailableActions(
  application: TaskAwareApplication,
): ApplicationAvailableAction[] {
  const displayStatus = getApplicationDisplayStatus(application);
  const responsibleLabel = getApplicationResponsibleLabel(application);

  if (responsibleLabel !== 'Ожидает администратора') {
    return [];
  }

  if (displayStatus === 'Требует назначения' && application.can_assign_teacher !== false) {
    return ['assign_teacher'];
  }

  if (displayStatus === 'На рассмотрении' && application.request_kind !== 'system_assignment_event') {
    if (isProfileUpdateRequest(application)) {
      return ['approve', 'request_changes', 'reject_profile_update'];
    }

    return ['approve', 'request_changes'];
  }

  return [];
}

export function isApplicationActionableByAdmin(application: TaskAwareApplication): boolean {
  return getApplicationAvailableActions(application).length > 0;
}

export function getApplicationDeleteAvailability(
  application: TaskAwareApplication,
): ApplicationDeleteAvailability {
  const displayStatus = getApplicationDisplayStatus(application);
  const responsibleLabel = getApplicationResponsibleLabel(application);

  if (responsibleLabel === 'Завершено') {
    return { canDelete: true, reason: null };
  }

  if (displayStatus === 'Требует назначения') {
    return {
      canDelete: false,
      reason: 'Для ученика ещё нужно назначить преподавателя.',
    };
  }

  if (responsibleLabel === 'Ожидает преподавателя') {
    return {
      canDelete: false,
      reason: 'Заявка ещё ожидает решения преподавателя.',
    };
  }

  if (responsibleLabel === 'Ожидает ученика') {
    return {
      canDelete: false,
      reason: 'Заявка находится на доработке и ещё не завершена.',
    };
  }

  return {
    canDelete: false,
    reason: 'Заявка ещё ожидает решения администратора.',
  };
}

export function getTaskUiApplicationId(application: AdminApplication | AdminApplicationDetail): string {
  return application.id;
}
