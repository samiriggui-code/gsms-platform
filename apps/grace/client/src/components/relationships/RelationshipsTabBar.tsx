import { Link, useLocation } from '@tanstack/react-router';
import { Network, LayoutGrid } from 'lucide-react';
import { useT } from '../../i18n';

// Segmented control for the /relationships pages. The graph is the
// canonical view; the matrix is a parallel lens optimised for spotting
// uncovered protected assets at a glance. Active tab is driven by URL
// pathname so back/forward buttons just work.

export function RelationshipsTabBar() {
  const t = useT();
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    {
      to: '/relationships',
      label: t('page.relationships.tabGraph'),
      icon: <Network size={12} />,
      title: t('page.relationships.tabGraphTip'),
    },
    {
      to: '/relationships/matrix',
      label: t('page.relationships.tabMatrix'),
      icon: <LayoutGrid size={12} />,
      title: t('page.relationships.tabMatrixTip'),
    },
  ] as const;

  return (
    <div className="border-b border-n-150 bg-white px-6 py-1.5 csmp-no-export">
      <div className="inline-flex items-center rounded-r1 border border-n-200 bg-white overflow-hidden">
        {tabs.map((tab, i) => {
          const active = path === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              // Preserve any active search params (e.g. ?isolate=…) so the
              // isolate-in-graph state carries across the Graph ↔ Matrix
              // tab toggle.
              search={(prev) => prev}
              title={tab.title}
              className={[
                'inline-flex items-center gap-1.5 h-7 px-3 text-[11.5px] font-medium transition-colors',
                active ? 'bg-a-50 text-a-800' : 'text-n-600 hover:bg-n-50',
                i > 0 ? 'border-l border-n-200' : '',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
