'use client';

import { LoaderCircle, UserRound, X } from 'lucide-react';
import { useEffect } from 'react';
import type { TeacherStudentListItem } from '@/lib/teacherStudentsApi';

interface TeacherMaterialAssignmentModalProps {
  isOpen: boolean;
  students: TeacherStudentListItem[];
  selectedStudentUserId: string | null;
  onSelectStudent: (studentUserId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function TeacherMaterialAssignmentModal({
  isOpen,
  students,
  selectedStudentUserId,
  onSelectStudent,
  onClose,
  onSubmit,
  isLoading,
  isSubmitting,
  errorMessage,
}: TeacherMaterialAssignmentModalProps) {
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
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)] sm:max-h-[calc(100vh-4rem)]">
        <div className="shrink-0 border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Назначить ученику</h2>
              <p className="mt-2 text-sm text-stone-500 sm:text-base">
                Выберите одного из своих учеников, чтобы назначить ему материал.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50"
              aria-label="Закрыть modal назначения материала"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {isLoading ? (
            <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-10 text-center text-base text-stone-500">
              Загружаем учеников...
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-10 text-center text-base text-stone-500">
              У преподавателя пока нет учеников для назначения материала.
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => {
                const isSelected = student.id === selectedStudentUserId;

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    disabled={isSubmitting}
                    className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left shadow-sm transition sm:px-5 ${
                      isSelected
                        ? 'border-orange-300 bg-orange-50/90'
                        : 'border-orange-100/70 bg-white/92 hover:bg-orange-50/70'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-orange-300 shadow-inner">
                      {student.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={student.avatar_url}
                          alt={student.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-6 w-6" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-stone-700 sm:text-lg">{student.full_name}</p>
                      <p className="mt-1 text-sm text-stone-500 sm:text-base">{student.grade_label}</p>
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
              disabled={!selectedStudentUserId || isLoading || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Назначаем...' : 'Назначить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
