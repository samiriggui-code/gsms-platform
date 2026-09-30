import { useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronsUpDown,
  Command,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Plus,
  ScanText,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell, NotificationToaster } from "@/components/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadDialog } from "@/components/upload/UploadDialog";
import { UserAvatar, readStoredAvatar } from "@/components/UserAvatar";
import type { MeResponse } from "@/lib/api";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { roleLabel } from "@/lib/roles";
import { useUploadStore } from "@/stores/uploadStore";

/** Nav calquée sur compliance-desk AppShell: PRIMARY + SECONDARY */
const PRIMARY_NAV = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/prestations", labelKey: "nav.prestations", icon: FolderKanban },
  { to: "/documents", labelKey: "nav.documents", icon: FileText },
  { to: "/echanges", labelKey: "nav.echanges", icon: MessageSquare },
  { to: "/finance", labelKey: "nav.finance", icon: Receipt },
] as const;

const SECONDARY_NAV = [
  { to: "/profil", labelKey: "nav.profil", icon: UserRound },
  { to: "/parametres", labelKey: "nav.parametres", icon: Settings },
] as const;

const PAGE_KEYS: Record<string, { title: string; description: string }> = {
  "/": { title: "pages.home.title", description: "pages.home.description" },
  "/prestations": {
    title: "pages.prestations.title",
    description: "pages.prestations.description",
  },
  "/documents": {
    title: "pages.documents.title",
    description: "pages.documents.description",
  },
  "/echanges": {
    title: "pages.echanges.title",
    description: "pages.echanges.description",
  },
  "/finance": {
    title: "pages.finance.title",
    description: "pages.finance.description",
  },
  "/profil": {
    title: "pages.profil.title",
    description: "pages.profil.description",
  },
  "/parametres": {
    title: "pages.parametres.title",
    description: "pages.parametres.description",
  },
};

function SidebarLink({
  to,
  label,
  icon: Icon,
  exact,
  collapsed,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      title={label}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
        collapsed && "lg:justify-center lg:px-2",
        active
          ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm ring-1 ring-[hsl(var(--border)/0.7)]"
          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.7)] hover:text-[hsl(var(--foreground))]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
      <span className={cn(collapsed && "lg:hidden")}>{label}</span>
    </Link>
  );
}

export function Shell({
  me,
  onWorkspaceChange,
}: {
  me: MeResponse;
  onWorkspaceChange: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const openUpload = useUploadStore((s) => s.openUpload);
  const multi = me.workspaces.length > 1;
  const orgInitials = me.organization.name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const page = useMemo(() => {
    if (pathname.startsWith("/prestations/") && pathname !== "/prestations") {
      return {
        title: t("pages.prestationDetail.title"),
        description: t("pages.prestationDetail.description"),
      };
    }
    if (pathname.startsWith("/finance/") && pathname !== "/finance") {
      return {
        title: t("pages.financeDetail.title"),
        description: t("pages.financeDetail.description"),
      };
    }
    const keys = pathname.startsWith("/parametres")
      ? PAGE_KEYS["/parametres"]!
      : (PAGE_KEYS[pathname] ?? PAGE_KEYS["/"]!);
    return { title: t(keys.title), description: t(keys.description) };
  }, [pathname, t]);

  function isActive(to: string, exact?: boolean) {
    if (exact) return pathname === to;
    if (to === "/parametres") return pathname === to || pathname.startsWith(`${to}/`);
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  async function onSwitch(workspaceId: string) {
    await api.switchWorkspace(workspaceId);
    await onWorkspaceChange();
  }

  async function onLogout() {
    await api.logout();
    void navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/0.2)] backdrop-blur-sm lg:hidden"
          aria-label={t("nav.collapseSidebar")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col overflow-x-hidden overflow-y-auto border-r border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface-subtle)/0.8)] px-3 py-3 backdrop-blur-xl transition-[width,transform] duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[72px]" : "lg:w-[248px]",
        )}
      >
        {/* Logo + collapse — comme compliance-desk */}
        <div
          className={cn(
            "flex h-11 items-center justify-between px-2",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Link
            to="/"
            className={cn(
              "group inline-flex items-center gap-2.5 text-[hsl(var(--foreground))] no-underline",
              collapsed && "lg:hidden",
            )}
            aria-label="GSMS"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
              <ScanText className="h-[17px] w-[17px]" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.025em]">
              {t("app.name")}{" "}
              <span className="text-[hsl(var(--muted-foreground))]">{t("app.client")}</span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] lg:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Workspace switcher */}
        <div
          className={cn(
            "mt-3 flex w-full items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background))] px-3 py-2.5 text-left shadow-sm",
            collapsed && "lg:justify-center lg:px-2",
          )}
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--foreground))] text-[10px] font-semibold text-[hsl(var(--background))]">
            {orgInitials}
          </span>
          <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <span className="block truncate text-xs font-semibold">
              {me.organization.name}
            </span>
            <span className="block text-[10px] text-[hsl(var(--muted-foreground))]">
              {me.workspace?.label ?? me.workspace?.name ?? t("nav.site")}
            </span>
          </span>
          {multi ? (
            <select
              className={cn(
                "max-w-[5rem] truncate border-0 bg-transparent text-[10px] text-[hsl(var(--muted-foreground))] outline-none",
                collapsed && "lg:hidden",
              )}
              value={me.workspace?.id ?? ""}
              onChange={(e) => void onSwitch(e.target.value)}
              aria-label={t("nav.switchSite")}
            >
              {me.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <ChevronsUpDown
              className={cn(
                "h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]",
                collapsed && "lg:hidden",
              )}
            />
          )}
        </div>

        {/* CTA principal — ouvre le dialogue Téléverser (pattern DocuLens) */}
        <button
          type="button"
          title={t("nav.depositDocument")}
          onClick={() => {
            setMobileOpen(false);
            openUpload();
          }}
          className={cn(
            "mt-3 inline-flex w-full items-center justify-start gap-2 rounded-xl bg-[hsl(var(--foreground))] px-3 py-2.5 text-xs font-semibold text-[hsl(var(--background))] transition hover:opacity-90",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Plus className="h-4 w-4" />
          <span className={cn(collapsed && "lg:hidden")}>{t("nav.depositDocument")}</span>
        </button>

        <nav className="mt-6 space-y-1" aria-label={t("nav.mainNav")}>
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={t(item.labelKey)}
              icon={item.icon}
              exact={"exact" in item ? item.exact : false}
              collapsed={collapsed}
              active={isActive(item.to, "exact" in item ? item.exact : false)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div
          className={cn(
            "mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground)/0.6)]",
            collapsed && "lg:hidden",
          )}
        >
          {t("nav.collections")}
        </div>
        <nav className="mt-2 space-y-0.5">
          {me.workspaces.map((w, index) => (
            <button
              key={w.id}
              type="button"
              title={w.name}
              onClick={() => void onSwitch(w.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-[hsl(var(--background))] hover:text-[hsl(var(--foreground))]",
                w.id === me.workspace?.id
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))]",
                collapsed && "lg:justify-center lg:px-2",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-[3px]",
                  index % 3 === 0
                    ? "bg-blue-500"
                    : index % 3 === 1
                      ? "bg-emerald-500"
                      : "bg-amber-400",
                )}
              />
              <span className={cn(collapsed && "lg:hidden")}>{w.name}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-[hsl(var(--border)/0.7)] pt-3">
          {SECONDARY_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={t(item.labelKey)}
              icon={item.icon}
              collapsed={collapsed}
              active={isActive(item.to)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <div
            className={cn(
              "mt-3 rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background))] p-3",
              collapsed && "lg:hidden",
            )}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold">{t("nav.siteSpace")}</span>
              <span className="text-[hsl(var(--muted-foreground))]">62%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div className="h-full w-[62%] rounded-full bg-[hsl(var(--primary))]" />
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">
              {t("nav.sitesActive", {
                name: me.workspace?.name ?? "—",
                count: me.workspaces.length,
              })}
            </p>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-300",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]",
        )}
      >
        {/* Header compact — pas d’Upload (sidebar « Déposer » suffit) */}
        <header className="sticky top-0 z-30 border-b border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.8)] backdrop-blur-xl">
          <div className="flex h-12 items-center gap-2 px-3 sm:px-5 lg:px-6">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface-subtle))] px-2.5 text-xs text-[hsl(var(--muted-foreground))] shadow-sm transition hover:border-[hsl(var(--muted-foreground)/0.3)] hover:bg-[hsl(var(--background))]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="truncate">{t("nav.searchSpace")}</span>
              <span className="ml-auto hidden items-center gap-0.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-0.5 font-mono text-[9px] sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <ThemeToggle />
              <NotificationBell />
              <LanguageSwitcher />
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--background)/0.8)] px-2 py-1 text-sm font-medium shadow-sm"
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <UserAvatar name={me.user.name} src={readStoredAvatar()} size="sm" className="h-6 w-6" />
                  <span className="hidden text-left leading-none md:block">
                    <span className="block text-xs font-semibold">{me.user.name}</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {roleLabel(me.role)}
                    </span>
                  </span>
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.95)] p-3 text-sm shadow-xl">
                    <div className="space-y-1 border-b border-[hsl(var(--border)/0.6)] pb-3">
                      <p className="text-sm font-semibold">{me.user.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {me.user.email}
                      </p>
                    </div>
                    <Link
                      to="/profil"
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserRound className="h-4 w-4" />
                      {t("nav.myProfile")}
                    </Link>
                    <Link
                      to="/parametres"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {t("nav.parametres")}
                    </Link>
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-500 hover:bg-[hsl(var(--muted))]"
                      onClick={() => void onLogout()}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3rem)] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[28px]">
                  {page.title}
                </h1>
                <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                  {page.description}
                </p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-subtle))] px-3 py-1.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))] sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("nav.operational", { name: me.workspace?.name ?? t("nav.site") })}
              </span>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationToaster />
      <UploadDialog />
    </div>
  );
}
