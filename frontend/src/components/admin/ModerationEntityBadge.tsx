'use client';

import type { AdminApplicationRequestKind } from '@/lib/adminApplicationsApi';

const REQUEST_KIND_STYLES: Partial<Record<AdminApplicationRequestKind, string>> = {
  initial_profile: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  profile_update: 'border-blue-200 bg-blue-50 text-blue-700',
  student_profile_update: 'border-blue-200 bg-blue-50 text-blue-700',
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
  const toneClassName = requestKind.startsWith('system')
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : (REQUEST_KIND_STYLES[requestKind] ?? 'border-stone-200 bg-stone-50 text-stone-600');

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${toneClassName} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
