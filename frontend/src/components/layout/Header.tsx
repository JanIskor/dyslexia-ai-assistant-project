import Image from 'next/image';
import React, { type ReactNode } from 'react';

interface HeaderProps {
  title?: string;
  rightContent?: ReactNode;
  variant?: 'default' | 'dashboard';
}

export function Header({
  title,
  rightContent,
  variant = 'default',
}: HeaderProps) {
  const brand = (
    <div className="flex items-center gap-3">
      <Image
        src="/image.png"
        alt="Логотип Dyslexious"
        width={56}
        height={56}
        className="h-12 w-12 rounded-full border border-orange-200 bg-white object-cover shadow-sm sm:h-14 sm:w-14"
      />
      <span className="text-2xl font-semibold tracking-tight text-stone-700 sm:text-4xl">
        Dyslexious
      </span>
    </div>
  );

  if (variant === 'dashboard') {
    return (
      <header className="rounded-[28px] border border-orange-100/80 bg-white/75 px-5 py-4 shadow-[0_12px_40px_rgba(221,156,130,0.12)] backdrop-blur sm:px-7">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex justify-start">{brand}</div>
          <div className="text-center text-2xl font-medium text-stone-700">{title}</div>
          <div className="flex justify-end">{rightContent}</div>
        </div>
      </header>
    );
  }

  return (
    <header className="absolute left-4 top-4 sm:left-8 sm:top-8">
      {brand}
    </header>
  );
}
