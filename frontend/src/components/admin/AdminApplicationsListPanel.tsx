'use client';

import { Filter, Search } from 'lucide-react';
import type { AdminApplication } from '@/lib/adminApplicationsApi';

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  Новая: 'bg-[#ffe4cc] text-[#db8b42]',
  'На рассмотрении': 'bg-[#ece8ef] text-[#6e6670]',
  Отклонена: 'bg-[#f9ddd8] text-[#d46d63]',
};

interface AdminApplicationsListPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  applications: AdminApplication[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function AdminApplicationsListPanel({
  searchValue,
  onSearchChange,
  applications,
  isLoading,
  errorMessage,
}: AdminApplicationsListPanelProps) {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      <div className="flex items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-orange-100/80 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(221,156,130,0.08)]">
          <Search className="h-5 w-5 shrink-0 text-orange-300" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск заявок..."
            className="w-full min-w-0 bg-transparent text-base text-stone-700 outline-none placeholder:text-stone-300 sm:text-lg"
            aria-label="Поиск заявок учеников"
          />
        </label>

        <button
          type="button"
          className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[20px] border border-orange-100/80 bg-white text-orange-300 shadow-[0_10px_30px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
          aria-label="Фильтр заявок"
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))]">
        {isLoading ? (
          <div className="px-5 py-8 text-base text-stone-400 sm:px-7 sm:text-lg">Загружаем заявки...</div>
        ) : errorMessage ? (
          <div className="px-5 py-8 text-base text-rose-500 sm:px-7 sm:text-lg">{errorMessage}</div>
        ) : applications.length === 0 ? (
          <div className="px-5 py-8 text-base text-stone-400 sm:px-7 sm:text-lg">
            По вашему запросу заявки не найдены.
          </div>
        ) : (
          <ul>
            {applications.map((application, index) => (
              <li
                key={application.id}
                className={`flex items-center gap-4 px-5 py-5 sm:px-7 ${
                  index === 0 ? '' : 'border-t border-orange-50/80'
                }`}
              >
                <span className="min-w-0 flex-1 text-base text-stone-700 sm:text-[1.05rem]">{application.full_name}</span>
                <span
                  className={`ml-auto inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-medium sm:min-w-[168px] sm:text-base ${
                    APPLICATION_STATUS_STYLES[application.status] ?? APPLICATION_STATUS_STYLES['На рассмотрении']
                  }`}
                >
                  {application.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
