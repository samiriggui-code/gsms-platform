import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AppBreadcrumb } from './AppBreadcrumb';
import { isProjectScopePath } from '../../navigation/nav-config';
import { cn } from '../../lib/cn';

export function ShellLayout({
  projectSelect,
  loading,
  bleed = false,
  children,
}: {
  projectSelect?: ReactNode;
  loading?: boolean;
  /** Contenu plein cadre (wizard) — pas de padding / breadcrumb */
  bleed?: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const select = isProjectScopePath(location.pathname) ? projectSelect : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary">
      <Topbar />
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar projectSelect={select} />
        <main
          className={cn(
            'min-h-0 min-w-0 flex-1 overflow-x-hidden',
            bleed ? 'flex flex-col' : 'px-4 py-6 sm:px-6 lg:px-8',
          )}
        >
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <>
              {!bleed ? <AppBreadcrumb /> : null}
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
