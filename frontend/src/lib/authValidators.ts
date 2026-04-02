export interface AuthErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lowerRe = /[a-z]/;
const upperRe = /[A-Z]/;
const digitRe = /\d/;
const specialRe = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return 'Email обязателен';
  }
  if (!emailRe.test(email)) {
    return 'Введите корректный email';
  }
  return undefined;
};

export const validatePassword = (password: string): string | undefined => {
  if (password.length < 8) {
    return 'Пароль должен быть минимум 8 символов';
  }
  if (!lowerRe.test(password)) {
    return 'Пароль должен содержать минимум одну строчную латинскую букву';
  }
  if (!upperRe.test(password)) {
    return 'Пароль должен содержать минимум одну заглавную латинскую букву';
  }
  if (!digitRe.test(password)) {
    return 'Пароль должен содержать минимум одну цифру';
  }
  if (!specialRe.test(password)) {
    return 'Пароль должен содержать минимум один специальный символ';
  }
  return undefined;
};

export const validateConfirmPassword = (password: string, confirm: string): string | undefined => {
  if (!confirm) {
    return 'Подтверждение пароля обязательно';
  }
  if (password !== confirm) {
    return 'Пароли не совпадают';
  }
  return undefined;
};
