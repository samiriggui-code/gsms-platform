import type { Guide, GuideTFn } from './types';

export function buildSiteMapGuide(t: GuideTFn): Guide {
  return {
    id: 'site-map',
    title: t('guide.siteMap.title'),
    subtitle: t('guide.siteMap.subtitle'),
    steps: [
      {
        title: t('guide.siteMap.s1.title'),
        body: <p>{t('guide.siteMap.s1.p1')}</p>,
      },
      {
        title: t('guide.siteMap.s2.title'),
        body: (
          <p>
            {t('guide.siteMap.s2.p1Before')}{' '}
            <code className="text-[11.5px] font-mono bg-n-100 px-1 rounded-r1">
              ?siteId=…
            </code>{' '}
            {t('guide.siteMap.s2.p1After')}
          </p>
        ),
      },
      {
        title: t('guide.siteMap.s3.title'),
        body: <p>{t('guide.siteMap.s3.p1')}</p>,
      },
    ],
  };
}
