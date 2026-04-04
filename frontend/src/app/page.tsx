import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-sky-50 via-white to-indigo-50 px-8 py-12">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          ИИ-ассистент для адаптации текстов для школьников с дислексией
        </h1>

        <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
          Веб-система для персонализированной адаптации учебных текстов обучающимся с дислексией.
          Помогает сделать чтение более комфортным и эффективным.
        </p>

        <Link href="/login" className="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-3 text-white font-semibold transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          Начать
        </Link>
      </div>
    </main>
  );
}
