import type { Guide, GuideTFn } from './types';
import { SHAPE_CATEGORIES, PPS_FUNCTIONS } from '../../lib/csmp-types';

export function buildCountermeasuresGuide(t: GuideTFn): Guide {
  return {
    id: 'countermeasures',
    title: t('guide.countermeasures.title'),
    subtitle: t('guide.countermeasures.subtitle'),
    steps: [
      {
        title: t('guide.countermeasures.s1.title'),
        body: <p>{t('guide.countermeasures.s1.p1')}</p>,
      },
      {
        title: t('guide.countermeasures.s2.title'),
        body: (
          <>
            <p>{t('guide.countermeasures.s2.intro')}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {SHAPE_CATEGORIES.map((c) => (
                <li key={c}>
                  <span className="font-semibold text-n-800">
                    {t(`guide.countermeasures.shape.${c}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p>{t('guide.countermeasures.s2.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.countermeasures.s3.title'),
        body: (
          <>
            <p>{t('guide.countermeasures.s3.intro')}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {PPS_FUNCTIONS.map((f) => (
                <li key={f}>
                  <span className="font-semibold text-n-800">
                    {t(`guide.countermeasures.pps.${f}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p>{t('guide.countermeasures.s3.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.countermeasures.s4.title'),
        body: <p>{t('guide.countermeasures.s4.p1')}</p>,
      },
    ],
  };
}
