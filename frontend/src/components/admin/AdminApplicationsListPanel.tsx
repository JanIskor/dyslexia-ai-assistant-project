'use client';

import { Filter, Search, Trash2 } from 'lucide-react';
import { DirectoryPagination } from '@/components/admin/DirectoryPagination';
import { ModerationEntityBadge } from '@/components/admin/ModerationEntityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AdminApplication, AdminApplicationStatusFilterOption } from '@/lib/adminApplicationsApi';
import { getAdminApplicationStatusStyle } from '@/lib/adminApplicationStatusUi';

interface AdminApplicationsListPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
  onClearStatuses: () => void;
  isFilterOpen: boolean;
  onToggleFilterOpen: () => void;
  statusOptions: AdminApplicationStatusFilterOption[];
  applications: AdminApplication[];
  onSelectApplication: (applicationId: string) => void;
  selectionMode: boolean;
  selectedApplicationIds: string[];
  canDeleteApplication: (application: AdminApplication) => boolean;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onToggleApplicationSelection: (applicationId: string) => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function AdminApplicationsListPanel({
  searchValue,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  onClearStatuses,
  isFilterOpen,
  onToggleFilterOpen,
  statusOptions,
  applications,
  onSelectApplication,
  selectionMode,
  selectedApplicationIds,
  canDeleteApplication,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleApplicationSelection,
  onDeleteSelected,
  onDeleteAll,
  page,
  totalPages,
  onPageChange,
  isLoading,
  errorMessage,
}: AdminApplicationsListPanelProps) {
  const deletableApplications = applications.filter(canDeleteApplication);

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-orange-100/80 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(221,156,130,0.08)]">
          <Search className="h-5 w-5 shrink-0 text-orange-300" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск по первому слову..."
            className="w-full min-w-0 bg-transparent text-base text-stone-700 outline-none placeholder:text-stone-300 sm:text-lg"
            aria-label="Поиск заявок учеников"
          />
        </label>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleFilterOpen}
            className={`inline-flex h-[52px] min-w-[52px] items-center justify-center gap-2 rounded-[20px] border border-orange-100/80 bg-white px-4 text-orange-300 shadow-[0_10px_30px_rgba(221,156,130,0.08)] transition hover:bg-orange-50 ${
              selectedStatuses.length > 0 ? 'text-orange-400' : ''
            }`}
            aria-label="Фильтр заявок"
            aria-expanded={isFilterOpen}
          >
            <Filter className="h-5 w-5" />
            {selectedStatuses.length > 0 ? (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-500">
                {selectedStatuses.length}
              </span>
            ) : null}
          </button>

          {isFilterOpen ? (
            <div className="absolute right-0 z-10 mt-3 w-60 rounded-[22px] border border-orange-100/80 bg-white/98 p-4 shadow-[0_18px_40px_rgba(221,156,130,0.14)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-600">Статусы заявок</p>
                {selectedStatuses.length > 0 ? (
                  <button
                    type="button"
                    onClick={onClearStatuses}
                    className="text-xs font-medium text-orange-400 transition hover:text-orange-500"
                  >
                    Сбросить
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {statusOptions.map((statusOption) => {
                  const isSelected = selectedStatuses.includes(statusOption.value);

                  return (
                    <label
                      key={statusOption.value}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm text-stone-600 transition hover:bg-orange-50/70"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleStatus(statusOption.value)}
                        className="h-4 w-4 rounded border-orange-200 text-orange-400 focus:ring-orange-200"
                      />
                      <span>{statusOption.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        </div>

        {selectionMode ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={selectedApplicationIds.length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.20)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Удалить выбранные
            </button>
            <button
              type="button"
              onClick={onDeleteAll}
              disabled={deletableApplications.length === 0}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Удалить все
            </button>
            <button
              type="button"
              onClick={onExitSelectionMode}
              className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-orange-50"
            >
              Отмена
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onEnterSelectionMode}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedStatuses.map((status) => (
          <StatusBadge
            key={status}
            label={status}
            toneClassName={getAdminApplicationStatusStyle(status)}
            className="px-3 py-1 text-xs"
          />
        ))}
      </div>

      <div className="mt-5 rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">Загружаем заявки...</div>
        ) : errorMessage ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-rose-500 sm:px-5 sm:text-lg">{errorMessage}</div>
        ) : applications.length === 0 ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">
            По вашему запросу заявки не найдены.
          </div>
        ) : (
          <ul className="space-y-3">
            {applications.map((application) => (
              <li
                key={application.id}
                className="rounded-[22px] border border-orange-50/90 bg-white/88 shadow-[0_8px_24px_rgba(221,156,130,0.05)]"
              >
                <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      checked={selectedApplicationIds.includes(application.id)}
                      disabled={!canDeleteApplication(application)}
                      onChange={() => onToggleApplicationSelection(application.id)}
                      className="h-5 w-5 rounded border-orange-200 text-orange-400 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Выбрать заявку ${application.full_name}`}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onSelectApplication(application.id)}
                    disabled={selectionMode}
                    className="flex w-full items-center gap-4 text-left transition hover:bg-orange-50/60 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base text-stone-700 sm:text-[1.05rem]">
                        {application.full_name}
                      </span>
                      <ModerationEntityBadge
                        requestKind={application.request_kind}
                        label={application.request_kind_label}
                        className="mt-2"
                      />
                      {selectionMode && !canDeleteApplication(application) ? (
                        <span className="mt-2 block text-xs text-stone-400">
                          Удаление будет доступно после отдельного шага по систематизации статусов.
                        </span>
                      ) : null}
                    </span>
                    <StatusBadge
                      label={application.status}
                      toneClassName={getAdminApplicationStatusStyle(application.status)}
                      className="ml-auto shrink-0 sm:min-w-[168px]"
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && !errorMessage && applications.length > 0 ? (
        <DirectoryPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}
