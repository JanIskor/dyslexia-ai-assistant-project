import React from 'react';

export function Header() {
  return (
    <header className="absolute left-4 top-4 flex items-center gap-3 sm:left-8 sm:top-8">
      <img
        src="/image.png"
        alt="Логотип Dyslexious"
        className="h-14 w-14 rounded-full border border-orange-200 bg-white object-cover shadow-sm"
      />
      <span className="text-3xl font-extrabold tracking-tight text-orange-600 sm:text-4xl">Dyslexious</span>
    </header>
  );
}