import type { Guide, GuideTFn } from './types';

export function buildSurveysGuide(t: GuideTFn): Guide {
  return {
    id: 'surveys',
    title: t('guide.surveys.title'),
    subtitle: t('guide.surveys.subtitle'),
    steps: [
      {
        title: t('guide.surveys.s1.title'),
        body: (
          <>
            <p>{t('guide.surveys.s1.p1')}</p>
            <p>{t('guide.surveys.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.surveys.s2.title'),
        body: (
          <>
            <p>{t('guide.surveys.s2.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.surveys.s2.physical')}</li>
              <li>{t('guide.surveys.s2.remoteTech')}</li>
              <li>{t('guide.surveys.s2.docReview')}</li>
              <li>{t('guide.surveys.s2.hybrid')}</li>
              <li>{t('guide.surveys.s2.custom')}</li>
            </ul>
            <p>{t('guide.surveys.s2.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.surveys.s3.title'),
        body: <p>{t('guide.surveys.s3.p1')}</p>,
      },
    ],
  };
}
