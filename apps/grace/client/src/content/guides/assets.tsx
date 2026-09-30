import type { Guide, GuideTFn } from './types';
import type { AssetRole } from '../../lib/csmp-types';

const ROLE_ORDER: AssetRole[] = ['PROTECTED', 'PROTECTIVE', 'DUAL'];

function RoleMatrix({ t }: { t: GuideTFn }) {
  return (
    <div className="border border-n-150 rounded-r2 overflow-hidden text-[12px]">
      <div className="grid grid-cols-[110px_1fr] bg-n-50 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.4px] text-n-500">
        <div>{t('guide.assets.roleMatrix.colRole')}</div>
        <div>{t('guide.assets.roleMatrix.colChanges')}</div>
      </div>
      {ROLE_ORDER.map((r) => (
        <div
          key={r}
          className="grid grid-cols-[110px_1fr] px-3 py-2 border-t border-n-100"
        >
          <div className="font-semibold text-n-800">
            {t(`guide.assets.roles.${r}.label`)}
          </div>
          <div className="text-n-600">
            <div>{t(`guide.assets.roles.${r}.description`)}</div>
            <div className="text-n-500 mt-1 text-[11.5px]">
              <em>{t('guide.assets.roleMatrix.inGraph')}</em>{' '}
              {t(`guide.assets.roles.${r}.graphHint`)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function buildAssetsGuide(t: GuideTFn): Guide {
  return {
    id: 'assets',
    title: t('guide.assets.title'),
    subtitle: t('guide.assets.subtitle'),
    steps: [
      {
        title: t('guide.assets.s1.title'),
        body: (
          <>
            <p>{t('guide.assets.s1.p1')}</p>
            <p>{t('guide.assets.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.assets.s2.title'),
        body: (
          <>
            <p>{t('guide.assets.s2.p1')}</p>
            <RoleMatrix t={t} />
            <p>{t('guide.assets.s2.p2')}</p>
            <p>{t('guide.assets.s2.p3')}</p>
          </>
        ),
      },
      {
        title: t('guide.assets.s3.title'),
        body: (
          <>
            <p>{t('guide.assets.s3.typeP')}</p>
            <p>{t('guide.assets.s3.categoryP')}</p>
            <p>{t('guide.assets.s3.criticalityP')}</p>
          </>
        ),
      },
      {
        title: t('guide.assets.s4.title'),
        body: (
          <>
            <p>{t('guide.assets.s4.templateP')}</p>
            <p>{t('guide.assets.s4.parentP')}</p>
          </>
        ),
      },
    ],
  };
}
