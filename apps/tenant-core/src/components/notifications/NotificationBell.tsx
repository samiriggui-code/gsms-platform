import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "@/stores/notificationStore";
import { NotificationCenter } from "./NotificationCenter";

const DEMO_SEEDED_KEY = "tenant-core.notifications.demo-seeded";

export function NotificationBell() {
  const { t } = useTranslation();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DEMO_SEEDED_KEY)) return;
    sessionStorage.setItem(DEMO_SEEDED_KEY, "1");
    const now = Date.now();
    const seed = [
      {
        title: t("notifications.demoPieceTitle"),
        description: t("notifications.demoPieceDesc"),
        variant: "warning" as const,
        href: "/documents",
        timestamp: now - 12 * 60_000,
      },
      {
        title: t("notifications.demoQuoteTitle"),
        description: t("notifications.demoQuoteDesc"),
        variant: "info" as const,
        href: "/finance",
        timestamp: now - 55 * 60_000,
      },
      {
        title: t("notifications.demoMsgTitle"),
        description: t("notifications.demoMsgDesc"),
        variant: "success" as const,
        href: "/echanges",
        timestamp: now - 3 * 60 * 60_000,
      },
    ];
    for (const item of seed) {
      useNotificationStore.setState((state) => {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        return {
          notifications: [
            {
              id,
              title: item.title,
              description: item.description,
              variant: item.variant,
              href: item.href,
              timestamp: item.timestamp,
              read: false,
            },
            ...state.notifications,
          ],
        };
      });
    }
  }, [t]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        aria-label={t("notifications.title")}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <NotificationCenter open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {t("notifications.title")}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-40"
            onClick={() => {
              markAllAsRead();
              setIsOpen(false);
            }}
            disabled={!unreadCount}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.markAll")}
          </button>
        </div>
      </NotificationCenter>
    </div>
  );
}
