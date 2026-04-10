'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, LogOut, Mail, Users, UserSquare2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';

type AdminDashboardSection = 'student-applications' | 'teachers' | 'students';

const ADMIN_MENU_ITEMS: Array<{ id: AdminDashboardSection; label: string; icon: typeof FileText }> = [
  { id: 'student-applications', label: 'Заявки учеников', icon: FileText },
  { id: 'teachers', label: 'Преподаватели', icon: Users },
  { id: 'students', label: 'Ученики', icon: UserSquare2 },
];

function AdminNotificationBadge() {
  return (
    <div className="relative" aria-label="Уведомления администратора">
      <div className="flex h-12 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-white/90 text-orange-300 shadow-[0_10px_25px_rgba(221,156,130,0.15)]">
        <Mail className="h-6 w-6 stroke-[1.7]" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#fff9f5_0%,#fdf2eb_100%)] text-stone-700">
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-center rounded-[32px] border border-orange-100/70 bg-white/60 p-10 text-lg text-stone-500 shadow-[0_16px_50px_rgba(221,156,130,0.10)]">
          Загружаем панель администратора...
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AdminSectionContent({ section }: { section: AdminDashboardSection }) {
  const title = section === 'student-applications' ? 'Заявки учеников' : section === 'teachers' ? 'Преподаватели' : 'Ученики';

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">{title}</h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg lg:text-xl">
        Здесь будут отображаться заявки учеников на модерацию
      </p>
    </section>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminDashboardSection>('student-applications');
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

        if (user.role !== 'admin') {
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
            title="Администратор"
            rightContent={
              <div className="flex items-center gap-3">
                <AdminNotificationBadge />
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

          <div className="mt-4 grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,247,242,0.95))] px-0 py-4 shadow-[0_16px_45px_rgba(221,156,130,0.1)]">
              <nav aria-label="Навигация администратора">
                <ul className="space-y-1">
                  {ADMIN_MENU_ITEMS.map((item) => {
                    const isActive = item.id === activeSection;
                    const Icon = item.icon;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-5 py-4 text-left text-lg leading-tight transition sm:px-6 sm:text-xl lg:text-2xl ${
                            isActive
                              ? 'bg-white/95 font-medium text-orange-400 shadow-[0_8px_24px_rgba(221,156,130,0.10)]'
                              : 'text-stone-500 hover:bg-white/60'
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0">
              <AdminSectionContent section={activeSection} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
