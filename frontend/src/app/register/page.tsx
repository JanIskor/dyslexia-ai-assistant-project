'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';
import { Mail, Lock } from 'lucide-react';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  AuthErrors,
} from '@/lib/authValidators';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}
const initialForm: RegisterForm = { email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [status, setStatus] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const validate = (): boolean => {
    const result: AuthErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
    };
    setErrors(result);
    return !result.email && !result.password && !result.confirmPassword;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setStatus('Исправьте ошибки в форме');
      return;
    }
    setStatus('Регистрация готова. Далее будет интеграция с backend.');
  };

  return (
    <AuthLayout
      title="Регистрация"
      description="Создайте аккаунт ученика"
      footnote={
        <p>
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
            Войти
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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

        <AuthField
          label="Пароль"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Пароль"
          icon={<Lock className="h-4 w-4 text-orange-500" />}
          error={errors.password}
          autoComplete="new-password"
        />

        <AuthField
          label="Подтвердите пароль"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Подтверждение пароля"
          icon={<Lock className="h-4 w-4 text-orange-500" />}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-4 py-2 text-white font-semibold shadow-md transition hover:brightness-95"
        >
          Зарегистрироваться
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
