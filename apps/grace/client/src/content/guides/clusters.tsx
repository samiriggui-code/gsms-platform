import type { Guide, GuideTFn } from './types';

export function buildClustersGuide(t: GuideTFn): Guide {
  return {
    id: 'clusters',
    title: t('guide.clusters.title'),
    subtitle: t('guide.clusters.subtitle'),
    steps: [
      {
        title: t('guide.clusters.s1.title'),
        body: (
          <>
            <p>{t('guide.clusters.s1.p1')}</p>
            <p>{t('guide.clusters.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.clusters.s2.title'),
        body: (
          <>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{t('guide.clusters.s2.operational')}</li>
              <li>{t('guide.clusters.s2.spatial')}</li>
              <li>{t('guide.clusters.s2.logical')}</li>
              <li>{t('guide.clusters.s2.temporal')}</li>
            </ul>
            <p>{t('guide.clusters.s2.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.clusters.s3.title'),
        body: (
          <>
            <p>{t('guide.clusters.s3.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.clusters.s3.highest')}</li>
              <li>{t('guide.clusters.s3.average')}</li>
              <li>{t('guide.clusters.s3.custom')}</li>
            </ul>
          </>
        ),
      },
      {
        title: t('guide.clusters.s4.title'),
        body: (
          <>
            <p>{t('guide.clusters.s4.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.clusters.s4.cascadeDown')}</li>
              <li>{t('guide.clusters.s4.cascadeUp')}</li>
              <li>{t('guide.clusters.s4.bidirectional')}</li>
              <li>{t('guide.clusters.s4.none')}</li>
            </ul>
            <p>{t('guide.clusters.s4.outro')}</p>
          </>
        ),
      },
    ],
  };
}
