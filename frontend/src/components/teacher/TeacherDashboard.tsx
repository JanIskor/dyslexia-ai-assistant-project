'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogOut, Search, Send, SlidersHorizontal, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';
import {
  getTeacherStudentDetail,
  getTeacherStudents,
  type TeacherStudentDetail,
  type TeacherStudentListItem,
  type TeacherStudentsListParams,
  type TeacherStudentsListResponse,
  type TeacherStudentsSortBy,
  type TeacherStudentsSortOrder,
} from '@/lib/teacherStudentsApi';
import {
  acceptTeacherIncomingStudent,
  getTeacherIncomingStudentDetail,
  getTeacherIncomingStudents,
  rejectTeacherIncomingStudent,
  type TeacherIncomingStudentDetail,
  type TeacherIncomingStudentListItem,
} from '@/lib/teacherIncomingStudentsApi';
import { getTeacherProfile, type TeacherProfile } from '@/lib/teacherProfileApi';
import { sendTeacherStudentMessage } from '@/lib/teacherStudentMessagesApi';

type TeacherDashboardSection = 'profile' | 'students' | 'incoming-students' | 'assistant';

interface TeacherProfileField {
  label: string;
  value: string;
}

type TeacherStudentsViewState =
  | {
      mode: 'list';
    }
  | {
      mode: 'detail';
      studentId: string;
    };

type TeacherIncomingStudentsViewState =
  | {
      mode: 'list';
    }
  | {
      mode: 'detail';
      studentId: string;
    };

const TEACHER_MENU_ITEMS: Array<{ id: TeacherDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
  { id: 'students', label: 'Список учеников' },
  { id: 'incoming-students', label: 'Новые ученики' },
  { id: 'assistant', label: 'ИИ-ассистент' },
];

const TEACHER_STUDENTS_PAGE_SIZE = 9;

const STUDENT_PROFILE_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type TeacherStudentsSortOptionId =
  | 'full_name_asc'
  | 'full_name_desc'
  | 'grade_label_asc'
  | 'grade_label_desc';

interface TeacherStudentsSortOption {
  id: TeacherStudentsSortOptionId;
  label: string;
  sortBy: TeacherStudentsSortBy;
  sortOrder: TeacherStudentsSortOrder;
}

const TEACHER_STUDENTS_SORT_OPTIONS: TeacherStudentsSortOption[] = [
  {
    id: 'full_name_asc',
    label: 'Фамилия А–Я',
    sortBy: 'full_name',
    sortOrder: 'asc',
  },
  {
    id: 'full_name_desc',
    label: 'Фамилия Я–А',
    sortBy: 'full_name',
    sortOrder: 'desc',
  },
  {
    id: 'grade_label_asc',
    label: 'Класс ↑',
    sortBy: 'grade_label',
    sortOrder: 'asc',
  },
  {
    id: 'grade_label_desc',
    label: 'Класс ↓',
    sortBy: 'grade_label',
    sortOrder: 'desc',
  },
];

function AvatarPlaceholder({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const containerClassName = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';
  const iconClassName = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';

  return (
    <div className={`flex ${containerClassName} items-center justify-center rounded-full bg-white/70`}>
      <UserRound className={`${iconClassName} text-orange-300`} />
    </div>
  );
}

function ProfileAvatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl: string | null;
  fullName: string;
}) {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`Аватар ${fullName}`}
          width={96}
          height={96}
          unoptimized
          className="h-24 w-24 rounded-full object-cover"
        />
      ) : (
        <AvatarPlaceholder size="lg" />
      )}
    </div>
  );
}

function TeacherProfileCard({ profile }: { profile: TeacherProfile }) {
  const teacherProfileFields: TeacherProfileField[] = [
    { label: 'Дата рождения:', value: formatProfileDate(profile.birth_date) },
    { label: 'Пол:', value: profile.gender },
    { label: 'Должность:', value: profile.position },
    { label: 'Номер телефона:', value: profile.phone },
    { label: 'Рабочий email:', value: profile.work_email },
    { label: 'Предмет преподавания:', value: profile.subject_name },
  ];

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <ProfileAvatar avatarUrl={profile.avatar_url} fullName={profile.full_name} />

        <h2 className="mt-6 max-w-2xl text-2xl font-medium leading-tight text-stone-700 sm:text-3xl lg:text-[2.65rem]">
          {profile.full_name}
        </h2>

        <div className="mt-6 w-full max-w-3xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
          <dl className="divide-y divide-orange-100/80">
            {teacherProfileFields.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-stone-500 sm:text-base lg:text-xl">
                  {field.label}
                </dt>
                <dd className="text-sm text-stone-700 sm:text-base sm:text-right lg:text-xl">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function formatProfileDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return STUDENT_PROFILE_DATE_FORMATTER.format(parsedDate);
}

function StudentCard({
  student,
  onOpen,
}: {
  student: TeacherStudentListItem;
  onOpen: (studentId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(student.id)}
      className="flex min-h-[18rem] w-full flex-col items-center rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-8 text-center shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
        {student.avatar_url ? (
          <Image
            src={student.avatar_url}
            alt={`Аватар ученика ${student.full_name}`}
            width={88}
            height={88}
            unoptimized
            className="h-[5.5rem] w-[5.5rem] rounded-full object-cover"
          />
        ) : (
          <AvatarPlaceholder />
        )}
      </div>

      <h3 className="mt-6 text-xl font-medium leading-snug text-stone-700 sm:text-2xl">
        {student.full_name}
      </h3>
      <p className="mt-3 text-base text-stone-500 sm:text-lg">{student.grade_label}</p>
    </button>
  );
}

function IncomingStudentCard({
  student,
  onOpen,
}: {
  student: TeacherIncomingStudentListItem;
  onOpen: (studentId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(student.id)}
      className="flex w-full flex-col rounded-[28px] border border-orange-100/80 bg-white/92 px-6 py-6 text-left shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
          {student.avatar_url ? (
            <Image
              src={student.avatar_url}
              alt={`Аватар ученика ${student.full_name}`}
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <AvatarPlaceholder />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-medium leading-snug text-stone-700 sm:text-2xl">
            {student.full_name}
          </h3>
          <p className="mt-2 text-base text-stone-500 sm:text-lg">{student.grade_label}</p>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">
            Дата рождения: {formatProfileDate(student.birth_date)}
          </p>
          <p className="mt-1 text-sm text-stone-500 sm:text-base">
            Дата поступления: {formatProfileDate(student.enrollment_date)}
          </p>
        </div>
      </div>
    </button>
  );
}

function StudentDetailProfile({
  student,
  onBack,
  messageTitle,
  messageBody,
  onMessageTitleChange,
  onMessageBodyChange,
  onSendMessage,
  isSendingMessage,
  sendStatusMessage,
  sendStatusType,
}: {
  student: TeacherStudentDetail;
  onBack: () => void;
  messageTitle: string;
  messageBody: string;
  onMessageTitleChange: (value: string) => void;
  onMessageBodyChange: (value: string) => void;
  onSendMessage: () => void;
  isSendingMessage: boolean;
  sendStatusMessage: string | null;
  sendStatusType: 'error' | 'success';
}) {
  const detailFields: TeacherProfileField[] = [
    { label: 'Дата рождения:', value: formatProfileDate(student.birth_date) },
    { label: 'Пол:', value: student.gender },
    { label: 'Класс обучения:', value: student.grade_label },
    { label: 'Дата поступления:', value: formatProfileDate(student.enrollment_date) },
  ];

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col items-center text-center">
        <ProfileAvatar avatarUrl={student.avatar_url} fullName={student.full_name} />

        <h2 className="mt-6 max-w-sm text-2xl font-medium leading-tight text-stone-700 sm:text-3xl lg:text-[2.65rem]">
          {student.full_name}
        </h2>

        {student.quote ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg lg:text-[1.7rem] lg:leading-relaxed">
            {student.quote}
          </p>
        ) : null}

        <div className="mt-6 w-full max-w-2xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
          <dl className="divide-y divide-orange-100/80">
            {detailFields.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-stone-500 sm:text-base lg:text-xl">
                  {field.label}
                </dt>
                <dd className="text-sm text-stone-700 sm:text-base sm:text-right lg:text-xl">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 w-full max-w-2xl rounded-[24px] border border-orange-100/70 bg-white/75 px-4 py-5 text-left sm:px-5 sm:py-6">
          <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Сообщение ученику</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-500 sm:text-base">
            Отправьте ученику содержательное сообщение внутри системы.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="teacher-message-title"
                className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
              >
                Заголовок
              </label>
              <input
                id="teacher-message-title"
                type="text"
                value={messageTitle}
                onChange={(event) => onMessageTitleChange(event.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="Введите заголовок сообщения"
              />
            </div>

            <div>
              <label
                htmlFor="teacher-message-body"
                className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
              >
                Текст сообщения
              </label>
              <textarea
                id="teacher-message-body"
                value={messageBody}
                onChange={(event) => onMessageBodyChange(event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="Введите сообщение для ученика"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onSendMessage}
              disabled={isSendingMessage}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSendingMessage ? 'Отправляем...' : 'Отправить сообщение'}
            </button>
          </div>

          {sendStatusMessage ? (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
                sendStatusType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {sendStatusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function IncomingStudentDetailProfile({
  student,
  onBack,
  onAccept,
  onReject,
  isSubmitting,
  actionError,
}: {
  student: TeacherIncomingStudentDetail;
  onBack: () => void;
  onAccept: () => void;
  onReject: () => void;
  isSubmitting: boolean;
  actionError: string | null;
}) {
  const detailFields: TeacherProfileField[] = [
    { label: 'Дата рождения:', value: formatProfileDate(student.birth_date) },
    { label: 'Пол:', value: student.gender },
    { label: 'Класс обучения:', value: student.grade_label },
    { label: 'Дата поступления:', value: formatProfileDate(student.enrollment_date) },
  ];

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к списку
      </button>

      <div className="mx-auto mt-6 flex w-full max-w-3xl flex-col items-center text-center">
        <ProfileAvatar avatarUrl={student.avatar_url} fullName={student.full_name} />

        <h2 className="mt-6 max-w-sm text-2xl font-medium leading-tight text-stone-700 sm:text-3xl lg:text-[2.65rem]">
          {student.full_name}
        </h2>

        {student.quote ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg lg:text-[1.7rem] lg:leading-relaxed">
            {student.quote}
          </p>
        ) : null}

        <div className="mt-6 w-full max-w-2xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
          <dl className="divide-y divide-orange-100/80">
            {detailFields.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-stone-500 sm:text-base lg:text-xl">
                  {field.label}
                </dt>
                <dd className="text-sm text-stone-700 sm:text-base sm:text-right lg:text-xl">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {actionError ? (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:text-base">
            {actionError}
          </p>
        ) : null}

        <div className="mt-6 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onAccept}
            disabled={isSubmitting}
            className="flex-1 rounded-[22px] bg-emerald-500 px-5 py-4 text-base font-medium text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Принять ученика
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isSubmitting}
            className="flex-1 rounded-[22px] border border-rose-200 bg-white px-5 py-4 text-base font-medium text-rose-600 shadow-[0_12px_26px_rgba(244,63,94,0.08)] transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отклонить
          </button>
        </div>
      </div>
    </section>
  );
}

function StudentsListState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-orange-100/80 bg-white/90 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
      {message}
    </div>
  );
}

function TeacherStudentsToolbar({
  searchValue,
  onSearchChange,
  selectedSortOption,
  isSortMenuOpen,
  onToggleSortMenu,
  onSelectSortOption,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedSortOption: TeacherStudentsSortOption;
  isSortMenuOpen: boolean;
  onToggleSortMenu: () => void;
  onSelectSortOption: (option: TeacherStudentsSortOption) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative block flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск по фамилии..."
          className="h-14 w-full rounded-[24px] border border-orange-100/80 bg-white/92 pl-12 pr-4 text-base text-stone-700 shadow-[0_12px_30px_rgba(221,156,130,0.08)] outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          aria-label="Поиск по фамилии"
        />
      </label>

      <div className="relative self-end sm:self-auto">
        <button
          type="button"
          onClick={onToggleSortMenu}
          className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-orange-100/80 bg-white/92 text-orange-400 shadow-[0_12px_30px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
          aria-haspopup="menu"
          aria-expanded={isSortMenuOpen}
          aria-label={`Сортировка: ${selectedSortOption.label}`}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>

        {isSortMenuOpen ? (
          <div
            className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-[13rem] rounded-[22px] border border-orange-100/80 bg-white/96 p-2 shadow-[0_20px_45px_rgba(221,156,130,0.16)]"
            role="menu"
            aria-label="Меню сортировки учеников"
          >
            {TEACHER_STUDENTS_SORT_OPTIONS.map((option) => {
              const isActive = option.id === selectedSortOption.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectSortOption(option)}
                  className={`flex w-full rounded-2xl px-4 py-3 text-left text-sm transition sm:text-base ${
                    isActive
                      ? 'bg-orange-50 font-medium text-orange-500'
                      : 'text-stone-600 hover:bg-orange-50/80'
                  }`}
                  role="menuitem"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeacherStudentsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Пагинация списка учеников">
      {Array.from({ length: totalPages }, (_, index) => {
        const pageNumber = index + 1;
        const isActive = pageNumber === currentPage;

        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`flex h-11 min-w-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition sm:text-base ${
              isActive
                ? 'bg-orange-400 text-white shadow-[0_12px_30px_rgba(251,146,60,0.28)]'
                : 'border border-orange-100/80 bg-white/92 text-stone-600 shadow-[0_10px_24px_rgba(221,156,130,0.08)] hover:bg-orange-50'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        );
      })}
    </nav>
  );
}

function TeacherStudentsSection({
  accessToken,
  viewState,
  onOpenStudent,
  onBackToList,
}: {
  accessToken: string;
  viewState: TeacherStudentsViewState;
  onOpenStudent: (studentId: string) => void;
  onBackToList: () => void;
}) {
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [studentsListResponse, setStudentsListResponse] = useState<TeacherStudentsListResponse | null>(
    null,
  );
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentDetail | null>(null);
  const [studentDetailError, setStudentDetailError] = useState<string | null>(null);
  const [isStudentDetailLoading, setIsStudentDetailLoading] = useState(false);
  const loadedStudentIdsRef = useRef<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [selectedSortOption, setSelectedSortOption] = useState<TeacherStudentsSortOption>(
    TEACHER_STUDENTS_SORT_OPTIONS[0],
  );
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendStatusMessage, setSendStatusMessage] = useState<string | null>(null);
  const [sendStatusType, setSendStatusType] = useState<'error' | 'success'>('success');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, selectedSortOption]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (sortMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsSortMenuOpen(false);
    };

    if (isSortMenuOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      setIsStudentsLoading(true);
      setStudentsError(null);

      try {
        const queryParams: TeacherStudentsListParams = {
          search: searchValue,
          sort_by: selectedSortOption.sortBy,
          sort_order: selectedSortOption.sortOrder,
          page: currentPage,
          page_size: TEACHER_STUDENTS_PAGE_SIZE,
        };
        const response = await getTeacherStudents(accessToken, queryParams);

        if (!isMounted) {
          return;
        }

        setStudents(response.items);
        setStudentsListResponse(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStudents([]);
        setStudentsListResponse(null);
        setStudentsError(
          error instanceof Error ? error.message : 'Не удалось загрузить учеников',
        );
      } finally {
        if (isMounted) {
          setIsStudentsLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [accessToken, currentPage, searchValue, selectedSortOption]);

  useEffect(() => {
    if (viewState.mode !== 'detail') {
      setSelectedStudent(null);
      setStudentDetailError(null);
      setIsStudentDetailLoading(false);
      setMessageTitle('');
      setMessageBody('');
      setSendStatusMessage(null);
      return;
    }

    if (
      selectedStudent?.id === viewState.studentId &&
      loadedStudentIdsRef.current.has(viewState.studentId)
    ) {
      return;
    }

    let isMounted = true;

    const loadStudentDetail = async () => {
      setIsStudentDetailLoading(true);
      setStudentDetailError(null);
      setSelectedStudent(null);

      try {
        const response = await getTeacherStudentDetail(accessToken, viewState.studentId);

        if (!isMounted) {
          return;
        }

        loadedStudentIdsRef.current.add(response.id);
        setSelectedStudent(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStudentDetailError(
          error instanceof Error ? error.message : 'Не удалось загрузить профиль ученика',
        );
      } finally {
        if (isMounted) {
          setIsStudentDetailLoading(false);
        }
      }
    };

    void loadStudentDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, selectedStudent?.id, viewState]);

  const handleSendMessage = async () => {
    if (viewState.mode !== 'detail') {
      return;
    }

    if (!messageTitle.trim() || !messageBody.trim()) {
      setSendStatusType('error');
      setSendStatusMessage('Заполните заголовок и текст сообщения.');
      return;
    }

    setIsSendingMessage(true);
    setSendStatusMessage(null);

    try {
      await sendTeacherStudentMessage(accessToken, viewState.studentId, {
        title: messageTitle,
        body: messageBody,
      });
      setMessageTitle('');
      setMessageBody('');
      setSendStatusType('success');
      setSendStatusMessage('Сообщение отправлено ученику.');
    } catch (error) {
      setSendStatusType('error');
      setSendStatusMessage(
        error instanceof Error ? error.message : 'Не удалось отправить сообщение.',
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (viewState.mode === 'detail') {
    if (isStudentDetailLoading) {
      return <StudentsListState message="Загрузка профиля ученика..." />;
    }

    if (studentDetailError) {
      return <StudentsListState message={studentDetailError} />;
    }

    if (!selectedStudent) {
      return <StudentsListState message="Не удалось загрузить профиль ученика" />;
    }

    return (
      <StudentDetailProfile
        student={selectedStudent}
        onBack={onBackToList}
        messageTitle={messageTitle}
        messageBody={messageBody}
        onMessageTitleChange={setMessageTitle}
        onMessageBodyChange={setMessageBody}
        onSendMessage={() => void handleSendMessage()}
        isSendingMessage={isSendingMessage}
        sendStatusMessage={sendStatusMessage}
        sendStatusType={sendStatusType}
      />
    );
  }

  let listContent: ReactNode;

  if (isStudentsLoading) {
    listContent = <StudentsListState message="Загрузка списка учеников..." />;
  } else if (studentsError) {
    listContent = <StudentsListState message={studentsError} />;
  } else if (students.length === 0) {
    listContent = (
      <StudentsListState
        message={
          searchValue.trim()
            ? 'По вашему запросу ученики не найдены'
            : 'У преподавателя пока нет учеников'
        }
      />
    );
  } else {
    listContent = (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} onOpen={onOpenStudent} />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Список учеников</h2>
      <div className="mt-6" ref={sortMenuRef}>
        <TeacherStudentsToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedSortOption={selectedSortOption}
          isSortMenuOpen={isSortMenuOpen}
          onToggleSortMenu={() => setIsSortMenuOpen((currentValue) => !currentValue)}
          onSelectSortOption={(option) => {
            setSelectedSortOption(option);
            setIsSortMenuOpen(false);
          }}
        />
      </div>
      <div className="mt-6">{listContent}</div>
      <TeacherStudentsPagination
        currentPage={studentsListResponse?.page ?? currentPage}
        totalPages={studentsListResponse?.pages ?? 0}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}

function TeacherIncomingStudentsSection({
  accessToken,
  viewState,
  onOpenStudent,
  onBackToList,
}: {
  accessToken: string;
  viewState: TeacherIncomingStudentsViewState;
  onOpenStudent: (studentId: string) => void;
  onBackToList: () => void;
}) {
  const [students, setStudents] = useState<TeacherIncomingStudentListItem[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<TeacherIncomingStudentDetail | null>(null);
  const [studentDetailError, setStudentDetailError] = useState<string | null>(null);
  const [isStudentDetailLoading, setIsStudentDetailLoading] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      setIsStudentsLoading(true);
      setStudentsError(null);

      try {
        const response = await getTeacherIncomingStudents(accessToken);

        if (!isMounted) {
          return;
        }

        setStudents(response.items);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStudents([]);
        setStudentsError(
          error instanceof Error ? error.message : 'Не удалось загрузить новых учеников',
        );
      } finally {
        if (isMounted) {
          setIsStudentsLoading(false);
        }
      }
    };

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (viewState.mode !== 'detail') {
      setSelectedStudent(null);
      setStudentDetailError(null);
      setIsStudentDetailLoading(false);
      setActionError(null);
      return;
    }

    let isMounted = true;

    const loadStudentDetail = async () => {
      setIsStudentDetailLoading(true);
      setStudentDetailError(null);
      setActionError(null);

      try {
        const response = await getTeacherIncomingStudentDetail(accessToken, viewState.studentId);

        if (!isMounted) {
          return;
        }

        setSelectedStudent(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedStudent(null);
        setStudentDetailError(
          error instanceof Error ? error.message : 'Не удалось загрузить карточку ученика',
        );
      } finally {
        if (isMounted) {
          setIsStudentDetailLoading(false);
        }
      }
    };

    void loadStudentDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, viewState]);

  const handleAction = async (action: 'accept' | 'reject') => {
    if (viewState.mode !== 'detail') {
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      if (action === 'accept') {
        await acceptTeacherIncomingStudent(accessToken, viewState.studentId);
      } else {
        await rejectTeacherIncomingStudent(accessToken, viewState.studentId);
      }

      const response = await getTeacherIncomingStudents(accessToken);
      setStudents(response.items);
      setStudentsError(null);
      onBackToList();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : action === 'accept'
            ? 'Не удалось принять ученика'
            : 'Не удалось отклонить ученика',
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (viewState.mode === 'detail') {
    if (isStudentDetailLoading) {
      return <StudentsListState message="Загрузка карточки ученика..." />;
    }

    if (studentDetailError) {
      return <StudentsListState message={studentDetailError} />;
    }

    if (!selectedStudent) {
      return <StudentsListState message="Не удалось загрузить карточку ученика" />;
    }

    return (
      <IncomingStudentDetailProfile
        student={selectedStudent}
        onBack={onBackToList}
        onAccept={() => void handleAction('accept')}
        onReject={() => void handleAction('reject')}
        isSubmitting={isSubmittingAction}
        actionError={actionError}
      />
    );
  }

  let content: ReactNode;

  if (isStudentsLoading) {
    content = <StudentsListState message="Загрузка новых учеников..." />;
  } else if (studentsError) {
    content = <StudentsListState message={studentsError} />;
  } else if (students.length === 0) {
    content = <StudentsListState message="Новых учеников пока нет" />;
  } else {
    content = (
      <div className="grid gap-5 lg:grid-cols-2">
        {students.map((student) => (
          <IncomingStudentCard key={student.id} student={student} onOpen={onOpenStudent} />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Новые ученики</h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-500 sm:text-lg">
        Здесь отображаются ученики, которых администратор уже назначил преподавателю, но которые ещё не были обработаны.
      </p>
      <div className="mt-6">{content}</div>
    </section>
  );
}

function TeacherSectionContent({
  section,
  accessToken,
  teacherProfile,
  studentsViewState,
  incomingStudentsViewState,
  onOpenStudent,
  onBackToStudentsList,
  onOpenIncomingStudent,
  onBackToIncomingStudentsList,
}: {
  section: TeacherDashboardSection;
  accessToken: string;
  teacherProfile: TeacherProfile;
  studentsViewState: TeacherStudentsViewState;
  incomingStudentsViewState: TeacherIncomingStudentsViewState;
  onOpenStudent: (studentId: string) => void;
  onBackToStudentsList: () => void;
  onOpenIncomingStudent: (studentId: string) => void;
  onBackToIncomingStudentsList: () => void;
}) {
  if (section === 'students') {
    return (
      <TeacherStudentsSection
        accessToken={accessToken}
        viewState={studentsViewState}
        onOpenStudent={onOpenStudent}
        onBackToList={onBackToStudentsList}
      />
    );
  }

  if (section === 'incoming-students') {
    return (
      <TeacherIncomingStudentsSection
        accessToken={accessToken}
        viewState={incomingStudentsViewState}
        onOpenStudent={onOpenIncomingStudent}
        onBackToList={onBackToIncomingStudentsList}
      />
    );
  }

  if (section === 'assistant') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">ИИ-ассистент</h2>
        <p className="mt-6 text-base leading-relaxed text-stone-500 sm:text-lg lg:text-xl">
          Здесь будет интерфейс ИИ-ассистента для адаптации учебных материалов
        </p>
      </section>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2rem]">
        Профиль преподавателя
      </h1>
      <div className="mt-6">
        <TeacherProfileCard profile={teacherProfile} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#fff9f5_0%,#fdf2eb_100%)] text-stone-700">
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-center rounded-[32px] border border-orange-100/70 bg-white/60 p-10 text-lg text-stone-500 shadow-[0_16px_50px_rgba(221,156,130,0.10)]">
          Загружаем профиль преподавателя...
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function TeacherDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<TeacherDashboardSection>('profile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [studentsViewState, setStudentsViewState] = useState<TeacherStudentsViewState>({
    mode: 'list',
  });
  const [incomingStudentsViewState, setIncomingStudentsViewState] =
    useState<TeacherIncomingStudentsViewState>({
      mode: 'list',
    });

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      const token = getAccessToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const user = await getCurrentUser(token);

        if (user.role !== 'teacher') {
          router.replace(getRoleRedirectPath(user.role));
          return;
        }

        const profile = await getTeacherProfile(token);

        if (isMounted) {
          setCurrentUser(user);
          setTeacherProfile(profile);
          setAccessToken(token);
          setIsCheckingAuth(false);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setTeacherProfile(null);
          setAccessToken(null);
        }
        clearAccessToken();
        router.replace('/login');
      }
    };

    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const requestedStudentId = searchParams.get('studentId');
    const timeoutId = window.setTimeout(() => {
      if (requestedTab === 'incoming-students') {
        setActiveSection('incoming-students');
        setStudentsViewState({ mode: 'list' });
        setIncomingStudentsViewState(
          requestedStudentId ? { mode: 'detail', studentId: requestedStudentId } : { mode: 'list' },
        );
        return;
      }

      if (requestedTab === 'students') {
        setActiveSection('students');
        setIncomingStudentsViewState({ mode: 'list' });
        setStudentsViewState(
          requestedStudentId ? { mode: 'detail', studentId: requestedStudentId } : { mode: 'list' },
        );
        return;
      }

      if (requestedTab === 'assistant') {
        setActiveSection('assistant');
        setStudentsViewState({ mode: 'list' });
        setIncomingStudentsViewState({ mode: 'list' });
        return;
      }

      setActiveSection('profile');
      setStudentsViewState({ mode: 'list' });
      setIncomingStudentsViewState({ mode: 'list' });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchParams]);

  const handleLogout = () => {
    setCurrentUser(null);
    setTeacherProfile(null);
    setAccessToken(null);
    clearAccessToken();
    router.replace('/login');
  };

  const handleSectionChange = (section: TeacherDashboardSection) => {
    setActiveSection(section);

    if (section !== 'students') {
      setStudentsViewState({ mode: 'list' });
    }

    if (section !== 'incoming-students') {
      setIncomingStudentsViewState({ mode: 'list' });
    }
  };

  const handleOpenStudent = (studentId: string) => {
    setStudentsViewState({
      mode: 'detail',
      studentId,
    });
  };

  const handleOpenIncomingStudent = (studentId: string) => {
    setIncomingStudentsViewState({
      mode: 'detail',
      studentId,
    });
  };

  const headerTitle =
    activeSection === 'students' && studentsViewState.mode === 'detail'
      ? 'Профиль ученика'
      : activeSection === 'incoming-students' && incomingStudentsViewState.mode === 'detail'
        ? 'Новый ученик'
      : TEACHER_MENU_ITEMS.find((item) => item.id === activeSection)?.label ?? 'Мой профиль';

  if (isCheckingAuth || !currentUser || !accessToken || !teacherProfile) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#fff7f2_0%,#fffaf8_30%,#fdf3ee_100%)] text-stone-700">
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
        <div className="w-full p-1 sm:p-2">
          <Header
            variant="dashboard"
            title={headerTitle}
            rightContent={
              <div className="flex items-center gap-3">
                <NotificationsBell token={getAccessToken() ?? ''} />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-100 bg-white/90 px-4 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.12)] transition hover:bg-orange-50"
                  aria-label="Выйти из аккаунта"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            }
          />

          <div className="mt-4 grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,247,242,0.95))] px-0 py-4 shadow-[0_16px_45px_rgba(221,156,130,0.1)]">
              <nav aria-label="Навигация преподавателя">
                <ul className="space-y-1">
                  {TEACHER_MENU_ITEMS.map((item) => {
                    const isActive = item.id === activeSection;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleSectionChange(item.id)}
                          className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-2xl px-5 py-4 text-left text-lg leading-tight transition sm:px-6 sm:text-xl lg:text-2xl ${
                            isActive
                              ? 'bg-white/95 font-medium text-orange-400 shadow-[0_8px_24px_rgba(221,156,130,0.10)]'
                              : 'text-stone-500 hover:bg-white/60'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className={item.id !== 'profile' ? 'max-w-44' : ''}>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <section className="rounded-[28px] border border-orange-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,247,242,0.4))] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <TeacherSectionContent
                section={activeSection}
                accessToken={accessToken}
                teacherProfile={teacherProfile}
                studentsViewState={studentsViewState}
                incomingStudentsViewState={incomingStudentsViewState}
                onOpenStudent={handleOpenStudent}
                onBackToStudentsList={() => setStudentsViewState({ mode: 'list' })}
                onOpenIncomingStudent={handleOpenIncomingStudent}
                onBackToIncomingStudentsList={() => setIncomingStudentsViewState({ mode: 'list' })}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
