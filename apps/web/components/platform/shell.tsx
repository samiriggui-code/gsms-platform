"use client";

import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import { PLATFORM_NAV, currentSection, isActive } from "./nav";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";

export type ShellProps = {
  user: { name: string; email: string } | null;
  organizationName: string | null;
  workspaces: WorkspaceOption[];
  currentWorkspaceId: string | null;
  core: { ok: boolean; message?: string };
  children: ReactNode;
};

/** Coque responsive de /app — inspirée du Shell de l'espace client (sidebar + topbar + tiroir mobile). */
export function Shell({ user, organizationName, workspaces, currentWorkspaceId, core, children }: ShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const section = currentSection(pathname);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="min-h-svh bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-border/70 bg-surface-subtle/80 backdrop-blur-xl lg:flex">
        <SidebarContent pathname={pathname} organizationName={organizationName} />
      </aside>

      {/* Tiroir mobile */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" tabIndex={-1} onClick={closeDrawer} className="absolute inset-0 bg-overlay backdrop-blur-sm" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col border-r border-border bg-background shadow-2xl"
          >
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Fermer le menu"
              className="absolute right-3 top-3.5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
            <SidebarContent pathname={pathname} organizationName={organizationName} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-svh flex-col lg:pl-[256px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
            className="inline-flex size-9 items-center justify-center rounded-[10px] text-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-4" aria-hidden />
          </button>

          <p className="hidden min-w-0 truncate text-[13px] font-semibold tracking-[-0.01em] md:block">{section?.label ?? "Plateforme"}</p>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <WorkspaceSwitcher workspaces={workspaces} currentId={currentWorkspaceId} disabled={!core.ok} />
            <CoreStatus ok={core.ok} message={core.message} />
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  organizationName,
  onNavigate,
}: {
  pathname: string;
  organizationName: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/app" onClick={onNavigate} aria-label="GSMS — tableau de bord" className="rounded-[10px]">
          <Wordmark />
        </Link>
      </div>
      {organizationName ? (
        <p className="mx-4 mb-2 truncate rounded-[10px] border border-border/70 bg-background px-3 py-2 text-[12px] font-semibold">
          {organizationName}
        </p>
      ) : null}
      <nav aria-label="Navigation de la plateforme" className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="flex flex-col gap-0.5">
          {PLATFORM_NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active && pathname === item.href ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active && "text-primary")} strokeWidth={1.8} aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
                {item.children ? (
                  <ul className="mt-0.5 mb-1 ml-[22px] flex flex-col gap-0.5 border-l border-border/80 pl-2.5">
                    {item.children.map((child) => {
                      const childActive = isActive(pathname, child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "block truncate rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                              childActive ? "bg-background font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function CoreStatus({ ok, message }: { ok: boolean; message?: string }) {
  return (
    <span
      role="status"
      title={ok ? "Core connecté" : (message ?? "Core indisponible")}
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] sm:inline-flex",
        ok ? "border-border text-muted-foreground" : "border-destructive/30 bg-destructive/[0.06] text-destructive",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", ok ? "bg-success" : "bg-destructive")} />
      {ok ? "Core" : "Core indisponible"}
    </span>
  );
}

function UserMenu({ user }: { user: ShellProps["user"] }) {
  const initials = (user?.name ?? user?.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <details className="group relative">
      <summary
        aria-label="Menu du compte"
        className="flex cursor-pointer list-none items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <span className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">{initials}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 rounded-[14px] border border-border bg-popover p-2 shadow-xl">
        <div className="border-b border-border px-2.5 pt-1.5 pb-2.5">
          <p className="truncate text-[13px] font-semibold">{user?.name ?? "Compte"}</p>
          <p className="truncate text-[12px] text-muted-foreground">{user?.email ?? "Profil non chargé (Core indisponible)"}</p>
        </div>
        <Link href="/app/settings" className="mt-1 block rounded-lg px-2.5 py-2 text-[13px] hover:bg-muted">
          Paramètres
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive hover:bg-destructive/[0.06]">
            <LogOut className="size-3.5" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </div>
    </details>
  );
}
