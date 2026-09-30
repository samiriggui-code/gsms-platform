import { AlertCircle, CheckCircle2, Info, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useNotificationStore,
  type NotificationVariant,
} from "@/stores/notificationStore";

export function NotificationToaster() {
  const { t } = useTranslation();
  const toasts = useNotificationStore((state) => state.toasts);
  const dismissToast = useNotificationStore((state) => state.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.97)] p-4 shadow-[0_18px_50px_-28px_rgba(10,18,35,0.45)]"
        >
          <ToastIcon variant={toast.variant} />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-[hsl(var(--foreground))]">{toast.title}</p>
            {toast.description ? (
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            aria-label={t("notifications.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ variant }: { variant: NotificationVariant }) {
  const className = "mt-0.5 h-5 w-5 shrink-0";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={`${className} text-emerald-500`} />;
    case "warning":
      return <Sparkles className={`${className} text-amber-500`} />;
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
