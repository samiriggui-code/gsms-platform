import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, LayoutGrid } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '../ui/sheet';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';
import {
  SETTINGS_ENTRY,
  PROJECT_NAV_GROUPS,
  isProjectScopePath,
  projectPath,
} from '../../navigation/nav-config';
import {
  HOME_PATH,
  APP_SECTION_CARDS,
  projectHubPath,
} from '../../navigation/hub-config';
import { useProjectStore } from '../../store/useProjectStore';
import { getProjectId } from '../../lib/projectUtils';

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const project = useProjectStore((s) => s.project);
  const projectId = getProjectId(project);
  const inProject = isProjectScopePath(location.pathname);
  const onHome =
    location.pathname === HOME_PATH || location.pathname === '/app' || location.pathname === '/app/';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.expandSidebar')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="border-b border-border pb-3">
          <SheetTitle>{inProject ? (project?.name ?? t('app.name')) : t('app.name')}</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
          {inProject && projectId ? (
            <>
              <SheetClose asChild>
                <NavLink
                  to={projectHubPath(projectId)}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-normal',
                      isActive
                        ? 'bg-accent-subtle text-accent'
                        : 'text-text-tertiary hover:bg-surface-hover',
                    )
                  }
                >
                  <LayoutGrid className="size-4" />
                  Domaines
                </NavLink>
              </SheetClose>
              {PROJECT_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.id}>
                    <NavLink
                      to={projectPath(projectId, item.path)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-normal',
                          isActive
                            ? 'bg-accent-subtle text-accent'
                            : 'text-text-tertiary hover:bg-surface-hover',
                        )
                      }
                    >
                      <Icon className="size-4" />
                      {t(item.labelKey)}
                    </NavLink>
                  </SheetClose>
                );
              })}
            </>
          ) : (
            <>
              <SheetClose asChild>
                <NavLink
                  to={HOME_PATH}
                  end
                  className={() =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-normal',
                      onHome
                        ? 'bg-accent-subtle text-accent'
                        : 'text-text-tertiary hover:bg-surface-hover',
                    )
                  }
                >
                  <LayoutGrid className="size-4" />
                  Accueil
                </NavLink>
              </SheetClose>
              {APP_SECTION_CARDS.map((card) => {
                const Icon = card.icon;
                const active =
                  location.pathname === card.path ||
                  location.pathname.startsWith(`${card.path}/`);
                return (
                  <SheetClose asChild key={card.id}>
                    <NavLink
                      to={card.path}
                      className={() =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-normal',
                          active
                            ? 'bg-accent-subtle text-accent'
                            : 'text-text-tertiary hover:bg-surface-hover',
                        )
                      }
                    >
                      <Icon className="size-4" />
                      {card.title}
                    </NavLink>
                  </SheetClose>
                );
              })}
            </>
          )}
        </nav>

        {inProject ? (
          <div className="border-t border-border p-2.5">
            <SheetClose asChild>
              <Link
                to={SETTINGS_ENTRY.path}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-normal text-text-tertiary hover:bg-surface-hover"
              >
                <SETTINGS_ENTRY.icon className="size-4" />
                {t(SETTINGS_ENTRY.labelKey)}
              </Link>
            </SheetClose>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
