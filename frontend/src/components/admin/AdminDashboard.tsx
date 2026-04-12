'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail } from 'lucide-react';
import { AdminApplicationDetailPanel } from '@/components/admin/AdminApplicationDetailPanel';
import { AdminApplicationsListPanel } from '@/components/admin/AdminApplicationsListPanel';
import { TeacherAssignmentModal } from '@/components/admin/TeacherAssignmentModal';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser, type AuthUser } from '@/lib/authApi';
import { getRoleRedirectPath } from '@/lib/authRedirect';
import { clearAccessToken, getAccessToken } from '@/lib/authStorage';
import {
  assignTeacherToApplication,
  getAdminApplicationFilters,
  getAdminApplicationDetail,
  getAdminApplications,
  getAdminTeacherAssignmentOptions,
  updateAdminApplication,
  requestAdminApplicationChanges,
  type AdminApplication,
  type AdminApplicationDetail,
  type AdminApplicationStatusFilterOption,
  type AdminTeacherAssignmentOption,
} from '@/lib/adminApplicationsApi';

type AdminDashboardSection = 'student-applications' | 'teachers' | 'students';

const ADMIN_MENU_ITEMS: Array<{ id: AdminDashboardSection; label: string }> = [
  { id: 'student-applications', label: 'Заявки учеников' },
  { id: 'teachers', label: 'Преподаватели' },
  { id: 'students', label: 'Ученики' },
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

function ApplicationsPanel({ token }: { token: string }) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<AdminApplicationStatusFilterOption[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<AdminApplicationDetail | null>(null);
  const [gradeLabel, setGradeLabel] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [detailMessageType, setDetailMessageType] = useState<'error' | 'success'>('success');
  const [assignmentOptions, setAssignmentOptions] = useState<AdminTeacherAssignmentOption[]>([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isLoadingAssignmentOptions, setIsLoadingAssignmentOptions] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const isProfileCompleteForAssignment = (application: AdminApplicationDetail) =>
    Boolean(
      application.full_name?.trim() &&
        application.birth_date &&
        application.gender?.trim() &&
        application.grade_label?.trim() &&
        application.enrollment_date
    );

  const getApproveGuardMessage = (application: AdminApplicationDetail | null) => {
    if (!application) {
      return null;
    }

    if (application.status === 'На доработке') {
      return 'Заявка находится на доработке';
    }

    if (!isProfileCompleteForAssignment(application)) {
      return 'Сначала заполните обязательные поля';
    }

    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const loadFilterOptions = async () => {
      try {
        const response = await getAdminApplicationFilters(token);

        if (isMounted) {
          setStatusOptions(response.statuses);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить список заявок.');
        }
      }
    };

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      if (!isMounted) {
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const response = await getAdminApplications(token, searchValue, selectedStatuses);

        if (isMounted) {
          setApplications(response.items);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить список заявок.');
          setApplications([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchValue, selectedStatuses, token]);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!selectedApplicationId) {
        setSelectedApplication(null);
        setDetailMessage(null);
        setIsAssignmentModalOpen(false);
        setAssignmentOptions([]);
        setSelectedTeacherUserId(null);
        setAssignmentError(null);
        return;
      }

      try {
        if (isMounted) {
          setIsLoadingDetail(true);
          setDetailMessage(null);
        }

        const applicationDetail = await getAdminApplicationDetail(token, selectedApplicationId);

        if (isMounted) {
          setSelectedApplication(applicationDetail);
          setGradeLabel(applicationDetail.grade_label ?? '');
          setEnrollmentDate(applicationDetail.enrollment_date ?? '');
        }
      } catch (error) {
        if (isMounted) {
          setDetailMessageType('error');
          setDetailMessage(error instanceof Error ? error.message : 'Не удалось загрузить заявку.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    };

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedApplicationId, token]);

  const handleToggleStatus = (status: string) => {
    setSelectedStatuses((currentStatuses) =>
      currentStatuses.includes(status)
        ? currentStatuses.filter((currentStatus) => currentStatus !== status)
        : [...currentStatuses, status]
    );
  };

  const handleSave = async () => {
    if (!selectedApplication) {
      return;
    }

    setIsSaving(true);
    setDetailMessage(null);

    try {
      const updatedApplication = await updateAdminApplication(token, selectedApplication.id, {
        grade_label: gradeLabel || null,
        enrollment_date: enrollmentDate || null,
      });
      setSelectedApplication(updatedApplication);
      setGradeLabel(updatedApplication.grade_label ?? '');
      setEnrollmentDate(updatedApplication.enrollment_date ?? '');
      setDetailMessageType('success');
      setDetailMessage('Поля администратора сохранены.');
      const refreshedApplications = await getAdminApplications(token, searchValue, selectedStatuses);
      setApplications(refreshedApplications.items);
    } catch (error) {
      setDetailMessageType('error');
      setDetailMessage(error instanceof Error ? error.message : 'Не удалось сохранить заявку.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedApplication) {
      return;
    }

    setIsActing(true);
    setDetailMessage(null);

    try {
      const updatedApplication = await requestAdminApplicationChanges(token, selectedApplication.id);
      setSelectedApplication(updatedApplication);
      setDetailMessageType('success');
      setDetailMessage('Заявка отправлена на доработку.');
      const refreshedApplications = await getAdminApplications(token, searchValue, selectedStatuses);
      setApplications(refreshedApplications.items);
    } catch (error) {
      setDetailMessageType('error');
      setDetailMessage(error instanceof Error ? error.message : 'Не удалось отправить заявку на доработку.');
    } finally {
      setIsActing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplication) {
      return;
    }

    const guardMessage = getApproveGuardMessage(selectedApplication);
    if (guardMessage) {
      setDetailMessageType('error');
      setDetailMessage(guardMessage);
      return;
    }

    setIsLoadingAssignmentOptions(true);
    setDetailMessage(null);
    setAssignmentError(null);
    setSelectedTeacherUserId(null);

    try {
      const response = await getAdminTeacherAssignmentOptions(token, selectedApplication.id);
      setAssignmentOptions(response.items);
      setIsAssignmentModalOpen(true);
    } catch (error) {
      setDetailMessageType('error');
      setDetailMessage(error instanceof Error ? error.message : 'Не удалось загрузить преподавателей.');
    } finally {
      setIsLoadingAssignmentOptions(false);
    }
  };

  const handleCloseAssignmentModal = () => {
    if (isAssigningTeacher) {
      return;
    }

    setIsAssignmentModalOpen(false);
    setSelectedTeacherUserId(null);
    setAssignmentError(null);
  };

  const handleAssignTeacher = async () => {
    if (!selectedApplication || !selectedTeacherUserId) {
      return;
    }

    setIsAssigningTeacher(true);
    setAssignmentError(null);
    setDetailMessage(null);

    try {
      const updatedApplication = await assignTeacherToApplication(token, selectedApplication.id, {
        teacher_user_id: selectedTeacherUserId,
      });
      setSelectedApplication(updatedApplication);
      setDetailMessageType('success');
      setDetailMessage('Ученик назначен преподавателю.');
      setIsAssignmentModalOpen(false);
      setSelectedTeacherUserId(null);
      const refreshedApplications = await getAdminApplications(token, searchValue, selectedStatuses);
      setApplications(refreshedApplications.items);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Не удалось назначить преподавателя.');
    } finally {
      setIsAssigningTeacher(false);
    }
  };

  if (selectedApplicationId) {
    if (isLoadingDetail || !selectedApplication) {
      return (
        <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
          <button
            type="button"
            onClick={() => setSelectedApplicationId(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_8px_24px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
          >
            Назад
          </button>
          <p className="mt-6 text-base text-stone-500 sm:text-lg">
            {detailMessage ?? 'Загружаем заявку...'}
          </p>
        </section>
      );
    }

    return (
      <>
        <AdminApplicationDetailPanel
          application={selectedApplication}
          gradeLabel={gradeLabel}
          enrollmentDate={enrollmentDate}
          onGradeLabelChange={setGradeLabel}
          onEnrollmentDateChange={setEnrollmentDate}
          onBack={() => setSelectedApplicationId(null)}
          onSave={handleSave}
          onRequestChanges={handleRequestChanges}
          onApprove={handleApprove}
          approveGuardMessage={getApproveGuardMessage(selectedApplication)}
          isSaving={isSaving}
          isActing={isActing || isLoadingAssignmentOptions || isAssigningTeacher}
          statusMessage={detailMessage}
          statusType={detailMessageType}
        />
        <TeacherAssignmentModal
          isOpen={isAssignmentModalOpen}
          options={assignmentOptions}
          selectedTeacherUserId={selectedTeacherUserId}
          onSelectTeacher={setSelectedTeacherUserId}
          onClose={handleCloseAssignmentModal}
          onSubmit={handleAssignTeacher}
          isLoading={isLoadingAssignmentOptions}
          isSubmitting={isAssigningTeacher}
          errorMessage={assignmentError}
        />
      </>
    );
  }

  return (
    <>
      <AdminApplicationsListPanel
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedStatuses={selectedStatuses}
        onToggleStatus={handleToggleStatus}
        onClearStatuses={() => setSelectedStatuses([])}
        isFilterOpen={isFilterOpen}
        onToggleFilterOpen={() => setIsFilterOpen((currentValue) => !currentValue)}
        statusOptions={statusOptions}
        applications={applications}
        onSelectApplication={setSelectedApplicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </>
  );
}

function AdminSectionContent({ section, token }: { section: AdminDashboardSection; token: string }) {
  const title = section === 'student-applications' ? 'Заявки учеников' : section === 'teachers' ? 'Преподаватели' : 'Ученики';

  if (section === 'student-applications') {
    return <ApplicationsPanel token={token} />;
  }

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
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0">
              <AdminSectionContent section={activeSection} token={getAccessToken() ?? ''} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
