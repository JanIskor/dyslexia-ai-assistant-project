'use client';

import { ArrowLeft, UserRound } from 'lucide-react';

interface PersonDetailField {
  label: string;
  value: string;
}

interface PersonDetailPanelProps {
  title: string;
  avatarUrl?: string | null;
  avatarAlt: string;
  subtitle?: string | null;
  fields: PersonDetailField[];
  onBack: () => void;
}

export function PersonDetailPanel({
  title,
  avatarUrl,
  avatarAlt,
  subtitle,
  fields,
  onBack,
}: PersonDetailPanelProps) {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_8px_24px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="mt-5 rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={avatarAlt} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/75">
                <UserRound className="h-12 w-12 text-orange-300" />
              </div>
            )}
          </div>

          <h2 className="mt-5 text-2xl font-medium text-stone-700 sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-stone-400 sm:text-base">{subtitle}</p> : null}
        </div>

        <dl className="mt-6 divide-y divide-orange-100/80">
          {fields.map((field) => (
            <div key={field.label} className="grid gap-1 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm font-medium text-stone-500 sm:text-base">{field.label}</dt>
              <dd className="text-sm text-stone-700 sm:text-base sm:text-right">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
