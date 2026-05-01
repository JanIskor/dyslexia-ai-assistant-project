'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import {
  createAdminTeacher,
  type AdminTeacherCreatePayload,
  type AdminTeacherDirectoryItem,
} from '@/lib/adminDirectoriesApi';

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
    } catch (error) {
      setCreateTeacherMessageType('error');
      setCreateTeacherMessage(
        error instanceof Error ? error.message : 'Не удалось создать преподавателя.',
      );
    } finally {
      setIsCreatingTeacher(false);
    }
  };

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-5 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-7 sm:py-7">
      <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">Создать преподавателя</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-500 sm:text-base">
        Эта вкладка теперь отвечает только за создание новой учётной записи преподавателя. Назначение учеников продолжает работать через существующий admin assignment flow в других сценариях.
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
    </section>
  );
}
