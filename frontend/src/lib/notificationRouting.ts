import type { NotificationItem } from '@/lib/notificationsApi';

export function getNotificationHref(notification: NotificationItem): string | null {
  switch (notification.target_view) {
    case 'teacher_incoming_students': {
      const searchParams = new URLSearchParams({ tab: 'incoming-students' });

      if (notification.target_id) {
        searchParams.set('studentId', notification.target_id);
      }

      return `/teacher?${searchParams.toString()}`;
    }
    case 'admin_applications': {
      const searchParams = new URLSearchParams({ tab: 'applications' });

      if (notification.target_id) {
        searchParams.set('applicationId', notification.target_id);
      }

      return `/admin?${searchParams.toString()}`;
    }
    case 'student_profile_edit':
      return '/student?tab=profile-edit';
    case 'student_profile':
      return '/student?tab=profile';
    case 'teacher_profile_edit':
      return '/teacher?tab=profile-edit';
    case 'teacher_profile':
      return '/teacher?tab=profile';
    case 'student_messages': {
      const searchParams = new URLSearchParams({ tab: 'messages' });

      if (notification.target_id) {
        searchParams.set('messageId', notification.target_id);
      }

      return `/student?${searchParams.toString()}`;
    }
    default:
      return null;
  }
}
