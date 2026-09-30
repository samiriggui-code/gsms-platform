import type { Guide } from './types';
import type { GuideTFn } from './types';

export function buildWelcomeGuide(t: GuideTFn): Guide {
  return {
    id: 'welcome',
    title: t('guide.welcome.title'),
    subtitle: t('guide.welcome.subtitle'),
    steps: [
      {
        title: t('guide.welcome.s1.title'),
        body: (
          <>
            <p>{t('guide.welcome.s1.p1')}</p>
            <p>{t('guide.welcome.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.welcome.s2.title'),
        body: (
          <>
            <p className="font-medium text-n-800">{t('guide.welcome.s2.catalogHeading')}</p>
            <p>{t('guide.welcome.s2.catalogP')}</p>
            <p className="font-medium text-n-800 mt-2">{t('guide.welcome.s2.workHeading')}</p>
            <p>{t('guide.welcome.s2.workP')}</p>
            <p className="font-medium text-n-800 mt-2">{t('guide.welcome.s2.complianceHeading')}</p>
            <p>{t('guide.welcome.s2.complianceP')}</p>
          </>
        ),
      },
      {
        title: t('guide.welcome.s3.title'),
        body: (
          <>
            <p>{t('guide.welcome.s3.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.welcome.s3.adversary')}</li>
              <li>{t('guide.welcome.s3.action')}</li>
              <li>{t('guide.welcome.s3.asset')}</li>
            </ul>
            <p>{t('guide.welcome.s3.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.welcome.s4.title'),
        body: (
          <>
            <p>{t('guide.welcome.s4.intro')}</p>
            <p>
              <strong>{t('guide.welcome.s4.m1Title')}</strong> {t('guide.welcome.s4.m1Body')}
            </p>
            <p>
              <strong>{t('guide.welcome.s4.m2Title')}</strong> {t('guide.welcome.s4.m2Body')}
            </p>
            <p>{t('guide.welcome.s4.impactNote')}</p>
          </>
        ),
      },
      {
        title: t('guide.welcome.s5.title'),
        body: (
          <>
            <p>{t('guide.welcome.s5.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.welcome.s5.transfer')}</li>
              <li>{t('guide.welcome.s5.eliminate')}</li>
              <li>{t('guide.welcome.s5.accept')}</li>
              <li>{t('guide.welcome.s5.reduce')}</li>
            </ul>
            <p>{t('guide.welcome.s5.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.welcome.s6.title'),
        body: (
          <>
            <p>
              {t('guide.welcome.s6.p1Before')}{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-n-100 rounded-r1 text-[11px] font-mono">
                ?
              </span>{' '}
              {t('guide.welcome.s6.p1After')}
            </p>
            <p>{t('guide.welcome.s6.p2')}</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>{t('guide.welcome.s6.step1')}</li>
              <li>{t('guide.welcome.s6.step2')}</li>
              <li>{t('guide.welcome.s6.step3')}</li>
              <li>{t('guide.welcome.s6.step4')}</li>
            </ol>
          </>
        ),
      },
    ],
  };
}
