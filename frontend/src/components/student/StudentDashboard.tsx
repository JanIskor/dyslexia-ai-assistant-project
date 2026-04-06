'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';

type StudentDashboardSection = 'profile' | 'materials' | 'tests';

interface StudentProfileCardData {
  fullName: string;
  quote: string;
  birthDate: string;
  gender: string;
  classLabel: string;
  studyYear: string;
  startDate: string;
}

const STUDENT_MENU_ITEMS: Array<{ id: StudentDashboardSection; label: string }> = [
  { id: 'profile', label: 'Мой профиль' },
  { id: 'materials', label: 'Учебные материалы' },
  { id: 'tests', label: 'Мои тесты' },
];

const PROFILE_CARD_DATA: StudentProfileCardData = {
  fullName: 'Иванов Андрей Викторович',
  quote:
    '«Маленький человек может сделать гораздо больше, чем он об этом предполагает»',
  birthDate: '23 января 2010 года',
  gender: 'Мужской',
  classLabel: '4А класс',
  studyYear: '4а класс',
  startDate: '3 сентября 2017 года',
};

const UNREAD_MESSAGES_COUNT = 3;

function StudentNotificationBadge() {
  return (
    <div className="relative">
      <div className="flex h-12 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-white/90 text-orange-300 shadow-[0_10px_25px_rgba(221,156,130,0.15)]">
        <Mail className="h-6 w-6 stroke-[1.7]" />
      </div>
      <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-400 px-1.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,146,60,0.35)]">
        {UNREAD_MESSAGES_COUNT}
      </span>
    </div>
  );
}

function StudentProfileCard() {
  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70">
            <UserRound className="h-14 w-14 text-orange-300" />
          </div>
        </div>

        <h2 className="mt-7 max-w-xs text-4xl font-medium leading-tight text-stone-700">
          {PROFILE_CARD_DATA.fullName}
        </h2>

        <p className="mt-4 max-w-sm text-2xl leading-relaxed text-stone-500">
          {PROFILE_CARD_DATA.quote}
        </p>

        <div className="mt-7 w-full space-y-4 text-center text-[1.75rem] text-stone-500">
          <p>{PROFILE_CARD_DATA.birthDate}</p>
          <p>{PROFILE_CARD_DATA.gender}</p>
          <div className="mx-auto flex max-w-xs items-center justify-center gap-4 border-y border-orange-100 py-3">
            <span>{PROFILE_CARD_DATA.classLabel}</span>
            <span className="text-orange-200">|</span>
            <span>{PROFILE_CARD_DATA.studyYear}</span>
          </div>
          <p>{PROFILE_CARD_DATA.startDate}</p>
        </div>
      </div>
    </section>
  );
}

function StudentSectionContent({ section }: { section: StudentDashboardSection }) {
  if (section === 'materials') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-3xl font-medium text-stone-700">Мои учебные материалы</h2>
        <p className="mt-6 text-xl leading-relaxed text-stone-500">
          Здесь будут отображаться учебные материалы
        </p>
      </section>
    );
  }

  if (section === 'tests') {
    return (
      <section className="rounded-[30px] border border-orange-100/80 bg-white/90 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.12)]">
        <h2 className="text-3xl font-medium text-stone-700">Мои тесты</h2>
        <p className="mt-6 text-xl leading-relaxed text-stone-500">
          Здесь будут отображаться тесты
        </p>
      </section>
    );
  }

  return (
    <>
      <h1 className="text-4xl font-medium tracking-tight text-stone-700 sm:text-[2.7rem]">
        Образовательный профиль
      </h1>
      <div className="mt-6">
        <StudentProfileCard />
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
  const [activeSection, setActiveSection] = useState<StudentDashboardSection>('profile');
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

        if (user.role !== 'student') {
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-3 py-3 sm:px-5 sm:py-5">
        <div className="w-full rounded-[34px] border border-orange-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,245,240,0.8))] p-3 shadow-[0_20px_80px_rgba(221,156,130,0.14)] backdrop-blur sm:p-5">
          <Header
            variant="dashboard"
            title="Мой профиль"
            rightContent={
              <div className="flex items-center gap-3">
                <StudentNotificationBadge />
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
                  {STUDENT_MENU_ITEMS.map((item) => {
                    const isActive = item.id === activeSection;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`flex w-full items-center gap-2 rounded-r-2xl rounded-l-none px-6 py-4 text-left text-2xl leading-tight transition ${
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
                          <span className={item.id === 'materials' ? 'max-w-32' : ''}>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <section className="rounded-[28px] border border-orange-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,247,242,0.4))] px-5 py-6 sm:px-7 sm:py-8">
              <StudentSectionContent section={activeSection} />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
