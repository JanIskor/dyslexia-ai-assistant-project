'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';
import { Mail } from 'lucide-react';
import { validateEmail, AuthErrors } from '@/lib/authValidators';

interface ForgotForm {
  email: string;
}
const initialForm: ForgotForm = { email: '' };

export default function ForgotPassword() {
  const [form, setForm] = useState<ForgotForm>(initialForm);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [status, setStatus] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ email: event.target.value });
  };

  const validate = (): boolean => {
    const email = validateEmail(form.email);
    setErrors({ email });
    return !email;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setStatus('Пожалуйста, исправьте указанный email.');
      return;
    }
    setStatus('Инструкции для восстановления отправлены (имитация). Подключите backend.');
  };

  return (
    <AuthLayout
      title="Забыли пароль?"
      description="Введите ваш email, и мы отправим ссылку для сброса пароля"
      footnote={
        <p>
          Вернуться на{' '}
          <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
            страницу входа
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="example@site.ru"
          icon={<Mail className="h-4 w-4 text-orange-500" />}
          error={errors.email}
          autoComplete="email"
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-4 py-2 text-white font-semibold shadow-md transition hover:brightness-95"
        >
          Отправить ссылку
        </button>

        {status && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700">
            {status}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
