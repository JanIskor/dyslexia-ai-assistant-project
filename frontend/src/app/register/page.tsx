'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthField } from '@/components/auth/AuthField';
import { Mail, Lock } from 'lucide-react';
import { registerUser } from '@/lib/authApi';
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
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [status, setStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setStatusType('error');
      setStatus('Исправьте ошибки в форме');
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    try {
      await registerUser({
        email: form.email.trim(),
        password: form.password,
      });

      setStatusType('success');
      setStatus('Регистрация прошла успешно. Перенаправляем на страницу входа...');
      setForm(initialForm);

      window.setTimeout(() => {
        router.push('/login?registered=1');
      }, 1200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось завершить регистрацию. Попробуйте ещё раз.';
      setStatusType('error');
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
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
          placeholder="ivan.petrov@mail.ru"
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
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-4 py-2 text-white font-semibold shadow-md transition hover:brightness-95"
        >
          {isSubmitting ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>

        {status && (
          <p
            className={`rounded-lg border p-2 text-sm ${
              statusType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {status}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
