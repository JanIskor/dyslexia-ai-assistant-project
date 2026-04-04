import type { UserRole } from '@/lib/authApi';

export const getRoleRedirectPath = (role: UserRole): string => {
  if (role === 'teacher') {
    return '/teacher';
  }

  return '/student';
};
