import type { ScopeItemSourceType } from './csmp-types';

export type ScopeSourceRef = {
  sourceType: ScopeItemSourceType | string;
  sourceAssetName?: string | null;
  sourceThreatAdversaryType?: string | null;
  sourceThreatActionType?: string | null;
  sourceThreatTargetName?: string | null;
  sourceCountermeasureName?: string | null;
  sourceCountermeasureTemplateName?: string | null;
  /** Legacy English label from API — used only if structured fields are absent. */
  sourceLabel?: string | null;
};

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Localize AAA / scope item group headers. Prefer structured fields from the
 * API; fall back to the legacy English `sourceLabel` only when needed.
 */
export function formatScopeSourceLabel(src: ScopeSourceRef, t: TFn): string {
  const kind = src.sourceType;
  switch (kind) {
    case 'ASSET':
      return src.sourceAssetName
        ? t('format.scopeSource.asset', { name: src.sourceAssetName })
        : t('format.scopeSource.assetDeleted');
    case 'THREAT': {
      if (!src.sourceThreatAdversaryType || !src.sourceThreatActionType) {
        return src.sourceLabel ?? t('format.scopeSource.threatDeleted');
      }
      const adversary = t(`enum.adversaryType.${src.sourceThreatAdversaryType}`);
      const action = t(`enum.actionType.${src.sourceThreatActionType}`);
      const target =
        src.sourceThreatTargetName ?? t('format.scopeSource.threatTargetFallback');
      return t('format.scopeSource.threat', { adversary, action, target });
    }
    case 'COUNTERMEASURE':
      return src.sourceCountermeasureName
        ? t('format.scopeSource.cm', { name: src.sourceCountermeasureName })
        : t('format.scopeSource.cmDeleted');
    case 'COUNTERMEASURE_GROUP':
      return src.sourceCountermeasureTemplateName
        ? t('format.scopeSource.cmGroup', { name: src.sourceCountermeasureTemplateName })
        : t('format.scopeSource.cmGroupDeleted');
    case 'MANUAL':
      return t('format.scopeSource.manual');
    default:
      return src.sourceLabel ?? t('format.scopeSource.manual');
  }
}
