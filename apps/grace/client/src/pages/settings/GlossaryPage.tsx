import { useMemo } from 'react';
import { useT, useLocale, translate } from '../../i18n';
import type { Locale } from '../../i18n';

const TERM_KEYS = [
  'assessment',
  'asset',
  'cluster',
  'threat',
  'countermeasure',
  'actionPlan',
  'survey',
  'surveyScope',
  'templatePackage',
  'template',
  'irv',
  'tear',
  'alarp',
  'threeA',
  'pps',
  'shape',
  'complianceTag',
  'review',
  'snapshot',
  'incident',
  'site',
  'residualRisk',
  'leadAssessor',
  'stakeholder',
] as const;

export function GlossaryPage() {
  const t = useT();
  const locale = useLocale();
  const other: Locale = locale === 'en' ? 'fr' : 'en';

  const rows = useMemo(
    () =>
      TERM_KEYS.map((k) => ({
        key: k,
        en: translate('en', `term.${k}`),
        fr: translate('fr', `term.${k}`),
        note: translate(locale, `term.${k}Def`),
        otherNote: translate(other, `term.${k}Def`),
      })),
    [locale, other],
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-n-900">{t('page.glossary.title')}</h2>
        <p className="text-[12.5px] text-n-600 mt-1">{t('page.glossary.subtitle')}</p>
      </div>
      <div className="bg-white border border-n-150 rounded-r3 shadow-sh1 overflow-hidden">
        <table className="w-full">
          <thead className="bg-n-50 border-b border-n-150">
            <tr className="text-[10.5px] font-mono uppercase text-n-500 tracking-[0.4px]">
              <th className="text-left px-4 py-2">{t('page.glossary.colEn')}</th>
              <th className="text-left px-3 py-2">{t('page.glossary.colFr')}</th>
              <th className="text-left px-3 py-2">{t('page.glossary.colNote')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-n-100 align-top">
                <td className="px-4 py-2.5 text-[13px] font-medium text-n-900">{r.en}</td>
                <td className="px-3 py-2.5 text-[13px] text-n-800">{r.fr}</td>
                <td className="px-3 py-2.5 text-[12px] text-n-600">
                  <div>{r.note}</div>
                  <div className="mt-1 text-[11px] text-n-400 italic">{r.otherNote}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
