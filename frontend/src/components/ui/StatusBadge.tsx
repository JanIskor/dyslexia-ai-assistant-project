'use client';

interface StatusBadgeProps {
  label: string;
  toneClassName: string;
  className?: string;
}

export function StatusBadge({ label, toneClassName, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium sm:text-base ${toneClassName} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
