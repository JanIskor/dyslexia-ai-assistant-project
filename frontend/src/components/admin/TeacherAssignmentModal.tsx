'use client';

import { LoaderCircle, UserRound, X } from 'lucide-react';
import { useEffect } from 'react';
import type { AdminTeacherAssignmentOption } from '@/lib/adminApplicationsApi';

interface TeacherAssignmentModalProps {
  isOpen: boolean;
  options: AdminTeacherAssignmentOption[];
  selectedTeacherUserId: string | null;
  onSelectTeacher: (teacherUserId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function TeacherAssignmentModal({
  isOpen,
  options,
  selectedTeacherUserId,
  onSelectTeacher,
  onClose,
  onSubmit,
  isLoading,
  isSubmitting,
  errorMessage,
}: TeacherAssignmentModalProps) {
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

  const getUnavailableReasonLabel = (reason: AdminTeacherAssignmentOption['unavailable_reason']) => {
    if (reason === 'full_capacity') {
      return 'Лимит 15 из 15 учеников уже заполнен';
    }

    if (reason === 'already_rejected_this_student') {
      return 'Этот преподаватель уже отклонил ученика';
    }

    return 'Недоступен';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-stone-950/20 px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-8">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)] sm:max-h-[calc(100vh-4rem)]">
        <div className="shrink-0 border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Назначение преподавателя</h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                Выберите преподавателя и отправьте ему ученика на сопровождение.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50"
              aria-label="Закрыть modal назначения преподавателя"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {isLoading ? (
            <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-10 text-center text-base text-stone-500">
              Загружаем преподавателей...
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-10 text-center text-base text-stone-500">
              Преподаватели для назначения пока не найдены.
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((teacher) => {
                const isSelected = teacher.teacher_user_id === selectedTeacherUserId;

                return (
                  <button
                    key={teacher.teacher_user_id}
                    type="button"
                    onClick={() => onSelectTeacher(teacher.teacher_user_id)}
                    disabled={!teacher.is_available || isSubmitting}
                    className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left shadow-sm transition sm:px-5 ${
                      teacher.is_available
                        ? isSelected
                          ? 'border-orange-300 bg-orange-50/90'
                          : 'border-orange-100/70 bg-white/92 hover:bg-orange-50/70'
                        : 'cursor-not-allowed border-stone-200 bg-stone-100/80 opacity-70'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-300 shadow-inner">
                      <UserRound className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-stone-700 sm:text-lg">{teacher.full_name}</p>
                      <p className="mt-1 text-sm text-stone-500 sm:text-base">{teacher.subject_name}</p>
                      {!teacher.is_available ? (
                        <p className="mt-2 text-sm font-medium text-rose-600">
                          {getUnavailableReasonLabel(teacher.unavailable_reason)}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-stone-600 sm:text-base">
                        {teacher.student_count}/{teacher.capacity}
                      </p>
                      <p
                        className={`mt-1 text-xs font-medium sm:text-sm ${
                          teacher.is_available ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {teacher.is_available ? 'Доступен' : 'Недоступен'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {errorMessage ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!selectedTeacherUserId || isLoading || isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Отправляем...' : 'Отправить преподавателю'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
