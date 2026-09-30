import type { Guide, GuideTFn } from './types';
import type { TearStrategy, VulnerabilityRating } from '../../lib/csmp-types';

const STEP_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const;
const TEAR_ORDER: TearStrategy[] = ['REDUCE', 'TRANSFER', 'ACCEPT', 'ELIMINATE'];
const VULN_ORDER: VulnerabilityRating[] = ['STRONG', 'BASELINE', 'BARELY_ADEQUATE', 'INADEQUATE'];

export function buildAssessmentsGuide(t: GuideTFn): Guide {
  return {
    id: 'assessments',
    title: t('guide.assessments.title'),
    subtitle: t('guide.assessments.subtitle'),
    steps: [
      {
        title: t('guide.assessments.s1.title'),
        body: (
          <>
            <p>{t('guide.assessments.s1.p1')}</p>
            <p>{t('guide.assessments.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.assessments.s2.title'),
        body: (
          <>
            <p>{t('guide.assessments.s2.intro')}</p>
            <ol className="space-y-1.5">
              {STEP_KEYS.map((key, i) => (
                <li key={key} className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-n-500 tabular-nums w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <div>
                    <span className="font-semibold text-n-800">
                      {t(`assessment.steps.${key}`)}
                    </span>{' '}
                    <span className="text-n-500 text-[12px]">
                      — {t(`assessment.stepLong.${key}`)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ),
      },
      {
        title: t('guide.assessments.s3.title'),
        body: (
          <>
            <p>{t('guide.assessments.s3.step1')}</p>
            <p>{t('guide.assessments.s3.step2')}</p>
          </>
        ),
      },
      {
        title: t('guide.assessments.s4.title'),
        body: (
          <>
            <p>{t('guide.assessments.s4.step3')}</p>
            <p>{t('guide.assessments.s4.step4')}</p>
            <p>{t('guide.assessments.s4.step5')}</p>
          </>
        ),
      },
      {
        title: t('guide.assessments.s5.title'),
        body: (
          <>
            <p>{t('guide.assessments.s5.intro')}</p>
            <ul className="space-y-1">
              {VULN_ORDER.map((v) => (
                <li key={v}>
                  <span className="font-semibold text-n-800">
                    {t(`guide.assessments.vuln.${v}`)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ),
      },
      {
        title: t('guide.assessments.s6.title'),
        body: (
          <>
            <p>{t('guide.assessments.s6.intro')}</p>
            <ul className="space-y-1.5">
              {TEAR_ORDER.map((strategy) => (
                <li key={strategy}>
                  <span className="font-semibold text-n-800">
                    {t(`enum.tear.${strategy}`)}
                  </span>{' '}
                  —{' '}
                  <span className="text-n-600">
                    {t(`guide.assessments.tearBlurb.${strategy}`)}
                  </span>
                </li>
              ))}
            </ul>
            <p>{t('guide.assessments.s6.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.assessments.s7.title'),
        body: <p>{t('guide.assessments.s7.p1')}</p>,
      },
    ],
  };
}
