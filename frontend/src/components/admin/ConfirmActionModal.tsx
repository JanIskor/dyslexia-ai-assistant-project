'use client';

import { LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
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
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">{title}</h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">{description}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Закрыть модальное окно подтверждения"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.20)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Удаляем...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
