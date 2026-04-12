'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';
import {
  getStudentProfile,
  submitStudentProfile,
  type StudentMode,
  type StudentProfile,
  updateStudentProfile,
} from '@/lib/studentProfileApi';

type StudentDashboardSection = 'profile' | 'materials' | 'tests' | 'edit-profile';

interface StudentProfileFormState {
  fullName: string;
  birthDate: string;
  gender: string;
  quote: string;
}

const ONBOARDING_MENU_ITEMS: Array<{ id: StudentDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
];
const REGULAR_MENU_ITEMS: Array<{ id: StudentDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
  { id: 'materials', label: 'Учебные материалы' },
  { id: 'tests', label: 'Мои тесты' },
  { id: 'edit-profile', label: 'Редактирование профиля' },
];

function formatProfileDate(value: string | null): string {
  if (!value) {
    return 'Будет назначено позже';
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

function buildFormState(profile: StudentProfile): StudentProfileFormState {
  return {
    fullName: profile.full_name ?? '',
    birthDate: profile.birth_date ?? '',
    gender: profile.gender ?? '',
    quote: profile.quote ?? '',
  };
}

function ModerationBanner({
  profileStatus,
  studentMode,
  regularSubmittedNotice,
}: {
  profileStatus: StudentProfile['profile_status'];
  studentMode: StudentMode;
  regularSubmittedNotice: boolean;
}) {
  const isSubmitted =
    studentMode === 'regular'
      ? regularSubmittedNotice
      : profileStatus === 'submitted' || profileStatus === 'in_review';
  const needsCompletion = profileStatus === 'needs_completion';
  const isApproved = profileStatus === 'approved';
  const draftMessage =
    studentMode === 'regular'
      ? 'Проверьте данные профиля, при необходимости обновите их и отправьте изменения на модерацию администратору.'
      : 'Заполните профиль и отправьте его на модерацию администратору.';
  const needsCompletionMessage =
    'Администратор отправил профиль на доработку. Обновите данные и снова отправьте заявку на модерацию.';
  const submittedMessage =
    studentMode === 'regular'
      ? 'Изменения отправлены на модерацию. Они будут применены после проверки администратором.'
      : 'Профиль на модерации у администратора. Ожидайте назначения преподавателя.';
  const approvedMessage =
    'Профиль подтверждён администратором. Дополнительные шаги будут доступны на следующих этапах.';

  return (
    <div
      className={`rounded-[24px] border px-5 py-4 text-base leading-relaxed shadow-[0_10px_30px_rgba(221,156,130,0.08)] sm:px-6 sm:text-lg ${
        isApproved
          ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
          : needsCompletion
            ? 'border-rose-200 bg-rose-50/90 text-rose-700'
            : isSubmitted
          ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
          : 'border-orange-200 bg-orange-50/95 text-stone-600'
      }`}
    >
      {isApproved
        ? approvedMessage
        : needsCompletion
          ? needsCompletionMessage
          : isSubmitted
            ? submittedMessage
            : draftMessage}
    </div>
  );
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-stone-500 sm:text-base lg:text-xl">{label}</dt>
      <dd className="text-sm text-stone-700 sm:text-base sm:text-right lg:text-xl">{value}</dd>
    </div>
  );
}

function StudentProfileEditCard({
  profile,
  form,
  onChange,
  onSave,
  onSubmit,
  isSaving,
  isSubmitting,
  statusMessage,
  statusType,
}: {
  profile: StudentProfile;
  form: StudentProfileFormState;
  onChange: (field: keyof StudentProfileFormState, value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
}) {
  const isReadOnly =
    profile.student_mode === 'onboarding' &&
    ['submitted', 'in_review', 'approved'].includes(profile.profile_status);

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={`Аватар ученика ${profile.full_name ?? 'ученика'}`}
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70">
              <UserRound className="h-14 w-14 text-orange-300" />
            </div>
          )}
        </div>

        <div className="mt-6 w-full max-w-2xl space-y-5 text-left">
          <div>
            <label
              htmlFor="student-full-name"
              className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
            >
              ФИО
            </label>
            <input
              id="student-full-name"
              type="text"
              value={form.fullName}
              onChange={(event) => onChange('fullName', event.target.value)}
              readOnly={isReadOnly}
              className={`w-full rounded-2xl border px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition sm:text-lg ${
                isReadOnly
                  ? 'border-orange-100 bg-stone-50 text-stone-500'
                  : 'border-orange-200 bg-white focus:border-orange-300'
              }`}
              placeholder="Введите полное имя"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="student-birth-date"
                className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
              >
                Дата рождения
              </label>
              <input
                id="student-birth-date"
                type="date"
                value={form.birthDate}
                onChange={(event) => onChange('birthDate', event.target.value)}
                readOnly={isReadOnly}
                className={`w-full rounded-2xl border px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition sm:text-lg ${
                  isReadOnly
                    ? 'border-orange-100 bg-stone-50 text-stone-500'
                    : 'border-orange-200 bg-white focus:border-orange-300'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="student-gender"
                className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
              >
                Пол
              </label>
              <select
                id="student-gender"
                value={form.gender}
                onChange={(event) => onChange('gender', event.target.value)}
                disabled={isReadOnly}
                className={`w-full rounded-2xl border px-4 py-3 pr-12 text-base text-stone-700 shadow-sm outline-none transition sm:text-lg ${
                  isReadOnly
                    ? 'border-orange-100 bg-stone-50 text-stone-500'
                    : 'border-orange-200 bg-white focus:border-orange-300'
                }`}
              >
                <option value="">Выберите пол</option>
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="student-quote"
              className="mb-2 block text-sm font-medium text-stone-500 sm:text-base"
            >
              Цитата
            </label>
            <textarea
              id="student-quote"
              value={form.quote}
              onChange={(event) => onChange('quote', event.target.value)}
              readOnly={isReadOnly}
              rows={4}
              className={`w-full rounded-2xl border px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition sm:text-lg ${
                isReadOnly
                  ? 'border-orange-100 bg-stone-50 text-stone-500'
                  : 'border-orange-200 bg-white focus:border-orange-300'
              }`}
              placeholder="Добавьте цитату по желанию"
            />
          </div>

          <p className="text-sm text-stone-400 sm:text-base">
            Загрузка аватара будет доступна позже.
          </p>
        </div>

        <div className="mt-6 w-full max-w-2xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
          <dl className="divide-y divide-orange-100/80">
            <ProfileInfoRow
              label="Класс обучения:"
              value={profile.grade_label ?? 'Будет назначен после модерации'}
            />
            <ProfileInfoRow
              label="Дата поступления:"
              value={formatProfileDate(profile.enrollment_date)}
            />
          </dl>
        </div>

        {!isReadOnly ? (
          <div className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || isSubmitting}
              className="rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSaving || isSubmitting}
              className="rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Отправляем...' : 'Отправить на модерацию'}
            </button>
          </div>
        ) : null}

        {statusMessage ? (
          <p
            className={`mt-5 w-full max-w-2xl rounded-2xl border px-4 py-3 text-left text-sm sm:text-base ${
              statusType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function StudentSectionContent({
  activeSection,
  profile,
  form,
  onChange,
  onSave,
  onSubmit,
  isSaving,
  isSubmitting,
  regularSubmittedNotice,
  statusMessage,
  statusType,
}: {
  activeSection: StudentDashboardSection;
  profile: StudentProfile;
  form: StudentProfileFormState;
  onChange: (field: keyof StudentProfileFormState, value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  regularSubmittedNotice: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
}) {
  const isRegularMode = profile.student_mode === 'regular';

  if (activeSection === 'materials') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Мои учебные материалы</h2>
        <p className="mt-6 text-base leading-relaxed text-stone-500 sm:text-lg lg:text-xl">
          Здесь будут отображаться учебные материалы
        </p>
      </section>
    );
  }

  if (activeSection === 'tests') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Мои тесты</h2>
        <p className="mt-6 text-base leading-relaxed text-stone-500 sm:text-lg lg:text-xl">
          Здесь будут отображаться тесты
        </p>
      </section>
    );
  }

  if (activeSection === 'profile' && isRegularMode) {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2.1rem]">
          Образовательный профиль
        </h1>
        <section className="mt-6 rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70">
                <UserRound className="h-14 w-14 text-orange-300" />
              </div>
            </div>

            <h2 className="mt-6 max-w-sm text-2xl font-medium leading-tight text-stone-700 sm:text-3xl lg:text-[2.65rem]">
              {profile.full_name ?? 'Профиль ученика'}
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg lg:text-[1.7rem] lg:leading-relaxed">
              {profile.quote ?? 'Цитата пока не заполнена'}
            </p>

            <div className="mt-6 w-full max-w-2xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
              <dl className="divide-y divide-orange-100/80">
                <ProfileInfoRow label="Дата рождения:" value={formatProfileDate(profile.birth_date)} />
                <ProfileInfoRow label="Пол:" value={profile.gender ?? 'Не указано'} />
                <ProfileInfoRow
                  label="Класс обучения:"
                  value={profile.grade_label ?? 'Будет назначен после модерации'}
                />
                <ProfileInfoRow
                  label="Дата поступления:"
                  value={formatProfileDate(profile.enrollment_date)}
                />
              </dl>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2.1rem]">
        {isRegularMode ? 'Редактирование профиля' : 'Образовательный профиль'}
      </h1>
      <div className="mt-6">
        <ModerationBanner
          profileStatus={profile.profile_status}
          studentMode={profile.student_mode}
          regularSubmittedNotice={regularSubmittedNotice}
        />
      </div>
      <div className="mt-6">
        <StudentProfileEditCard
          profile={profile}
          form={form}
          onChange={onChange}
          onSave={onSave}
          onSubmit={onSubmit}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          statusMessage={statusMessage}
          statusType={statusType}
        />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#fff9f5_0%,#fdf2eb_100%)] text-stone-700">
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-center rounded-[32px] border border-orange-100/70 bg-white/60 p-10 text-lg text-stone-500 shadow-[0_16px_50px_rgba(221,156,130,0.10)]">
          Загружаем профиль ученика...
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<StudentDashboardSection>('profile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<StudentProfileFormState>({
    fullName: '',
    birthDate: '',
    gender: '',
    quote: '',
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regularSubmittedNotice, setRegularSubmittedNotice] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'error' | 'success'>('success');

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

        if (user.role !== 'student') {
          router.replace(getRoleRedirectPath(user.role));
          return;
        }

        const studentProfile = await getStudentProfile(token);

        if (isMounted) {
          setCurrentUser(user);
          setProfile(studentProfile);
          setForm(buildFormState(studentProfile));
          setActiveSection(studentProfile.student_mode === 'regular' ? 'profile' : 'profile');
          setIsCheckingAuth(false);
        }
      } catch {
        clearAccessToken();
        router.replace('/login');
      }
    };

    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    clearAccessToken();
    router.replace('/login');
  };

  const handleFormChange = (field: keyof StudentProfileFormState, value: string) => {
    if (profile?.student_mode === 'regular') {
      setRegularSubmittedNotice(false);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const token = getAccessToken();

    if (!token || !profile) {
      router.replace('/login');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      if (profile.student_mode === 'regular') {
        setStatusType('success');
        setStatusMessage('Изменения сохранены в форме. Отправьте их на модерацию, когда будете готовы.');
        return;
      }

      const updatedProfile = await updateStudentProfile(token, {
        full_name: form.fullName,
        birth_date: form.birthDate || null,
        gender: form.gender,
        quote: form.quote,
      });
      setProfile(updatedProfile);
      setForm(buildFormState(updatedProfile));
      setStatusType('success');
      setStatusMessage('Изменения сохранены.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось сохранить изменения.';
      setStatusType('error');
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitProfile = async () => {
    const token = getAccessToken();

    if (!token || !profile) {
      router.replace('/login');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (profile.student_mode === 'regular') {
        setRegularSubmittedNotice(true);
        setStatusType('success');
        setStatusMessage('Форма остаётся доступной для редактирования.');
        return;
      }

      const savedProfile = await updateStudentProfile(token, {
        full_name: form.fullName,
        birth_date: form.birthDate || null,
        gender: form.gender,
        quote: form.quote,
      });
      setProfile(savedProfile);
      setForm(buildFormState(savedProfile));
      const submittedProfile = await submitStudentProfile(token);
      setProfile(submittedProfile);
      setForm(buildFormState(submittedProfile));
      setStatusType('success');
      setStatusMessage('Профиль отправлен на модерацию.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось отправить профиль на модерацию.';
      setStatusType('error');
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    const requestedTab = searchParams.get('tab');
    const timeoutId = window.setTimeout(() => {
      if (requestedTab === 'materials' && profile.student_mode === 'regular') {
        setActiveSection('materials');
        return;
      }

      if (requestedTab === 'tests' && profile.student_mode === 'regular') {
        setActiveSection('tests');
        return;
      }

      if (requestedTab === 'edit-profile' || requestedTab === 'profile-edit') {
        setActiveSection(profile.student_mode === 'regular' ? 'edit-profile' : 'profile');
        return;
      }

      setActiveSection('profile');
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [profile, searchParams]);

  if (isCheckingAuth || !currentUser || !profile) {
    return <DashboardSkeleton />;
  }

  const menuItems = profile.student_mode === 'regular' ? REGULAR_MENU_ITEMS : ONBOARDING_MENU_ITEMS;
  const headerTitle =
    activeSection === 'edit-profile'
      ? 'Редактирование профиля'
      : activeSection === 'materials'
        ? 'Учебные материалы'
        : activeSection === 'tests'
          ? 'Мои тесты'
          : 'Мой профиль';

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

          <div className="mt-4 grid gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,247,242,0.95))] px-0 py-4 shadow-[0_16px_45px_rgba(221,156,130,0.1)]">
              <nav aria-label="Навигация ученика">
                <ul className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = item.id === activeSection;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-2xl px-5 py-4 text-left text-lg leading-tight transition sm:px-6 sm:text-xl lg:text-2xl ${
                            isActive
                              ? 'bg-white/95 font-medium text-orange-400 shadow-[0_8px_24px_rgba(221,156,130,0.10)]'
                              : 'text-stone-500 hover:bg-white/60'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <section className="rounded-[28px] border border-orange-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,247,242,0.4))] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <StudentSectionContent
                activeSection={activeSection}
                profile={profile}
                form={form}
                onChange={handleFormChange}
                onSave={handleSave}
                onSubmit={handleSubmitProfile}
                isSaving={isSaving}
                isSubmitting={isSubmitting}
                regularSubmittedNotice={regularSubmittedNotice}
                statusMessage={statusMessage}
                statusType={statusType}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
