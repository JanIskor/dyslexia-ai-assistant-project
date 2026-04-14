'use client';

import { ArrowLeft, Check, RefreshCcw, Save, UserRound } from 'lucide-react';
import { ModerationEntityBadge } from '@/components/admin/ModerationEntityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AdminApplicationDetail } from '@/lib/adminApplicationsApi';
import { getAdminApplicationStatusStyle } from '@/lib/adminApplicationStatusUi';

interface AdminApplicationDetailPanelProps {
  application: AdminApplicationDetail;
  gradeLabel: string;
  enrollmentDate: string;
  onGradeLabelChange: (value: string) => void;
  onEnrollmentDateChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  onRequestChanges: () => void;
  onApprove: () => void;
  approveGuardMessage: string | null;
  isSaving: boolean;
  isActing: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
}

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return 'Не указана';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-stone-500 sm:text-base">{label}</dt>
      <dd className="text-sm text-stone-700 sm:text-base sm:text-right">{value}</dd>
    </div>
  );
}

export function AdminApplicationDetailPanel({
  application,
  gradeLabel,
  enrollmentDate,
  onGradeLabelChange,
  onEnrollmentDateChange,
  onBack,
  onSave,
  onRequestChanges,
  onApprove,
  approveGuardMessage,
  isSaving,
  isActing,
  statusMessage,
  statusType,
}: AdminApplicationDetailPanelProps) {
  const isStudentProfileUpdate = application.request_kind === 'profile_update';
  const isTeacherProfileUpdate = application.request_kind === 'teacher_profile_update';

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

      <div className="mt-5 flex flex-col gap-6">
        <div className="rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-5 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/75">
                <UserRound className="h-12 w-12 text-orange-300" />
              </div>
            </div>

            <h2 className="mt-5 text-2xl font-medium text-stone-700 sm:text-3xl">{application.full_name}</h2>

            <ModerationEntityBadge
              requestKind={application.request_kind}
              label={application.request_kind_label}
              className="mt-3"
            />

            <StatusBadge
              label={application.status}
              toneClassName={getAdminApplicationStatusStyle(application.status)}
              className="mt-4"
            />
          </div>

          <dl className="mt-6 divide-y divide-orange-100/80">
            <DetailRow label="Дата рождения" value={formatDisplayDate(application.birth_date)} />
            <DetailRow label="Пол" value={application.gender ?? 'Не указан'} />
            {isTeacherProfileUpdate ? (
              <>
                <DetailRow label="Должность" value={application.position ?? 'Не указана'} />
                <DetailRow label="Телефон" value={application.phone ?? 'Не указан'} />
                <DetailRow label="Рабочий email" value={application.work_email ?? 'Не указан'} />
                <DetailRow label="Предмет" value={application.subject_name ?? 'Не указан'} />
              </>
            ) : (
              <DetailRow label="Цитата" value={application.quote ?? 'Не указана'} />
            )}
          </dl>
        </div>

        {isStudentProfileUpdate || isTeacherProfileUpdate ? (
          <div className="rounded-[26px] border border-orange-50/90 bg-white/95 px-5 py-6">
            <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Текущий подтверждённый профиль</h3>

            <dl className="mt-4 divide-y divide-orange-100/80">
              <DetailRow label="ФИО" value={application.current_profile_full_name ?? 'Не указано'} />
              <DetailRow
                label="Дата рождения"
                value={formatDisplayDate(application.current_profile_birth_date)}
              />
              <DetailRow label="Пол" value={application.current_profile_gender ?? 'Не указан'} />
              {isTeacherProfileUpdate ? (
                <>
                  <DetailRow label="Должность" value={application.current_profile_position ?? 'Не указана'} />
                  <DetailRow label="Телефон" value={application.current_profile_phone ?? 'Не указан'} />
                  <DetailRow label="Рабочий email" value={application.current_profile_work_email ?? 'Не указан'} />
                  <DetailRow label="Предмет" value={application.current_profile_subject_name ?? 'Не указан'} />
                </>
              ) : (
                <DetailRow label="Цитата" value={application.current_profile_quote ?? 'Не указана'} />
              )}
            </dl>
          </div>
        ) : null}

        {!isTeacherProfileUpdate ? (
          <div className="rounded-[26px] border border-orange-50/90 bg-white/95 px-5 py-6">
          <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Контекст назначения</h3>

          <dl className="mt-4 divide-y divide-orange-100/80">
            <DetailRow
              label="Последний преподаватель"
              value={application.current_teacher_full_name ?? 'Не назначался'}
            />
            <DetailRow
              label="Предмет"
              value={application.current_teacher_subject_name ?? 'Не указан'}
            />
            <DetailRow
              label="Статус решения преподавателя"
              value={application.teacher_review_status ?? 'Пока не отправлялась преподавателю'}
            />
          </dl>
          </div>
        ) : null}

        <div className="rounded-[26px] border border-orange-50/90 bg-white/95 px-5 py-6">
          <h3 className="text-lg font-medium text-stone-700 sm:text-xl">
            {isTeacherProfileUpdate
              ? 'Модерация обновления профиля преподавателя'
              : isStudentProfileUpdate
                ? 'Модерация обновления профиля ученика'
                : 'Поля администратора'}
          </h3>

          {application.can_edit_admin_fields ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="admin-grade-label"
                  className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
                >
                  Класс обучения
                </label>
                <input
                  id="admin-grade-label"
                  type="text"
                  value={gradeLabel}
                  onChange={(event) => onGradeLabelChange(event.target.value)}
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                  placeholder="Например, 4А класс"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-enrollment-date"
                  className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
                >
                  Дата поступления
                </label>
                <input
                  id="admin-enrollment-date"
                  type="date"
                  value={enrollmentDate}
                  onChange={(event) => onEnrollmentDateChange(event.target.value)}
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                />
              </div>
            </div>
          ) : !isStudentProfileUpdate && !isTeacherProfileUpdate ? (
            <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
              Для этой заявки администратор проверяет данные и принимает решение по профилю.
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {application.can_edit_admin_fields ? (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || isActing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRequestChanges}
              disabled={isSaving || isActing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-base font-medium text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              {isStudentProfileUpdate || isTeacherProfileUpdate
                ? 'Отправить изменения на доработку'
                : 'Отправить на доработку'}
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isSaving || isActing || Boolean(approveGuardMessage)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isStudentProfileUpdate || isTeacherProfileUpdate ? 'Подтвердить изменения' : 'Подтвердить заявку'}
            </button>
          </div>

          {approveGuardMessage ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:text-base">
              {approveGuardMessage}
            </p>
          ) : null}

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
        </div>
      </div>
    </section>
  );
}
