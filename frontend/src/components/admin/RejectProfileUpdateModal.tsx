'use client';

import { LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface RejectProfileUpdateModalProps {
  isOpen: boolean;
  value: string;
  isSubmitting?: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RejectProfileUpdateModal({
  isOpen,
  value,
  isSubmitting = false,
  onChange,
  onCancel,
  onConfirm,
}: RejectProfileUpdateModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-stone-950/20 px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-8">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)]">
        <div className="border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">
                Отклонить изменение профиля?
              </h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                Пользователь получит уведомление, а заявка будет завершена без применения изменений.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Закрыть окно отклонения изменения профиля"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <label htmlFor="reject-profile-update-reason" className="block text-sm font-medium text-stone-600">
            Причина отклонения
          </label>
          <textarea
            id="reject-profile-update-reason"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300"
            placeholder="Можно оставить комментарий для пользователя"
          />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.20)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Отклоняем...' : 'Отклонить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
