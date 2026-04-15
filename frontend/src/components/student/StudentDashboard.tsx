'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogOut, PencilLine, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { Footer } from '@/components/layout/Footer';
import { StudentMaterialsSection } from '@/components/student/StudentMaterialsSection';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';
import {
  getStudentProfile,
  getStudentProfileEditState,
  submitStudentProfileEditState,
  submitStudentProfile,
  uploadStudentProfileAvatar,
  type StudentProfileEditState,
  type StudentProfile,
  updateStudentProfileEditState,
  updateStudentProfile,
} from '@/lib/studentProfileApi';
import {
  getStudentMessageDetail,
  getStudentMessages,
  markStudentMessageAsRead,
  type TeacherStudentMessage,
  type TeacherStudentMessagesResponse,
} from '@/lib/teacherStudentMessagesApi';
import {
  GENDER_OPTIONS,
  ProfileEditForm,
  type ProfileEditFieldConfig,
  type ProfileEditReadOnlyField,
} from '@/components/profile/ProfileEditForm';

type StudentDashboardSection = 'profile' | 'materials' | 'tests' | 'messages';
type StudentProfileViewMode = 'view' | 'edit';

interface StudentProfileFormState {
  full_name: string;
  birth_date: string;
  gender: string;
  quote: string;
}

const STUDENT_PROFILE_EDIT_FIELDS: ProfileEditFieldConfig[] = [
  { key: 'full_name', label: 'ФИО', type: 'text', placeholder: 'Введите полное имя' },
  { key: 'birth_date', label: 'Дата рождения', type: 'date' },
  { key: 'gender', label: 'Пол', type: 'select', options: GENDER_OPTIONS },
  { key: 'quote', label: 'Цитата', type: 'textarea', colSpan: 2, placeholder: 'Добавьте цитату по желанию' },
];

const ONBOARDING_MENU_ITEMS: Array<{ id: StudentDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
];
const REGULAR_MENU_ITEMS: Array<{ id: StudentDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
  { id: 'messages', label: 'Сообщения' },
  { id: 'materials', label: 'Учебные материалы' },
  { id: 'tests', label: 'Мои тесты' },
];

type StudentMessagesViewState =
  | {
      mode: 'list';
    }
  | {
      mode: 'detail';
      messageId: string;
    };

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

function buildFormState(profile: {
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  quote: string | null;
}): StudentProfileFormState {
  return {
    full_name: profile.full_name ?? '',
    birth_date: profile.birth_date ?? '',
    gender: profile.gender ?? '',
    quote: profile.quote ?? '',
  };
}

function formatMessageDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

function getStudentModerationBannerText(status: string, variant: 'onboarding' | 'regular'): string {
  const isRegular = variant === 'regular';
  const isSubmitted = status === 'submitted' || status === 'in_review';
  const needsCompletion = isRegular ? status === 'revision_requested' : status === 'needs_completion';
  const isApproved = status === 'approved';
  const draftMessage = isRegular
    ? 'Изменяйте данные профиля в черновике и отправляйте их на повторную модерацию администратору.'
    : 'Заполните профиль и отправьте его на модерацию администратору.';
  const needsCompletionMessage = isRegular
    ? 'Администратор отправил изменения профиля на доработку. Обновите данные и снова отправьте их на модерацию.'
    : 'Администратор отправил профиль на доработку. Обновите данные и снова отправьте заявку на модерацию.';
  const submittedMessage = isRegular
    ? 'Изменения профиля находятся на модерации. Подтверждённый профиль продолжает использоваться в системе.'
    : 'Профиль на модерации у администратора. Ожидайте назначения преподавателя.';
  const approvedMessage = isRegular
    ? 'Последняя версия изменений профиля подтверждена администратором.'
    : 'Профиль подтверждён администратором. Дополнительные шаги будут доступны на следующих этапах.';

  if (isApproved) {
    return approvedMessage;
  }
  if (needsCompletion) {
    return needsCompletionMessage;
  }
  if (isSubmitted) {
    return submittedMessage;
  }

  return draftMessage;
}

function getStudentModerationBannerTone(
  status: string,
  variant: 'onboarding' | 'regular',
): 'neutral' | 'success' | 'warning' {
  const isRegular = variant === 'regular';

  if (status === 'approved' || status === 'submitted' || status === 'in_review') {
    return 'success';
  }

  if ((isRegular && status === 'revision_requested') || (!isRegular && status === 'needs_completion')) {
    return 'warning';
  }

  return 'neutral';
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

function StudentProfileCard({
  profile,
  profileEditState,
  onEdit,
}: {
  profile: StudentProfile;
  profileEditState: StudentProfileEditState | null;
  onEdit: () => void;
}) {
  const editStatus = profileEditState?.status ?? 'approved';
  const statusText = getStudentModerationBannerText(editStatus, 'regular');
  const statusTone = getStudentModerationBannerTone(editStatus, 'regular');
  const statusClassName =
    statusTone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : statusTone === 'warning'
        ? 'border-orange-200 bg-orange-50 text-orange-700'
        : 'border-stone-200 bg-stone-50 text-stone-600';

  return (
    <section className="mt-6 rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
          {profileEditState?.avatar_url ?? profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileEditState?.avatar_url ?? profile.avatar_url ?? ''}
              alt={`Аватар ${profile.full_name ?? 'ученика'}`}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70">
              <UserRound className="h-14 w-14 text-orange-300" />
            </div>
          )}
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

        <p className={`mt-6 w-full max-w-2xl rounded-[22px] border px-4 py-3 text-left text-sm sm:text-base ${statusClassName}`}>
          {statusText}
        </p>

        <div className="mt-6 flex w-full max-w-2xl justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50"
          >
            <PencilLine className="h-4 w-4" />
            Редактировать профиль
          </button>
        </div>
      </div>
    </section>
  );
}

function StudentSectionContent({
  activeSection,
  accessToken,
  profile,
  profileEditState,
  profileViewMode,
  form,
  onChange,
  onSave,
  onSaveAvatar,
  onSubmit,
  isSaving,
  isSubmitting,
  isUploadingAvatar,
  statusMessage,
  statusType,
  messagesViewState,
  onOpenMessage,
  onBackToMessagesList,
  onEditProfile,
  onBackToProfile,
}: {
  activeSection: StudentDashboardSection;
  accessToken: string;
  profile: StudentProfile;
  profileEditState: StudentProfileEditState | null;
  profileViewMode: StudentProfileViewMode;
  form: StudentProfileFormState;
  onChange: (field: keyof StudentProfileFormState, value: string) => void;
  onSave: () => void;
  onSaveAvatar: (file: File) => Promise<void>;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  isUploadingAvatar: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
  messagesViewState: StudentMessagesViewState;
  onOpenMessage: (messageId: string) => void;
  onBackToMessagesList: () => void;
  onEditProfile: () => void;
  onBackToProfile: () => void;
}) {
  const isRegularMode = profile.student_mode === 'regular';
  const regularEditStatus = profileEditState?.status ?? 'approved';
  const regularEditIsReadOnly = ['submitted', 'in_review'].includes(regularEditStatus);
  const moderationStatus = isRegularMode ? regularEditStatus : profile.profile_status;
  const readOnlyFields: ProfileEditReadOnlyField[] = [
    { label: 'Класс обучения:', value: profile.grade_label ?? 'Будет назначен после модерации' },
    { label: 'Дата поступления:', value: formatProfileDate(profile.enrollment_date) },
  ];

  if (activeSection === 'messages') {
    return (
      <StudentMessagesSection
        accessToken={accessToken}
        viewState={messagesViewState}
        onOpenMessage={onOpenMessage}
        onBackToList={onBackToMessagesList}
      />
    );
  }

  if (activeSection === 'materials') {
    return <StudentMaterialsSection accessToken={accessToken} />;
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

  if (activeSection === 'profile' && isRegularMode && profileViewMode === 'view') {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2.1rem]">
          Образовательный профиль
        </h1>
        <StudentProfileCard profile={profile} profileEditState={profileEditState} onEdit={onEditProfile} />
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2.1rem]">
        {isRegularMode ? 'Редактирование профиля' : 'Образовательный профиль'}
      </h1>
      <div className="mt-6">
        <ProfileEditForm
          fields={STUDENT_PROFILE_EDIT_FIELDS}
          values={form}
          isReadOnly={
            isRegularMode
              ? regularEditIsReadOnly
              : ['submitted', 'in_review', 'approved'].includes(profile.profile_status)
          }
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          statusMessage={statusMessage}
          statusType={statusType}
          bannerText={getStudentModerationBannerText(
            moderationStatus,
            isRegularMode ? 'regular' : 'onboarding',
          )}
          bannerTone={getStudentModerationBannerTone(
            moderationStatus,
            isRegularMode ? 'regular' : 'onboarding',
          )}
          avatarUrl={profileEditState?.avatar_url ?? profile.avatar_url}
          avatarAlt={`Аватар ${profile.full_name ?? 'ученика'}`}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarUpload={async (file) => onSaveAvatar(file)}
          readOnlyFields={readOnlyFields}
          backButtonLabel="Назад к профилю"
          onBack={isRegularMode ? onBackToProfile : undefined}
          onChange={(field, value) => onChange(field as keyof StudentProfileFormState, value)}
          onSave={onSave}
          onSubmit={onSubmit}
        />
      </div>
    </>
  );
}

function StudentMessagesState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-orange-100/80 bg-white/90 px-6 py-10 text-center text-base text-stone-500 shadow-[0_18px_40px_rgba(221,156,130,0.10)] sm:text-lg">
      {message}
    </div>
  );
}

function StudentMessageCard({
  message,
  onOpen,
}: {
  message: TeacherStudentMessage;
  onOpen: (messageId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(message.id)}
      className="w-full rounded-[24px] border border-orange-100/80 bg-white/92 px-5 py-5 text-left shadow-[0_18px_40px_rgba(221,156,130,0.10)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_22px_45px_rgba(221,156,130,0.14)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-stone-700 sm:text-xl">{message.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-500 sm:text-base">
            {message.body}
          </p>
        </div>
        {!message.is_read_by_student ? (
          <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">
            Новое
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-stone-400 sm:text-sm">{formatMessageDate(message.created_at)}</p>
    </button>
  );
}

function StudentMessageDetailCard({
  message,
  onBack,
}: {
  message: TeacherStudentMessage;
  onBack: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к сообщениям
      </button>

      <div className="mx-auto mt-6 w-full max-w-3xl rounded-[28px] border border-orange-100/70 bg-white/80 px-5 py-6 sm:px-6 sm:py-7">
        <p className="text-sm text-stone-400 sm:text-base">{formatMessageDate(message.created_at)}</p>
        <h2 className="mt-3 text-2xl font-medium text-stone-700 sm:text-3xl">{message.title}</h2>
        <div className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-stone-600 sm:text-lg">
          {message.body}
        </div>
      </div>
    </section>
  );
}

function StudentMessagesSection({
  accessToken,
  viewState,
  onOpenMessage,
  onBackToList,
}: {
  accessToken: string;
  viewState: StudentMessagesViewState;
  onOpenMessage: (messageId: string) => void;
  onBackToList: () => void;
}) {
  const [messages, setMessages] = useState<TeacherStudentMessage[]>([]);
  const [messagesListResponse, setMessagesListResponse] = useState<TeacherStudentMessagesResponse | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<TeacherStudentMessage | null>(null);
  const [isMessageDetailLoading, setIsMessageDetailLoading] = useState(false);
  const [messageDetailError, setMessageDetailError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      setIsMessagesLoading(true);
      setMessagesError(null);

      try {
        const response = await getStudentMessages(accessToken);
        if (!isMounted) {
          return;
        }

        setMessages(response.items);
        setMessagesListResponse(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessages([]);
        setMessagesListResponse(null);
        setMessagesError(error instanceof Error ? error.message : 'Не удалось загрузить сообщения.');
      } finally {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (viewState.mode !== 'detail') {
      setSelectedMessage(null);
      setMessageDetailError(null);
      setIsMessageDetailLoading(false);
      return;
    }

    let isMounted = true;

    const loadMessageDetail = async () => {
      setIsMessageDetailLoading(true);
      setMessageDetailError(null);

      try {
        const message = await getStudentMessageDetail(accessToken, viewState.messageId);
        if (!isMounted) {
          return;
        }

        let detailMessage = message;

        if (!message.is_read_by_student) {
          detailMessage = await markStudentMessageAsRead(accessToken, viewState.messageId);
        }

        if (!isMounted) {
          return;
        }

        setSelectedMessage(detailMessage);
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === detailMessage.id ? detailMessage : currentMessage,
          ),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedMessage(null);
        setMessageDetailError(error instanceof Error ? error.message : 'Не удалось загрузить сообщение.');
      } finally {
        if (isMounted) {
          setIsMessageDetailLoading(false);
        }
      }
    };

    void loadMessageDetail();

    return () => {
      isMounted = false;
    };
  }, [accessToken, viewState]);

  if (viewState.mode === 'detail') {
    if (isMessageDetailLoading) {
      return <StudentMessagesState message="Загрузка сообщения..." />;
    }

    if (messageDetailError) {
      return <StudentMessagesState message={messageDetailError} />;
    }

    if (!selectedMessage) {
      return <StudentMessagesState message="Не удалось загрузить сообщение." />;
    }

    return <StudentMessageDetailCard message={selectedMessage} onBack={onBackToList} />;
  }

  let content;

  if (isMessagesLoading) {
    content = <StudentMessagesState message="Загрузка сообщений..." />;
  } else if (messagesError) {
    content = <StudentMessagesState message={messagesError} />;
  } else if ((messagesListResponse?.items.length ?? 0) === 0) {
    content = <StudentMessagesState message="Сообщений пока нет" />;
  } else {
    content = (
      <div className="space-y-4">
        {messages.map((message) => (
          <StudentMessageCard key={message.id} message={message} onOpen={onOpenMessage} />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Сообщения</h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-500 sm:text-lg">
        Здесь отображаются сообщения от преподавателя, отправленные внутри системы.
      </p>
      <div className="mt-6">{content}</div>
    </section>
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
  const [profileViewMode, setProfileViewMode] = useState<StudentProfileViewMode>('view');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<StudentProfileFormState>({
    full_name: '',
    birth_date: '',
    gender: '',
    quote: '',
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'error' | 'success'>('success');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messagesViewState, setMessagesViewState] = useState<StudentMessagesViewState>({ mode: 'list' });
  const [profileEditState, setProfileEditState] = useState<StudentProfileEditState | null>(null);

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
        const editState =
          studentProfile.student_mode === 'regular'
            ? await getStudentProfileEditState(token)
            : null;

        if (isMounted) {
          setCurrentUser(user);
          setProfile(studentProfile);
          setProfileEditState(editState);
          setForm(buildFormState(editState ?? studentProfile));
          setAccessToken(token);
          setActiveSection('profile');
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
    setAccessToken(null);
    setProfileEditState(null);
    clearAccessToken();
    router.replace('/login');
  };

  const handleFormChange = (field: keyof StudentProfileFormState, value: string) => {
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
        const updatedEditState = await updateStudentProfileEditState(token, {
          full_name: form.full_name,
          birth_date: form.birth_date || null,
          gender: form.gender,
          quote: form.quote,
        });
        setProfileEditState(updatedEditState);
        setForm(buildFormState(updatedEditState));
        setStatusType('success');
        setStatusMessage('Черновик изменений сохранён.');
        return;
      }

      const updatedProfile = await updateStudentProfile(token, {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
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
        const submittedEditState = await submitStudentProfileEditState(token);
        setProfileEditState(submittedEditState);
        setForm(buildFormState(submittedEditState));
        setStatusType('success');
        setStatusMessage('Изменения отправлены на модерацию.');
        return;
      }

      const savedProfile = await updateStudentProfile(token, {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
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

  const handleAvatarUpload = async (file: File) => {
    const token = getAccessToken();

    if (!token || !profile) {
      router.replace('/login');
      return;
    }

    setIsUploadingAvatar(true);
    setStatusMessage(null);

    try {
      const avatarUrl = await uploadStudentProfileAvatar(token, file);

      if (profile.student_mode === 'regular') {
        setProfileEditState((currentValue) =>
          currentValue
            ? {
                ...currentValue,
                avatar_url: avatarUrl,
                status: 'draft',
                admin_comment: null,
              }
            : currentValue,
        );
      }

      setProfile((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              avatar_url: profile.student_mode === 'regular' ? currentValue.avatar_url : avatarUrl,
            }
          : currentValue,
      );
      setStatusType('success');
      setStatusMessage('Аватар успешно загружен.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить аватар.';
      setStatusType('error');
      setStatusMessage(message);
      throw error;
    } finally {
      setIsUploadingAvatar(false);
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
        setProfileViewMode('view');
        setMessagesViewState({ mode: 'list' });
        return;
      }

      if (requestedTab === 'tests' && profile.student_mode === 'regular') {
        setActiveSection('tests');
        setProfileViewMode('view');
        setMessagesViewState({ mode: 'list' });
        return;
      }

      if (requestedTab === 'edit-profile' || requestedTab === 'profile-edit') {
        setActiveSection('profile');
        setProfileViewMode(profile.student_mode === 'regular' ? 'edit' : 'view');
        setMessagesViewState({ mode: 'list' });
        return;
      }

      if (requestedTab === 'messages' && profile.student_mode === 'regular') {
        setActiveSection('messages');
        setProfileViewMode('view');
        const requestedMessageId = searchParams.get('messageId');
        setMessagesViewState(
          requestedMessageId ? { mode: 'detail', messageId: requestedMessageId } : { mode: 'list' },
        );
        return;
      }

      setActiveSection('profile');
      setProfileViewMode('view');
      setMessagesViewState({ mode: 'list' });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [profile, searchParams]);

  const handleSectionChange = (section: StudentDashboardSection) => {
    setActiveSection(section);
    if (section !== 'profile') {
      setProfileViewMode('view');
    }

    if (section !== 'messages') {
      setMessagesViewState({ mode: 'list' });
    }
  };

  if (isCheckingAuth || !currentUser || !profile || !accessToken) {
    return <DashboardSkeleton />;
  }

  const menuItems = profile.student_mode === 'regular' ? REGULAR_MENU_ITEMS : ONBOARDING_MENU_ITEMS;
  const headerTitle =
    activeSection === 'profile' && profile.student_mode === 'regular' && profileViewMode === 'edit'
      ? 'Редактирование профиля'
      : activeSection === 'messages' && messagesViewState.mode === 'detail'
        ? 'Сообщение'
        : activeSection === 'messages'
          ? 'Сообщения'
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
                          onClick={() => handleSectionChange(item.id)}
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
                accessToken={accessToken}
                profile={profile}
                profileEditState={profileEditState}
                profileViewMode={profileViewMode}
                form={form}
                onChange={handleFormChange}
                onSave={handleSave}
                onSaveAvatar={(file) => handleAvatarUpload(file)}
                onSubmit={handleSubmitProfile}
                isSaving={isSaving}
                isSubmitting={isSubmitting}
                isUploadingAvatar={isUploadingAvatar}
                statusMessage={statusMessage}
                statusType={statusType}
                messagesViewState={messagesViewState}
                onOpenMessage={(messageId) => setMessagesViewState({ mode: 'detail', messageId })}
                onBackToMessagesList={() => setMessagesViewState({ mode: 'list' })}
                onEditProfile={() => {
                  setProfileViewMode('edit');
                  setStatusMessage(null);
                }}
                onBackToProfile={() => {
                  setProfileViewMode('view');
                  setStatusMessage(null);
                }}
              />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
