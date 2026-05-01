'use client';

import type { AdminApplicationRequestKind } from '@/lib/adminApplicationsApi';

const REQUEST_KIND_STYLES: Record<AdminApplicationRequestKind, string> = {
  initial_profile: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  profile_update: 'border-blue-200 bg-blue-50 text-blue-700',
  teacher_profile_update: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  system_assignment_event: 'border-sky-200 bg-sky-50 text-sky-700',
};

interface ModerationEntityBadgeProps {
  requestKind: AdminApplicationRequestKind;
  label: string;
  className?: string;
}

export function ModerationEntityBadge({
  requestKind,
  label,
  className = '',
}: ModerationEntityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${REQUEST_KIND_STYLES[requestKind]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
