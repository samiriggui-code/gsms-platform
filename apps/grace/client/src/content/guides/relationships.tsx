import type { Guide, GuideTFn } from './types';
import type { AssetRole } from '../../lib/csmp-types';

const ROLE_ORDER: AssetRole[] = ['PROTECTED', 'PROTECTIVE', 'DUAL'];

function PortDiagram({ t }: { t: GuideTFn }) {
  const dot = (cx: number, cy: number, color: string, dim = false) => (
    <circle cx={cx} cy={cy} r={5} fill={color} opacity={dim ? 0.35 : 1} />
  );
  return (
    <div className="flex justify-center my-2">
      <svg viewBox="0 0 220 130" className="w-[260px] h-[150px]" aria-hidden>
        <rect
          x="40" y="30" width="140" height="70"
          rx="6" fill="#fff" stroke="#9ca3af" strokeWidth="1.5"
        />
        <text x="110" y="62" textAnchor="middle" className="fill-n-800"
              fontSize="11" fontFamily="ui-sans-serif, system-ui">
          {t('guide.relationships.portDiagram.nodeLabel')}
        </text>
        <text x="110" y="80" textAnchor="middle" className="fill-n-500"
              fontSize="9" fontFamily="ui-sans-serif, system-ui">
          {t('guide.relationships.portDiagram.nodeSub')}
        </text>
        {dot(80, 30, '#6366f1')}
        {dot(140, 30, '#6366f1')}
        {dot(80, 100, '#f97316')}
        {dot(140, 100, '#f97316')}
        <text x="40" y="22" fontSize="9" className="fill-n-500"
              fontFamily="ui-sans-serif, system-ui">
          {t('guide.relationships.portDiagram.spatialLabel')}
        </text>
        <text x="40" y="120" fontSize="9" className="fill-n-500"
              fontFamily="ui-sans-serif, system-ui">
          {t('guide.relationships.portDiagram.logicalLabel')}
        </text>
      </svg>
    </div>
  );
}

export function buildRelationshipsGuide(t: GuideTFn): Guide {
  return {
    id: 'relationships',
    title: t('guide.relationships.title'),
    subtitle: t('guide.relationships.subtitle'),
    steps: [
      {
        title: t('guide.relationships.s1.title'),
        body: (
          <>
            <p>{t('guide.relationships.s1.p1')}</p>
            <p>{t('guide.relationships.s1.p2')}</p>
          </>
        ),
      },
      {
        title: t('guide.relationships.s2.title'),
        body: (
          <>
            <p>{t('guide.relationships.s2.intro')}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.relationships.s2.topology')}</li>
              <li>{t('guide.relationships.s2.coverage')}</li>
              <li>{t('guide.relationships.s2.both')}</li>
            </ul>
            <p>{t('guide.relationships.s2.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.relationships.s3.title'),
        body: (
          <>
            <p>{t('guide.relationships.s3.intro')}</p>
            <PortDiagram t={t} />
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('guide.relationships.s3.topPorts')}</li>
              <li>{t('guide.relationships.s3.bottomPorts')}</li>
            </ul>
            <p>{t('guide.relationships.s3.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.relationships.s4.title'),
        body: (
          <>
            <p>{t('guide.relationships.s4.intro')}</p>
            <ul className="space-y-2">
              {ROLE_ORDER.map((r) => (
                <li key={r}>
                  <span className="font-semibold text-n-800">
                    {t(`guide.assets.roles.${r}.label`)}
                  </span>{' '}
                  —{' '}
                  <span className="text-n-600">
                    {t(`guide.assets.roles.${r}.description`)}
                  </span>
                </li>
              ))}
            </ul>
            <p>{t('guide.relationships.s4.outro')}</p>
          </>
        ),
      },
      {
        title: t('guide.relationships.s5.title'),
        body: <p>{t('guide.relationships.s5.p1')}</p>,
      },
    ],
  };
}
