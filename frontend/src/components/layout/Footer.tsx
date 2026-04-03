import React from 'react';

export function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 flex w-full items-center justify-center p-4 text-base text-slate-500 sm:p-6">
      © {new Date().getFullYear()} AI-дислексия
    </footer>
  );
}