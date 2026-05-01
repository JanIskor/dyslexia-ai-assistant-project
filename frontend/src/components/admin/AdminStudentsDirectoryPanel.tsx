'use client';

import { LoaderCircle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DirectoryPagination } from '@/components/admin/DirectoryPagination';
import { DirectorySearchBar } from '@/components/admin/DirectorySearchBar';
import { DirectorySortControl } from '@/components/admin/DirectorySortControl';
import { PersonCard } from '@/components/admin/PersonCard';
import { PersonDetailPanel } from '@/components/admin/PersonDetailPanel';
import {
  deleteAdminStudent,
  getAdminStudentDirectoryDetail,
  getAdminStudentsDirectory,
  type AdminStudentDirectoryDetail,
  type AdminStudentDirectoryItem,
  type AdminStudentsSort,
} from '@/lib/adminDirectoriesApi';

const STUDENTS_SORT_OPTIONS: Array<{ value: AdminStudentsSort; label: string }> = [
  { value: 'surname_asc', label: 'По фамилии А-Я' },
  { value: 'surname_desc', label: 'По фамилии Я-А' },
  { value: 'grade_asc', label: 'По классу ↑' },
  { value: 'grade_desc', label: 'По классу ↓' },
];

const PAGE_SIZE = 9;

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

export function AdminStudentsDirectoryPanel({ token }: { token: string }) {
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState<AdminStudentsSort>('surname_asc');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminStudentDirectoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentDirectoryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusMessageType, setStatusMessageType] = useState<'error' | 'success'>('success');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchValue, sortValue]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAdminStudentsDirectory(token, {
          search: searchValue,
          sort: sortValue,
          page,
          page_size: PAGE_SIZE,
        });

        if (isMounted) {
          setItems(response.items);
          setTotalPages(response.total_pages);
        }
      } catch (error) {
        if (isMounted) {
          setItems([]);
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить список учеников.');
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
  }, [page, searchValue, sortValue, token]);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!selectedStudentId) {
        setSelectedStudent(null);
        setDetailErrorMessage(null);
        return;
      }

      setIsLoadingDetail(true);
      setDetailErrorMessage(null);

      try {
        const response = await getAdminStudentDirectoryDetail(token, selectedStudentId);

        if (isMounted) {
          setSelectedStudent(response);
        }
      } catch (error) {
        if (isMounted) {
          setDetailErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить профиль ученика.');
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
  }, [selectedStudentId, token]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDeleteModalOpen]);

  const reloadStudents = async () => {
    const response = await getAdminStudentsDirectory(token, {
      search: searchValue,
      sort: sortValue,
      page,
      page_size: PAGE_SIZE,
    });

    setItems(response.items);
    setTotalPages(response.total_pages);

    if (response.items.length === 0 && page > 1) {
      setPage((currentPage) => Math.max(1, currentPage - 1));
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) {
      return;
    }

    setIsDeletingStudent(true);
    setDetailErrorMessage(null);

    try {
      await deleteAdminStudent(token, selectedStudent.id);
      setStatusMessageType('success');
      setStatusMessage('Ученик удалён.');
      setIsDeleteModalOpen(false);
      setSelectedStudentId(null);
      setSelectedStudent(null);
      await reloadStudents();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить ученика.';
      setStatusMessageType('error');
      setStatusMessage(message);
      setDetailErrorMessage(message);
    } finally {
      setIsDeletingStudent(false);
    }
  };

  if (selectedStudentId) {
    if (isLoadingDetail || !selectedStudent) {
      return (
        <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
          <button
            type="button"
            onClick={() => setSelectedStudentId(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_8px_24px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
          >
            Назад
          </button>
          <p className="mt-6 text-base text-stone-500 sm:text-lg">
            {detailErrorMessage ?? 'Загружаем профиль ученика...'}
          </p>
        </section>
      );
    }

    return (
      <>
        <PersonDetailPanel
          title={selectedStudent.full_name}
          avatarUrl={selectedStudent.avatar_url}
          avatarAlt={`Аватар ${selectedStudent.full_name}`}
          subtitle={selectedStudent.grade_label}
          onBack={() => setSelectedStudentId(null)}
          fields={[
            { label: 'Дата рождения', value: formatDisplayDate(selectedStudent.birth_date) },
            { label: 'Пол', value: selectedStudent.gender ?? 'Не указан' },
            { label: 'Класс', value: selectedStudent.grade_label ?? 'Не указан' },
            { label: 'Дата поступления', value: formatDisplayDate(selectedStudent.enrollment_date) },
            { label: 'Цитата', value: selectedStudent.quote ?? 'Не указана' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-base font-medium text-rose-600 shadow-[0_12px_26px_rgba(244,63,94,0.08)] transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Удалить ученика
            </button>
          }
        />

        {isDeleteModalOpen ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-stone-950/20 px-4 py-6 backdrop-blur-[2px] sm:px-6 sm:py-8">
            <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.96))] shadow-[0_20px_60px_rgba(150,92,46,0.18)]">
              <div className="border-b border-orange-100/70 px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Удалить ученика?</h2>
                    <p className="mt-2 text-sm text-stone-500 sm:text-base">
                      Ученик будет деактивирован и больше не сможет пользоваться системой. Если ученик связан с преподавателем, преподаватель получит уведомление.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeletingStudent) {
                        setIsDeleteModalOpen(false);
                      }
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-500 shadow-sm transition hover:bg-orange-50"
                    aria-label="Закрыть modal удаления ученика"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeletingStudent}
                    className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteStudent()}
                    disabled={isDeletingStudent}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.20)] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingStudent ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {isDeletingStudent ? 'Удаляем...' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      {statusMessage ? (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
            statusMessageType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row">
        <DirectorySearchBar
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Поиск по фамилии..."
          ariaLabel="Поиск учеников"
        />
        <DirectorySortControl
          value={sortValue}
          onChange={(value) => setSortValue(value as AdminStudentsSort)}
          options={STUDENTS_SORT_OPTIONS}
          ariaLabel="Сортировка учеников"
        />
      </div>

      <div className="mt-5 rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">
            Загружаем учеников...
          </div>
        ) : errorMessage ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-rose-500 sm:px-5 sm:text-lg">
            {errorMessage}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">
            По вашему запросу ученики не найдены.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((student) => (
              <PersonCard
                key={student.id}
                title={student.full_name}
                avatarUrl={student.avatar_url}
                avatarAlt={`Аватар ${student.full_name}`}
                meta={[
                  { label: 'Класс', value: student.grade_label ?? 'Не указан' },
                ]}
                onClick={() => setSelectedStudentId(student.id)}
              />
            ))}
          </div>
        )}
      </div>

      {!isLoading && !errorMessage && items.length > 0 ? (
        <DirectoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </section>
  );
}
