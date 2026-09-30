import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useNotificationStore,
  type NotificationVariant,
} from "@/stores/notificationStore";

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function NotificationCenter({ open, onClose, children }: NotificationCenterProps) {
  const { t, i18n } = useTranslation();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-end bg-black/10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="m-4 w-full max-w-md overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.97)] shadow-[0_24px_70px_-34px_rgba(10,18,35,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[hsl(var(--border)/0.7)] px-4 py-3">{children}</div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("notifications.empty")}</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--muted)/0.35)] px-3 py-2.5"
              >
                <IconForVariant variant={item.variant} />
                <div className="flex-1 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[hsl(var(--foreground))]">{item.title}</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {new Date(item.timestamp).toLocaleTimeString(i18n.language, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.description}</p>
                  ) : null}
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {!item.read ? (
                      <button
                        type="button"
                        className="rounded-md border border-[hsl(var(--border))] px-2 py-1 font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
                        onClick={() => markAsRead(item.id)}
                      >
                        {t("notifications.markAsRead")}
                      </button>
                    ) : null}
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="font-medium text-[hsl(var(--primary))] underline-offset-2 hover:underline"
                        onClick={onClose}
                      >
                        {t("notifications.view")}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  onClick={() => removeNotification(item.id)}
                  aria-label={t("notifications.remove")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconForVariant({ variant }: { variant: NotificationVariant }) {
  const className = "mt-0.5 h-4 w-4 shrink-0";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={`${className} text-emerald-500`} />;
    case "warning":
      return <AlertCircle className={`${className} text-amber-500`} />;
    case "error":
      return <AlertCircle className={`${className} text-red-500`} />;
    case "info":
      return <Info className={`${className} text-[hsl(var(--primary))]`} />;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
