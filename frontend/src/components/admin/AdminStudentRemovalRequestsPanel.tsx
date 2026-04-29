'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, RefreshCcw } from 'lucide-react';
import {
  getAdminStudentRemovalRequests,
  updateAdminStudentRemovalRequest,
  type AdminStudentRemovalRequestItem,
} from '@/lib/adminStudentRemovalRequestsApi';
import { StatusBadge } from '@/components/ui/StatusBadge';

function formatDisplayDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

function getStatusStyle(status: AdminStudentRemovalRequestItem['status']): string {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function getStatusLabel(status: AdminStudentRemovalRequestItem['status']): string {
  switch (status) {
    case 'approved':
      return 'Подтверждена';
    case 'rejected':
      return 'Отклонена';
    default:
      return 'Ожидает решения';
  }
}

export function AdminStudentRemovalRequestsPanel({ token }: { token: string }) {
  const [items, setItems] = useState<AdminStudentRemovalRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'error' | 'success'>('success');
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminStudentRemovalRequests(token);
      setItems(response.items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не удалось загрузить заявки на открепление.',
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActingRequestId(requestId);
    setStatusMessage(null);

    try {
      await updateAdminStudentRemovalRequest(token, requestId, {
        action,
      });
      await loadItems();
      setStatusType('success');
      setStatusMessage(
        action === 'approve'
          ? 'Заявка на открепление подтверждена.'
          : 'Заявка на открепление отклонена.',
      );
    } catch (error) {
      setStatusType('error');
      setStatusMessage(
        error instanceof Error ? error.message : 'Не удалось обработать заявку на открепление.',
      );
    } finally {
      setActingRequestId(null);
    }
  };

  let content: ReactNode;

  if (isLoading) {
    content = (
      <div className="rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
        Загружаем заявки на открепление...
      </div>
    );
  } else if (errorMessage) {
    content = (
      <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-10 text-center text-base text-red-700 shadow-[0_18px_40px_rgba(244,63,94,0.08)] sm:text-lg">
        {errorMessage}
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
        Заявок на открепление пока нет.
      </div>
    );
  } else {
    content = (
      <div className="grid gap-5">
        {items.map((item) => {
          const isPending = item.status === 'pending';
          const isActing = actingRequestId === item.id;

          return (
            <article
              key={item.id}
              data-testid="admin-student-removal-request-card"
              className="rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-6 shadow-[0_18px_40px_rgba(221,156,130,0.10)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-medium text-stone-700 sm:text-2xl">
                      {item.student.full_name}
                    </h2>
                    <StatusBadge
                      label={getStatusLabel(item.status)}
                      toneClassName={getStatusStyle(item.status)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-stone-500 sm:text-base">
                    Преподаватель: {item.teacher.full_name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500 sm:text-base">
                    Класс: {item.student.grade_label ?? 'Не указан'}
                  </p>
                  <p className="mt-1 text-sm text-stone-500 sm:text-base">
                    Дата заявки: {formatDisplayDate(item.created_at)}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
                    Причина: {item.reason ?? 'Не указана'}
                  </p>
                  {item.admin_comment ? (
                    <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">
                      Комментарий администратора: {item.admin_comment}
                    </p>
                  ) : null}
                </div>

                {isPending ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleAction(item.id, 'approve')}
                      disabled={isActing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-base font-medium text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {isActing ? 'Обрабатываем...' : 'Подтвердить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction(item.id, 'reject')}
                      disabled={isActing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-base font-medium text-rose-600 shadow-[0_12px_26px_rgba(244,63,94,0.08)] transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {isActing ? 'Обрабатываем...' : 'Отклонить'}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Заявки на открепление</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-500 sm:text-base">
        Преподаватели отправляют сюда запросы на открепление учеников. До решения администратора связь преподавателя и ученика остаётся активной.
      </p>

      {statusMessage ? (
        <p
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
            statusType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-6">{content}</div>
    </section>
  );
}
