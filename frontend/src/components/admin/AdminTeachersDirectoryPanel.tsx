'use client';

import { useEffect, useState } from 'react';
import { DirectoryPagination } from '@/components/admin/DirectoryPagination';
import { DirectorySearchBar } from '@/components/admin/DirectorySearchBar';
import { DirectorySortControl } from '@/components/admin/DirectorySortControl';
import { PersonCard } from '@/components/admin/PersonCard';
import { PersonDetailPanel } from '@/components/admin/PersonDetailPanel';
import {
  getAdminTeacherDirectoryDetail,
  getAdminTeachersDirectory,
  type AdminTeacherDirectoryDetail,
  type AdminTeacherDirectoryItem,
  type AdminTeachersSort,
} from '@/lib/adminDirectoriesApi';

const TEACHERS_SORT_OPTIONS: Array<{ value: AdminTeachersSort; label: string }> = [
  { value: 'surname_asc', label: 'По фамилии А-Я' },
  { value: 'surname_desc', label: 'По фамилии Я-А' },
];

const PAGE_SIZE = 9;

function formatDisplayDate(value: string): string {
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

export function AdminTeachersDirectoryPanel({ token }: { token: string }) {
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState<AdminTeachersSort>('surname_asc');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminTeacherDirectoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacherDirectoryDetail | null>(null);
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
        const response = await getAdminTeachersDirectory(token, {
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
          setErrorMessage(
            error instanceof Error ? error.message : 'Не удалось загрузить список преподавателей.',
          );
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
      if (!selectedTeacherId) {
        setSelectedTeacher(null);
        setDetailErrorMessage(null);
        return;
      }

      setIsLoadingDetail(true);
      setDetailErrorMessage(null);

      try {
        const response = await getAdminTeacherDirectoryDetail(token, selectedTeacherId);

        if (isMounted) {
          setSelectedTeacher(response);
        }
      } catch (error) {
        if (isMounted) {
          setDetailErrorMessage(
            error instanceof Error ? error.message : 'Не удалось загрузить профиль преподавателя.',
          );
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
  }, [selectedTeacherId, token]);

  if (selectedTeacherId) {
    if (isLoadingDetail || !selectedTeacher) {
      return (
        <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-7 py-9 shadow-[0_18px_50px_rgba(221,156,130,0.10)]">
          <button
            type="button"
            onClick={() => setSelectedTeacherId(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_8px_24px_rgba(221,156,130,0.08)] transition hover:bg-orange-50"
          >
            Назад
          </button>
          <p className="mt-6 text-base text-stone-500 sm:text-lg">
            {detailErrorMessage ?? 'Загружаем профиль преподавателя...'}
          </p>
        </section>
      );
    }

    return (
      <PersonDetailPanel
        title={selectedTeacher.full_name}
        avatarUrl={selectedTeacher.avatar_url}
        avatarAlt={`Аватар ${selectedTeacher.full_name}`}
        subtitle={selectedTeacher.subject_name}
        onBack={() => setSelectedTeacherId(null)}
        fields={[
          { label: 'Дата рождения', value: formatDisplayDate(selectedTeacher.birth_date) },
          { label: 'Пол', value: selectedTeacher.gender },
          { label: 'Должность', value: selectedTeacher.position },
          { label: 'Телефон', value: selectedTeacher.phone },
          { label: 'Рабочий email', value: selectedTeacher.work_email },
          { label: 'Предмет', value: selectedTeacher.subject_name },
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
          ariaLabel="Поиск преподавателей"
        />
        <DirectorySortControl
          value={sortValue}
          onChange={(value) => setSortValue(value as AdminTeachersSort)}
          options={TEACHERS_SORT_OPTIONS}
          ariaLabel="Сортировка преподавателей"
        />
      </div>

      <div className="mt-5 rounded-[26px] border border-orange-50/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,246,0.96))] px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">
            Загружаем преподавателей...
          </div>
        ) : errorMessage ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-rose-500 sm:px-5 sm:text-lg">
            {errorMessage}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[22px] px-4 py-8 text-base text-stone-400 sm:px-5 sm:text-lg">
            По вашему запросу преподаватели не найдены.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((teacher) => (
              <PersonCard
                key={teacher.id}
                title={teacher.full_name}
                avatarUrl={teacher.avatar_url}
                avatarAlt={`Аватар ${teacher.full_name}`}
                meta={[
                  { label: 'Предмет', value: teacher.subject_name },
                  { label: 'Email', value: teacher.work_email },
                ]}
                onClick={() => setSelectedTeacherId(teacher.id)}
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
