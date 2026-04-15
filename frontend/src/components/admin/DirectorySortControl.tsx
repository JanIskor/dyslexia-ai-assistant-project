'use client';

interface DirectorySortOption {
  value: string;
  label: string;
}

interface DirectorySortControlProps {
  value: string;
  onChange: (value: string) => void;
  options: DirectorySortOption[];
  ariaLabel: string;
}

export function DirectorySortControl({
  value,
  onChange,
  options,
  ariaLabel,
}: DirectorySortControlProps) {
  return (
    <label className="inline-flex h-[52px] min-w-[14rem] items-center rounded-[20px] border border-orange-100/80 bg-white px-4 text-sm text-stone-600 shadow-[0_10px_30px_rgba(221,156,130,0.08)] sm:text-base">
      <span className="mr-3 shrink-0 text-stone-400">Сортировка</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="w-full bg-transparent text-stone-700 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
