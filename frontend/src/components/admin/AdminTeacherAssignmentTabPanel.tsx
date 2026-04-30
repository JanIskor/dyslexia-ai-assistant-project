'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, UserPlus, UserRound } from 'lucide-react';
import { TeacherAssignmentModal } from '@/components/admin/TeacherAssignmentModal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { assignTeacherToApplication, getAdminTeacherAssignmentOptions, type AdminTeacherAssignmentOption } from '@/lib/adminApplicationsApi';
import {
  createAdminTeacher,
  getAdminUnassignedStudents,
  type AdminTeacherCreatePayload,
  type AdminTeacherDirectoryItem,
  type AdminUnassignedStudentItem,
} from '@/lib/adminDirectoriesApi';

function getCapacityToneClass(isAvailable: boolean): string {
  return isAvailable
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';
}

export function AdminTeacherAssignmentTabPanel({ token }: { token: string }) {
  const [teacherForm, setTeacherForm] = useState<AdminTeacherCreatePayload>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [createTeacherMessage, setCreateTeacherMessage] = useState<string | null>(null);
  const [createTeacherMessageType, setCreateTeacherMessageType] = useState<'error' | 'success'>('success');

  const [unassignedStudents, setUnassignedStudents] = useState<AdminUnassignedStudentItem[]>([]);
  const [isLoadingUnassignedStudents, setIsLoadingUnassignedStudents] = useState(true);
  const [unassignedStudentsError, setUnassignedStudentsError] = useState<string | null>(null);

  const [teacherCapacityItems, setTeacherCapacityItems] = useState<AdminTeacherAssignmentOption[]>([]);
  const [isLoadingTeacherCapacity, setIsLoadingTeacherCapacity] = useState(true);
  const [teacherCapacityError, setTeacherCapacityError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<AdminUnassignedStudentItem | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<AdminTeacherAssignmentOption[]>([]);
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState<string | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isLoadingAssignmentOptions, setIsLoadingAssignmentOptions] = useState(false);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignmentMessageType, setAssignmentMessageType] = useState<'error' | 'success'>('success');

  const loadUnassignedStudents = useCallback(async () => {
    setIsLoadingUnassignedStudents(true);
    setUnassignedStudentsError(null);

    try {
      const response = await getAdminUnassignedStudents(token);
      setUnassignedStudents(response.items);
    } catch (error) {
      setUnassignedStudents([]);
      setUnassignedStudentsError(
        error instanceof Error ? error.message : 'Не удалось загрузить список учеников без преподавателя.',
      );
    } finally {
      setIsLoadingUnassignedStudents(false);
    }
  }, [token]);

  const loadTeacherCapacity = useCallback(async () => {
    setIsLoadingTeacherCapacity(true);
    setTeacherCapacityError(null);

    try {
      const response = await getAdminTeacherAssignmentOptions(token);
      setTeacherCapacityItems(response.items);
    } catch (error) {
      setTeacherCapacityItems([]);
      setTeacherCapacityError(
        error instanceof Error ? error.message : 'Не удалось загрузить загрузку преподавателей.',
      );
    } finally {
      setIsLoadingTeacherCapacity(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.all([loadUnassignedStudents(), loadTeacherCapacity()]);
  }, [loadTeacherCapacity, loadUnassignedStudents]);

  const handleTeacherFormChange = (field: keyof AdminTeacherCreatePayload, value: string) => {
    setTeacherForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const handleCreateTeacher = async () => {
    setIsCreatingTeacher(true);
    setCreateTeacherMessage(null);

    try {
      const createdTeacher: AdminTeacherDirectoryItem = await createAdminTeacher(token, teacherForm);
      setTeacherForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
      });
      setCreateTeacherMessageType('success');
      setCreateTeacherMessage(`Преподаватель ${createdTeacher.full_name} создан.`);
      await loadTeacherCapacity();
    } catch (error) {
      setCreateTeacherMessageType('error');
      setCreateTeacherMessage(
        error instanceof Error ? error.message : 'Не удалось создать преподавателя.',
      );
    } finally {
      setIsCreatingTeacher(false);
    }
  };

  const handleOpenAssignment = async (student: AdminUnassignedStudentItem) => {
    setSelectedStudent(student);
    setSelectedTeacherUserId(null);
    setAssignmentError(null);
    setIsLoadingAssignmentOptions(true);
    setIsAssignmentModalOpen(true);

    try {
      const response = await getAdminTeacherAssignmentOptions(token, student.application_id);
      setAssignmentOptions(response.items);
    } catch (error) {
      setAssignmentOptions([]);
      setAssignmentError(error instanceof Error ? error.message : 'Не удалось загрузить преподавателей.');
    } finally {
      setIsLoadingAssignmentOptions(false);
    }
  };

  const handleCloseAssignmentModal = () => {
    if (isAssigningTeacher) {
      return;
    }

    setIsAssignmentModalOpen(false);
    setSelectedStudent(null);
    setSelectedTeacherUserId(null);
    setAssignmentError(null);
  };

  const handleAssignTeacher = async () => {
    if (!selectedStudent || !selectedTeacherUserId) {
      return;
    }

    setIsAssigningTeacher(true);
    setAssignmentError(null);
    setAssignmentMessage(null);

    try {
      await assignTeacherToApplication(token, selectedStudent.application_id, {
        teacher_user_id: selectedTeacherUserId,
      });
      setAssignmentMessageType('success');
      setAssignmentMessage(`Ученик ${selectedStudent.full_name} назначен преподавателю.`);
      setIsAssignmentModalOpen(false);
      setSelectedStudent(null);
      setSelectedTeacherUserId(null);
      await Promise.all([loadUnassignedStudents(), loadTeacherCapacity()]);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Не удалось назначить преподавателя.');
      setAssignmentMessageType('error');
      setAssignmentMessage(error instanceof Error ? error.message : 'Не удалось назначить преподавателя.');
    } finally {
      setIsAssigningTeacher(false);
    }
  };

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
          <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Создать преподавателя</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">
            Создайте новую учётную запись преподавателя. Профиль создаётся сразу, а недостающие данные можно уточнить позже в системе.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-500 sm:text-base" htmlFor="admin-create-teacher-email">
                Email
              </label>
              <input
                id="admin-create-teacher-email"
                type="email"
                value={teacherForm.email}
                onChange={(event) => handleTeacherFormChange('email', event.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="teacher@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-500 sm:text-base" htmlFor="admin-create-teacher-password">
                Пароль
              </label>
              <input
                id="admin-create-teacher-password"
                type="password"
                value={teacherForm.password}
                onChange={(event) => handleTeacherFormChange('password', event.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="Введите пароль"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-500 sm:text-base" htmlFor="admin-create-teacher-first-name">
                Имя
              </label>
              <input
                id="admin-create-teacher-first-name"
                type="text"
                value={teacherForm.first_name}
                onChange={(event) => handleTeacherFormChange('first_name', event.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="Введите имя"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-500 sm:text-base" htmlFor="admin-create-teacher-last-name">
                Фамилия
              </label>
              <input
                id="admin-create-teacher-last-name"
                type="text"
                value={teacherForm.last_name}
                onChange={(event) => handleTeacherFormChange('last_name', event.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition focus:border-orange-300 sm:text-lg"
                placeholder="Введите фамилию"
              />
            </div>
          </div>

          {createTeacherMessage ? (
            <p
              data-testid="admin-create-teacher-message"
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
                createTeacherMessageType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {createTeacherMessage}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateTeacher()}
              disabled={isCreatingTeacher}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {isCreatingTeacher ? 'Создаём...' : 'Создать преподавателя'}
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
          <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Назначить ученика преподавателю</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">
            Используется текущая логика admin assignment flow с учётом лимита 15 учеников на преподавателя.
          </p>

          {assignmentMessage ? (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm sm:text-base ${
                assignmentMessageType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {assignmentMessage}
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div>
              <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Ученики без преподавателя</h3>
              <div className="mt-4 space-y-3">
                {isLoadingUnassignedStudents ? (
                  <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-8 text-base text-stone-500">
                    Загружаем список ожидания...
                  </div>
                ) : unassignedStudentsError ? (
                  <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-8 text-base text-red-700">
                    {unassignedStudentsError}
                  </div>
                ) : unassignedStudents.length === 0 ? (
                  <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-8 text-base text-stone-500">
                    Все ученики уже назначены преподавателям.
                  </div>
                ) : (
                  unassignedStudents.map((student) => (
                    <article
                      key={student.application_id}
                      data-testid={`admin-unassigned-student-${student.user_id}`}
                      className="flex flex-col gap-4 rounded-[24px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_12px_30px_rgba(221,156,130,0.08)] lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                            <UserRound className="h-6 w-6 text-orange-300" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-stone-700 sm:text-lg">{student.full_name}</h4>
                          <p className="mt-1 text-sm text-stone-500 sm:text-base">
                            Класс: {student.grade_label ?? 'Не указан'}
                          </p>
                          <p className="mt-1 text-sm text-stone-400 sm:text-base">
                            Статус профиля: {student.profile_status}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleOpenAssignment(student)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95"
                      >
                        <Check className="h-4 w-4" />
                        Назначить
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-stone-700 sm:text-xl">Текущая загрузка преподавателей</h3>
              <div className="mt-4 space-y-3">
                {isLoadingTeacherCapacity ? (
                  <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-8 text-base text-stone-500">
                    Загружаем преподавателей...
                  </div>
                ) : teacherCapacityError ? (
                  <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-8 text-base text-red-700">
                    {teacherCapacityError}
                  </div>
                ) : teacherCapacityItems.length === 0 ? (
                  <div className="rounded-[24px] border border-orange-100/70 bg-white/80 px-5 py-8 text-base text-stone-500">
                    Преподаватели пока не созданы.
                  </div>
                ) : (
                  teacherCapacityItems.map((teacher) => {
                    const availableSlots = teacher.capacity - teacher.student_count;

                    return (
                      <article
                        key={teacher.teacher_user_id}
                        data-testid={`admin-teacher-capacity-${teacher.teacher_user_id}`}
                        className="rounded-[24px] border border-orange-100/80 bg-white/92 px-5 py-5 shadow-[0_12px_30px_rgba(221,156,130,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-medium text-stone-700 sm:text-lg">{teacher.full_name}</h4>
                            <p className="mt-1 text-sm text-stone-500 sm:text-base">{teacher.subject_name}</p>
                          </div>
                          <StatusBadge
                            label={`${teacher.student_count} / ${teacher.capacity}`}
                            toneClassName={getCapacityToneClass(teacher.is_available)}
                          />
                        </div>
                        <p className="mt-3 text-sm text-stone-500 sm:text-base">
                          Свободных мест: {availableSlots}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TeacherAssignmentModal
        isOpen={isAssignmentModalOpen}
        options={assignmentOptions}
        selectedTeacherUserId={selectedTeacherUserId}
        onSelectTeacher={setSelectedTeacherUserId}
        onClose={handleCloseAssignmentModal}
        onSubmit={() => void handleAssignTeacher()}
        isLoading={isLoadingAssignmentOptions}
        isSubmitting={isAssigningTeacher}
        errorMessage={assignmentError}
      />
    </>
  );
}
