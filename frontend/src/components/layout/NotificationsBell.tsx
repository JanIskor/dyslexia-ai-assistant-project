'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationDropdownItem } from '@/components/layout/NotificationDropdownItem';
import { getNotificationHref } from '@/lib/notificationRouting';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from '@/lib/notificationsApi';

function formatNotificationDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

export function NotificationsBell({ token }: { token: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const response = await getUnreadNotificationsCount(token);

        if (isMounted) {
          setUnreadCount(response.unread_count);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить уведомления.');
        }
      }
    };

    void loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [notificationsResponse, unreadCountResponse] = await Promise.all([
          getNotifications(token, { onlyUnread: true }),
          getUnreadNotificationsCount(token),
        ]);

        if (isMounted) {
          setNotifications(notificationsResponse.items);
          setUnreadCount(unreadCountResponse.unread_count);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить уведомления.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(token, notificationId);
      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.id !== notificationId)
      );
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось отметить уведомление прочитанным.');
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    setErrorMessage(null);

    try {
      await markNotificationAsRead(token, notification.id);
      setNotifications((currentNotifications) =>
        currentNotifications.filter((currentNotification) => currentNotification.id !== notification.id)
      );
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
      setIsOpen(false);

      const href = getNotificationHref(notification);
      if (href) {
        router.push(href);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось открыть уведомление.');
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    setErrorMessage(null);

    try {
      await markAllNotificationsAsRead(token);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось отметить уведомления прочитанными.');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  return (
    <div ref={containerRef} className="relative z-[110]">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="relative flex h-12 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-white/90 text-orange-300 shadow-[0_10px_25px_rgba(221,156,130,0.15)] transition hover:bg-orange-50"
        aria-label="Открыть уведомления"
        aria-expanded={isOpen}
      >
        <Bell className="h-6 w-6 stroke-[1.7]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-400 px-1.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,146,60,0.35)]">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-[130] mt-3 w-[22rem] rounded-[26px] border border-orange-100/80 bg-white/98 p-4 shadow-[0_20px_45px_rgba(221,156,130,0.18)] sm:w-[25rem]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-stone-700">Уведомления</h3>
              <p className="mt-1 text-sm text-stone-500">Непрочитанных: {unreadCount}</p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead || notifications.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              {isMarkingAllRead ? 'Отмечаем...' : 'Прочитать все'}
            </button>
          </div>

          <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-[20px] border border-orange-100 bg-orange-50/40 px-4 py-8 text-center text-sm text-stone-500">
                Загружаем уведомления...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[20px] border border-orange-100 bg-orange-50/40 px-4 py-8 text-center text-sm text-stone-500">
                Пока уведомлений нет.
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationDropdownItem
                  key={notification.id}
                  notification={notification}
                  formattedDate={formatNotificationDate(notification.created_at)}
                  onOpen={() => void handleNotificationClick(notification)}
                  onMarkAsRead={() => void handleMarkAsRead(notification.id)}
                />
              ))
            )}
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
