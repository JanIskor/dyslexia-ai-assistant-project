'use client';

import { Search } from 'lucide-react';

interface DirectorySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export function DirectorySearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: DirectorySearchBarProps) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] border border-orange-100/80 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(221,156,130,0.08)]">
      <Search className="h-5 w-5 shrink-0 text-orange-300" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-base text-stone-700 outline-none placeholder:text-stone-300 sm:text-lg"
        aria-label={ariaLabel}
      />
    </label>
  );
}
