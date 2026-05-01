const GENDER_LABELS: Record<string, string> = {
  not_specified: 'Не указан',
  male: 'Мужской',
  female: 'Женский',
  'Не указан': 'Не указан',
  'Мужской': 'Мужской',
  'Женский': 'Женский',
};

export const TEACHER_GENDER_OPTIONS = [
  { value: 'not_specified', label: 'Не указан' },
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
] as const;

export function getGenderLabel(value: string | null | undefined): string {
  if (!value) {
    return 'Не указан';
  }

  return GENDER_LABELS[value] ?? value;
}

export function getTeacherGenderFormValue(value: string | null | undefined): string {
  if (!value) {
    return 'not_specified';
  }

  if (value === 'Мужской') {
    return 'male';
  }

  if (value === 'Женский') {
    return 'female';
  }

  if (value === 'Не указан') {
    return 'not_specified';
  }

  return value;
}
