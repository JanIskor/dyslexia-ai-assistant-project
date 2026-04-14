'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Save, UserRound } from 'lucide-react';

export const GENDER_OPTIONS = [
  { value: 'Мужской', label: 'Мужской' },
  { value: 'Женский', label: 'Женский' },
] as const;

type ProfileEditFieldType = 'text' | 'date' | 'email' | 'textarea' | 'select';
type ProfileEditBannerTone = 'neutral' | 'info' | 'success' | 'warning';

export interface ProfileEditFieldConfig {
  key: string;
  label: string;
  type: ProfileEditFieldType;
  placeholder?: string;
  colSpan?: 1 | 2;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface ProfileEditReadOnlyField {
  label: string;
  value: string;
}

interface ProfileEditFormProps<TValues extends object> {
  fields: ProfileEditFieldConfig[];
  values: TValues;
  isReadOnly: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  statusMessage: string | null;
  statusType: 'error' | 'success';
  bannerText: string;
  bannerTone?: ProfileEditBannerTone;
  onChange: (field: keyof TValues & string, value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  backButtonLabel?: string;
  onBack?: () => void;
  readOnlyFields?: ProfileEditReadOnlyField[];
  readOnlyFieldsTitle?: string;
  avatarUrl?: string | null;
  avatarAlt?: string;
  avatarButtonLabel?: string;
  isUploadingAvatar?: boolean;
  onAvatarUpload?: (file: File) => Promise<void>;
}

function getBannerClassName(tone: ProfileEditBannerTone): string {
  switch (tone) {
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    default:
      return 'border-stone-200 bg-stone-50 text-stone-600';
  }
}

function getFieldClassName(isReadOnly: boolean): string {
  return `w-full rounded-2xl border px-4 py-3 text-base text-stone-700 shadow-sm outline-none transition sm:text-lg ${
    isReadOnly
      ? 'border-orange-100 bg-stone-50 text-stone-500'
      : 'border-orange-200 bg-white focus:border-orange-300'
  }`;
}

export function ProfileEditForm<TValues extends object>({
  fields,
  values,
  isReadOnly,
  isSaving,
  isSubmitting,
  statusMessage,
  statusType,
  bannerText,
  bannerTone = 'neutral',
  onChange,
  onSave,
  onSubmit,
  backButtonLabel = 'Назад',
  onBack,
  readOnlyFields,
  readOnlyFieldsTitle,
  avatarUrl,
  avatarAlt = 'Аватар профиля',
  avatarButtonLabel = 'Сменить аватар',
  isUploadingAvatar = false,
  onAvatarUpload,
}: ProfileEditFormProps<TValues>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const displayedAvatarUrl = avatarPreviewUrl ?? avatarUrl;

  return (
    <section className="rounded-[30px] border border-orange-100/80 bg-white/92 px-4 py-6 shadow-[0_18px_50px_rgba(221,156,130,0.10)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-600 shadow-[0_10px_25px_rgba(221,156,130,0.10)] transition hover:bg-orange-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {backButtonLabel}
        </button>
      ) : null}

      <div className={`${onBack ? 'mt-6' : ''} space-y-6`}>
        <p className={`rounded-[22px] border px-4 py-3 text-sm sm:text-base ${getBannerClassName(bannerTone)}`}>
          {bannerText}
        </p>

        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-orange-100/70 bg-white/75 px-5 py-5 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-gradient-to-b from-orange-50 via-orange-100 to-orange-50 shadow-inner">
            {displayedAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayedAvatarUrl} alt={avatarAlt} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/75">
                <UserRound className="h-12 w-12 text-orange-300" />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file || !onAvatarUpload) {
                return;
              }

              const nextPreviewUrl = URL.createObjectURL(file);
              setAvatarPreviewUrl((currentValue) => {
                if (currentValue) {
                  URL.revokeObjectURL(currentValue);
                }
                return nextPreviewUrl;
              });

              try {
                await onAvatarUpload(file);
                setAvatarPreviewUrl((currentValue) => {
                  if (currentValue) {
                    URL.revokeObjectURL(currentValue);
                  }
                  return null;
                });
              } catch {
                setAvatarPreviewUrl((currentValue) => {
                  if (currentValue) {
                    URL.revokeObjectURL(currentValue);
                  }
                  return null;
                });
              } finally {
                event.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly || isUploadingAvatar || !onAvatarUpload}
            className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-stone-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isUploadingAvatar ? 'Загружаем...' : avatarButtonLabel}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => {
            const className = `${field.type === 'textarea' || field.colSpan === 2 ? 'sm:col-span-2' : ''}`;

            return (
              <label key={field.key} className={`block ${className}`.trim()}>
                <span className="mb-2 block text-sm font-medium text-stone-500 sm:text-base">
                  {field.label}
                </span>

                {field.type === 'textarea' ? (
                  <textarea
                    value={String(values[field.key as keyof TValues] ?? '')}
                    onChange={(event) => onChange(field.key as keyof TValues & string, event.target.value)}
                    readOnly={isReadOnly}
                    rows={4}
                    placeholder={field.placeholder}
                    className={getFieldClassName(isReadOnly)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={String(values[field.key as keyof TValues] ?? '')}
                    onChange={(event) => onChange(field.key as keyof TValues & string, event.target.value)}
                    disabled={isReadOnly}
                    className={getFieldClassName(isReadOnly)}
                  >
                    <option value="">Выберите значение</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={String(values[field.key as keyof TValues] ?? '')}
                    onChange={(event) => onChange(field.key as keyof TValues & string, event.target.value)}
                    readOnly={field.type === 'date' ? undefined : isReadOnly}
                    disabled={field.type === 'date' ? isReadOnly : undefined}
                    placeholder={field.placeholder}
                    className={getFieldClassName(isReadOnly)}
                  />
                )}
              </label>
            );
          })}
        </div>

        {readOnlyFields && readOnlyFields.length > 0 ? (
          <div className="rounded-[24px] border border-orange-100/70 bg-white/70 px-4 py-3 sm:px-5 sm:py-4">
            {readOnlyFieldsTitle ? (
              <h3 className="text-base font-medium text-stone-700 sm:text-lg">{readOnlyFieldsTitle}</h3>
            ) : null}
            <dl className={`${readOnlyFieldsTitle ? 'mt-4' : ''} divide-y divide-orange-100/80`}>
              {readOnlyFields.map((field) => (
                <div
                  key={field.label}
                  className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-sm font-medium text-stone-500 sm:text-base lg:text-xl">
                    {field.label}
                  </dt>
                  <dd className="text-sm text-stone-700 sm:text-base sm:text-right lg:text-xl">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {!isReadOnly ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-base font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSaving || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? 'Отправляем...' : 'Отправить на модерацию'}
            </button>
          </div>
        ) : null}

        {statusMessage ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm sm:text-base ${
              statusType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
