'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, SendHorizontal } from 'lucide-react';
import { sendTeacherAiAssistantMessage } from '@/lib/teacherAiAssistantApi';

type TeacherAiAssistantMessageRole = 'user' | 'assistant';

interface TeacherAiAssistantMessage {
  id: string;
  role: TeacherAiAssistantMessageRole;
  content: string;
}

interface TeacherAiAssistantSectionProps {
  accessToken: string;
}

const EMPTY_STATE_TEXT = 'Введите текст, который нужно адаптировать';

export function TeacherAiAssistantSection({ accessToken }: TeacherAiAssistantSectionProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState<TeacherAiAssistantMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = chatViewportRef.current;

    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, isSubmitting]);

  const handleSubmit = async () => {
    const trimmedMessage = draftMessage.trim();

    if (!trimmedMessage || isSubmitting) {
      return;
    }

    const userMessage: TeacherAiAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraftMessage('');
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await sendTeacherAiAssistantMessage(accessToken, {
        message: trimmedMessage,
      });

      const assistantMessage: TeacherAiAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не удалось получить ответ ассистента.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      data-testid="teacher-ai-assistant-section"
      className="flex min-h-[640px] flex-col rounded-[30px] border border-orange-100/80 bg-white/92 shadow-[0_18px_50px_rgba(221,156,130,0.12)]"
    >
      <header className="border-b border-orange-100/80 px-5 py-5 sm:px-7">
        <h2 className="text-2xl font-medium text-stone-700 sm:text-3xl">ИИ-ассистент</h2>
        <p className="mt-2 text-sm text-stone-500 sm:text-base">
          Вставьте учебный текст и получите ответ в формате диалога.
        </p>
      </header>

      <div
        ref={chatViewportRef}
        data-testid="teacher-ai-assistant-chat"
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
      >
        {messages.length === 0 ? (
          <div
            data-testid="teacher-ai-assistant-empty-state"
            className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-orange-200 bg-orange-50/40 px-6 text-center text-base text-stone-500 sm:text-lg"
          >
            {EMPTY_STATE_TEXT}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isUserMessage = message.role === 'user';

              return (
                <div
                  key={message.id}
                  className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <article
                    data-testid={`teacher-ai-assistant-message-${message.role}`}
                    className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm sm:px-5 sm:py-4 sm:text-base ${
                      isUserMessage
                        ? 'bg-orange-300 text-white'
                        : 'border border-orange-100 bg-orange-50/70 text-stone-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </article>
                </div>
              );
            })}

            {isSubmitting ? (
              <div className="flex justify-start">
                <div
                  data-testid="teacher-ai-assistant-loading"
                  className="inline-flex items-center gap-3 rounded-[24px] border border-orange-100 bg-orange-50/70 px-4 py-3 text-sm text-stone-500 sm:text-base"
                >
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Ассистент думает...</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-orange-100/80 bg-white/95 px-4 py-4 sm:px-6">
        {errorMessage ? (
          <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <div className="rounded-[26px] border border-orange-100 bg-orange-50/45 p-3 shadow-inner">
          <textarea
            data-testid="teacher-ai-assistant-input"
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Вставьте учебный текст для адаптации..."
            rows={4}
            className="min-h-[112px] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400 sm:text-base"
          />

          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || draftMessage.trim().length === 0}
              data-testid="teacher-ai-assistant-submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-300 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200 sm:px-5 sm:text-base"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              <span>Отправить</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
