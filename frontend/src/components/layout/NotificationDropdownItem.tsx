'use client';

import type { NotificationItem } from '@/lib/notificationsApi';

interface NotificationDropdownItemProps {
  notification: NotificationItem;
  formattedDate: string;
  onOpen: () => void;
  onMarkAsRead: () => void;
}

export function NotificationDropdownItem({
  notification,
  formattedDate,
  onOpen,
  onMarkAsRead,
}: NotificationDropdownItemProps) {
  return (
    <div className="rounded-[20px] border border-orange-200 bg-orange-50/70 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-2xl text-left outline-none transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-orange-200"
        >
          <p className="text-sm font-medium text-stone-700">{notification.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">{notification.message}</p>
          <p className="mt-2 text-xs text-stone-400">{formattedDate}</p>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMarkAsRead();
          }}
          className="shrink-0 rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-50"
        >
          Прочитать
        </button>
      </div>
    </div>
  );
}
