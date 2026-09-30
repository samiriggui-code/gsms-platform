import { Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { InstallAppToast } from './InstallAppToast';
import { NotificationBell } from './NotificationBell';
import { HeaderControls } from './HeaderControls';
import { UserMenu } from './UserMenu';
import { GuideOverlay } from '../guide/GuideOverlay';
import { GuideTrigger } from '../guide/GuideTrigger';
import { FirstVisitGate } from '../guide/FirstVisitGate';
import { AssetDetailDrawer } from '../AssetDetailDrawer';
import { MobileNotSupportedOverlay } from './MobileNotSupportedOverlay';
import { useT } from '../../i18n';

export function ShellLayout() {
  const t = useT();
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <OfflineBanner />
      <div className="flex-1 flex min-h-0 overflow-hidden bg-muted/40">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-end gap-1 border-b border-border/80 bg-card/90 px-3 backdrop-blur">
            <HeaderControls />
            <GuideTrigger />
            <NotificationBell />
            <div className="w-px h-5 bg-border mx-0.5" aria-hidden />
            <UserMenu />
          </header>
          <main className="relative min-h-0 flex-1 overflow-y-auto bg-background">
            <Suspense
              fallback={
                <div className="absolute inset-0 grid place-items-center text-[12.5px] text-n-500">
                  {t('common.loading')}
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <InstallAppToast />
      <FirstVisitGate />
      <GuideOverlay />
      <AssetDetailDrawer />
      <MobileNotSupportedOverlay />
    </div>
  );
}
