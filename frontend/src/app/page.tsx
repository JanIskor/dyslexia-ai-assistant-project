export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-8 py-12">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        {/* Заголовок */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          ИИ-ассистент для адаптации текстов для людей с дислексией
        </h1>

        {/* Подзаголовок */}
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
          Веб-система для персонализированной адаптации учебных текстов обучающимся с дислексией.
          Помогает сделать чтение более комфортным и эффективным.
        </p>

        {/* Кнопка */}
        <button className="mt-8 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">
          Начать
        </button>
      </div>
    </main>
  );
}
