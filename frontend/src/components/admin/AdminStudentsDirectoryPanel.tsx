'use client';

import { useEffect, useState } from 'react';
import { DirectoryPagination } from '@/components/admin/DirectoryPagination';
import { DirectorySearchBar } from '@/components/admin/DirectorySearchBar';
import { DirectorySortControl } from '@/components/admin/DirectorySortControl';
import { PersonCard } from '@/components/admin/PersonCard';
import { PersonDetailPanel } from '@/components/admin/PersonDetailPanel';
import {
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
      />
    );
  }

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
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
