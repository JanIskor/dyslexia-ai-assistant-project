'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';

type TeacherDashboardSection = 'profile' | 'students' | 'assistant';

interface TeacherProfileCardData {
  avatarUrl: string | null;
  fullName: string;
  birthDate: string;
  gender: string;
  position: string;
  phoneNumber: string;
  workEmail: string;
  subject: string;
}

interface TeacherProfileField {
  label: string;
  value: string;
}

const TEACHER_MENU_ITEMS: Array<{ id: TeacherDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
  { id: 'students', label: 'Список учеников' },
  { id: 'assistant', label: 'ИИ-ассистент' },
];

const TEACHER_PROFILE_CARD_DATA: TeacherProfileCardData = {
  avatarUrl: null,
  fullName: 'Попов Михаил Петрович',
  birthDate: '17 ноября 1985 года',
  gender: 'Мужской',
  position: 'Преподаватель',
  phoneNumber: '+79205224112',
  workEmail: 'popov2178@bmstu.ru',
  subject: 'Литература',
};

const TEACHER_PROFILE_FIELDS: TeacherProfileField[] = [
  { label: 'Дата рождения:', value: '17 ноября 1985 года' },
  { label: 'Пол:', value: 'Мужской' },
  { label: 'Должность:', value: 'Преподаватель' },
  { label: 'Номер телефона:', value: '+79205224112' },
  { label: 'Рабочий email:', value: 'popov2178@bmstu.ru' },
  { label: 'Предмет преподавания:', value: 'Литература' },
];

const UNREAD_MESSAGES_COUNT = 3;

function TeacherNotificationBadge() {
  return (
    <div className="relative" aria-label="Новые результаты тестов от учеников">
      <div className="flex h-12 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-white/90 text-orange-300 shadow-[0_10px_25px_rgba(221,156,130,0.15)]">
        <Mail className="h-6 w-6 stroke-[1.7]" />
      </div>
      <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-400 px-1.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,146,60,0.35)]">
        {UNREAD_MESSAGES_COUNT}
      </span>
    </div>
  );
}

function TeacherProfileCard() {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
          {TEACHER_PROFILE_CARD_DATA.avatarUrl ? (
            <Image
              src={TEACHER_PROFILE_CARD_DATA.avatarUrl}
              alt={`Аватар преподавателя ${TEACHER_PROFILE_CARD_DATA.fullName}`}
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

        <h2 className="mt-6 max-w-2xl text-2xl font-medium leading-tight text-stone-700 sm:text-3xl lg:text-[2.65rem]">
          {TEACHER_PROFILE_CARD_DATA.fullName}
        </h2>

        <div className="mt-6 w-full max-w-3xl rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 text-left sm:px-5 sm:py-4">
          <dl className="divide-y divide-orange-100/80">
            {TEACHER_PROFILE_FIELDS.map((field) => (
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

function TeacherSectionContent({ section }: { section: TeacherDashboardSection }) {
  if (section === 'students') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Список учеников</h2>
        <p className="mt-6 text-base leading-relaxed text-stone-500 sm:text-lg lg:text-xl">
          Здесь будет отображаться список учеников
        </p>
      </section>
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
      <h1 className="text-2xl font-medium tracking-tight text-stone-700 sm:text-3xl lg:text-[2.1rem]">
        Образовательный профиль
      </h1>
      <div className="mt-6">
        <TeacherProfileCard />
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
  const [activeSection, setActiveSection] = useState<TeacherDashboardSection>('profile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

        if (isMounted) {
          setCurrentUser(user);
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

  if (isCheckingAuth || !currentUser) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#fff7f2_0%,#fffaf8_30%,#fdf3ee_100%)] text-stone-700">
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
        <div className="w-full p-1 sm:p-2">
          <Header
            variant="dashboard"
            title="Мой профиль"
            rightContent={
              <div className="flex items-center gap-3">
                <TeacherNotificationBadge />
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
                          onClick={() => setActiveSection(item.id)}
                          className={`flex w-full items-center gap-2 rounded-r-2xl rounded-l-none px-5 py-4 text-left text-lg leading-tight transition sm:px-6 sm:text-xl lg:text-2xl ${
                            isActive
                              ? 'bg-white/95 font-medium text-orange-400 shadow-[0_8px_24px_rgba(221,156,130,0.10)]'
                              : 'text-stone-500 hover:bg-white/60'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span
                            className={`text-xl transition ${
                              isActive ? 'text-orange-400' : 'text-transparent'
                            }`}
                            aria-hidden="true"
                          >
                            ›
                          </span>
                          <span className={item.id !== 'profile' ? 'max-w-44' : ''}>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <section className="rounded-[28px] border border-orange-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,247,242,0.4))] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <TeacherSectionContent section={activeSection} />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
