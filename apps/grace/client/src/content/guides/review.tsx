import type { Guide, GuideTFn } from './types';

export function buildReviewGuide(t: GuideTFn): Guide {
  return {
    id: 'review',
    title: t('guide.review.title'),
    subtitle: t('guide.review.subtitle'),
    steps: [
      {
        title: t('guide.review.s1.title'),
        body: <p>{t('guide.review.s1.p1')}</p>,
      },
      {
        title: t('guide.review.s2.title'),
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('guide.review.s2.pending')}</li>
            <li>{t('guide.review.s2.inReview')}</li>
            <li>{t('guide.review.s2.revisionRequested')}</li>
            <li>{t('guide.review.s2.rejected')}</li>
            <li>{t('guide.review.s2.approved')}</li>
          </ul>
        ),
      },
      {
        title: t('guide.review.s3.title'),
        body: <p>{t('guide.review.s3.p1')}</p>,
      },
    ],
  };
}
