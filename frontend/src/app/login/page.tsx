'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';
import { validateEmail, validatePassword, AuthErrors } from '@/lib/authValidators';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
  showPassword: boolean;
}

const initialForm: LoginForm = { email: '', password: '', remember: false, showPassword: false };

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [status, setStatus] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = (): boolean => {
    const result: AuthErrors = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(result);
    return !result.email && !result.password;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setStatus('Обнаружены ошибки. Исправьте, пожалуйста.');
      return;
    }
    setStatus('Форма корректна (имитация отправки). TODO: подключить backend.');
  };

  return (
    <AuthLayout
      title="Вход в аккаунт"
      description="Введите данные для доступа к системе"
      footnote={
        <p>
          Нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-orange-500 hover:text-orange-600">
            Зарегистрироваться
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

        <AuthField
          label="Пароль"
          name="password"
          type={form.showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={handleChange}
          placeholder="Введите пароль"
          icon={<Lock className="h-4 w-4 text-orange-500" />}
          error={errors.password}
          autoComplete="current-password"
        >
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            onClick={() => setForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
            aria-label={form.showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {form.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </AuthField>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Запомнить меня</span>
          </label>
          <Link href="/forgot-password" className="text-orange-500 hover:text-orange-600">
            Забыли пароль?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-4 py-2 text-white font-semibold shadow-md transition hover:brightness-95"
        >
          Войти
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
