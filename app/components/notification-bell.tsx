import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Bell } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationItem[];
}

export function NotificationBell({
  unreadCount,
  notifications,
}: NotificationBellProps) {
  const [now, setNow] = useState(() => new Date());

  return (
    <PopoverPrimitive.Root
      onOpenChange={(open) => {
        if (open) setNow(new Date());
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span
              data-testid="notification-badge"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            >
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
          </div>
          {notifications.length === 0 ? (
            <div
              data-testid="notifications-empty"
              className="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              No notifications
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  data-testid="notification-item"
                  data-read={n.isRead ? "true" : "false"}
                  className={cn(
                    "border-b border-border px-4 py-3 last:border-b-0",
                    n.isRead ? "bg-transparent" : "bg-accent/40"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm",
                          n.isRead ? "font-normal" : "font-semibold"
                        )}
                      >
                        {n.title}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {n.message}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {formatRelativeTime(n.createdAt, now)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
