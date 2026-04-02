import React from 'react';

interface AuthFieldProps {
  label: string;
  type?: string;
  name: string;
  value: string | boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  autoComplete?: string;
  children?: React.ReactNode;
}

export function AuthField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  icon,
  error,
  autoComplete,
  children,
}: AuthFieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-orange-500">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${
            icon ? 'pl-11' : 'pl-3'
          } ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
        />
        {children}
      </div>
      {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
