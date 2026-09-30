import type { Guide, GuideTFn } from './types';

export function buildTemplatesGuide(t: GuideTFn): Guide {
  return {
    id: 'templates',
    title: t('guide.templates.title'),
    subtitle: t('guide.templates.subtitle'),
    steps: [
      {
        title: t('guide.templates.s1.title'),
        body: <p>{t('guide.templates.s1.p1')}</p>,
      },
      {
        title: t('guide.templates.s2.title'),
        body: (
          <>
            <p>{t('guide.templates.s2.p1')}</p>
            <p>{t('guide.templates.s2.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.templates.s3.title'),
        body: (
          <>
            <p>{t('guide.templates.s3.p1')}</p>
            <p>{t('guide.templates.s3.p2')}</p>
          </>
        ),
      },
    ],
  };
}
