'use client';

import { UserRound } from 'lucide-react';

interface PersonCardMeta {
  label: string;
  value: string;
}

interface PersonCardProps {
  title: string;
  avatarUrl?: string | null;
  avatarAlt: string;
  meta: PersonCardMeta[];
  onClick: () => void;
}

export function PersonCard({ title, avatarUrl, avatarAlt, meta, onClick }: PersonCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border border-orange-50/90 bg-white/90 px-5 py-5 text-left shadow-[0_12px_30px_rgba(221,156,130,0.08)] transition hover:-translate-y-0.5 hover:bg-orange-50/60"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={avatarAlt} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80">
              <UserRound className="h-7 w-7 text-orange-300" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-stone-700 sm:text-lg">{title}</h3>
          <dl className="mt-3 space-y-2">
            {meta.map((item) => (
              <div key={item.label} className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
                <dt className="text-sm text-stone-400">{item.label}</dt>
                <dd className="text-sm text-stone-600 sm:text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </button>
  );
}
