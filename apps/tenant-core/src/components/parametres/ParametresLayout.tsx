import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, MapPin, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

const SETTINGS_NAV = [
  { to: "/parametres/sites", labelKey: "settings.sites", icon: MapPin },
  { to: "/parametres/equipe", labelKey: "settings.team", icon: Users },
  { to: "/parametres/notifications", labelKey: "settings.notifications", icon: Bell },
] as const;

/** Sidebar interne réglages — pattern QAtrial SettingsLayout. */
export function ParametresLayout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden lg:flex-row lg:gap-6">
      <aside className="w-full shrink-0 lg:w-44">
        <h2 className="mb-2 text-[15px] font-semibold tracking-tight">
          {t("settings.title")}
        </h2>
        <p className="mb-3 text-[11px] leading-4 text-muted-foreground lg:mb-4">
          {t("settings.subtitle")}
        </p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
