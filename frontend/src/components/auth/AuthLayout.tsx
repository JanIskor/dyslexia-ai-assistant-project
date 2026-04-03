import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}

export function AuthLayout({ title, description, children, footnote }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen bg-linear-to-br from-rose-50 via-orange-50 to-amber-50 px-4 pt-20 pb-6 sm:px-8 sm:pt-24">
      <Header />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10">
        <section className="w-full text-center">
          <p className="text-3xl font-semibold text-amber-700/90 leading-snug sm:text-5xl">
            Учиться может каждый - только дайте возможность!
          </p>
          <p className="mt-4 text-xl text-amber-700/40 sm:text-2xl">
            ИИ-ассистент для школьников с дислексией
          </p>
        </section>

        <section className="w-full flex justify-center">
          <div className="w-full max-w-lg scale-[1.08] rounded-[36px] border border-slate-200/40 bg-white/90 p-8 shadow-[0_24px_48px_rgba(148,163,184,0.25)] backdrop-blur-sm sm:p-10">
            <div className="mb-7 text-center">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="mt-3 text-base text-slate-600 sm:text-lg">{description}</p>
            </div>

            {children}

            {footnote && <div className="mt-8 text-center text-base text-slate-500">{footnote}</div>}
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
