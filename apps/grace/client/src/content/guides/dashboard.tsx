import type { Guide, GuideTFn } from './types';

export function buildDashboardGuide(t: GuideTFn): Guide {
  return {
    id: 'dashboard',
    title: t('guide.dashboard.title'),
    subtitle: t('guide.dashboard.subtitle'),
    steps: [
      {
        title: t('guide.dashboard.s1.title'),
        body: (
          <>
            <p>{t('guide.dashboard.s1.p1')}</p>
            <p>{t('guide.dashboard.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.dashboard.s2.title'),
        body: (
          <>
            <p>{t('guide.dashboard.s2.p1')}</p>
            <p>{t('guide.dashboard.s2.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.dashboard.s3.title'),
        body: <p>{t('guide.dashboard.s3.p1')}</p>,
      },
    ],
  };
}
