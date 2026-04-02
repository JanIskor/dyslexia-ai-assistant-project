import React from 'react';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}

export function AuthLayout({ title, description, children, footnote }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-linear-to-br from-rose-50 via-orange-50 to-amber-50 px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
        {/* верхний блок вне карточки */}
        <header className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center gap-3">
            <img
              src="/image.png"
              alt="Логотип Dyslexious"
              className="h-10 w-10 rounded-full border border-orange-200 bg-white object-cover"
            />
            <span className="text-2xl font-extrabold tracking-tight text-orange-600 sm:text-3xl">Dyslexious</span>
          </div>
          <p className="text-base font-semibold text-slate-700">Учиться может каждый — только дайте возможность!</p>
          <p className="mt-1 text-sm text-slate-500">ИИ-ассистент для школьников с дислексией</p>
        </header>

        {/* карточка с формой */}
        <div className="w-full max-w-md rounded-[30px] border border-slate-200/50 bg-white/90 p-6 shadow-[0_20px_40px_rgba(148,163,184,0.25)] backdrop-blur-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>

          {children}

          {footnote && <div className="mt-6 text-center text-sm text-slate-500">{footnote}</div>}

          <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} AI-дислексия</div>
        </div>
      </div>
    </main>
  );
}
